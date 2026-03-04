import json
from json import JSONDecodeError
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from sqlalchemy.orm import Session

from src.infrastructure.database.models import EncomendaModel, MoradorModel
from src.infrastructure.repositories.condominio_repository import CondominioRepository
from src.infrastructure.repositories.webhook_n8n_repository import WebhookN8nRepository


def _coerce_success(value: object) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value == 1
    if isinstance(value, str):
        normalized = value.strip().lower()
        return normalized in {"true", "1", "ok", "success"}
    return False


def _extract_success(payload: object) -> bool:
    if isinstance(payload, dict):
        if "success" in payload:
            return _coerce_success(payload.get("success"))

        for key in ("data", "result", "payload", "response"):
            if key in payload and _extract_success(payload.get(key)):
                return True
        return False

    if isinstance(payload, list):
        for item in payload:
            if _extract_success(item):
                return True
        return False

    if isinstance(payload, str):
        normalized = payload.strip()
        if not normalized:
            return False
        try:
            decoded = json.loads(normalized)
            return _extract_success(decoded)
        except JSONDecodeError:
            return _coerce_success(normalized)

    return False


def _call_whatsapp_notify(url: str, payload: dict) -> tuple[bool, str | None]:
    data = json.dumps(payload).encode("utf-8")
    request = Request(url, data=data, method="POST", headers={"Content-Type": "application/json"})
    try:
        with urlopen(request, timeout=20) as response:  # noqa: S310
            body = response.read().decode("utf-8")
            if not body.strip():
                return False, "webhook_notify_empty_response"
            try:
                decoded = json.loads(body)
            except JSONDecodeError:
                return False, "webhook_notify_invalid_json_response"
            if _extract_success(decoded):
                return True, None
            return False, "webhook_notify_success_false"
    except HTTPError as err:
        return False, f"webhook_notify_http_{err.code}"
    except URLError:
        return False, "webhook_notify_unavailable"


def notify_encomenda_whatsapp(db: Session, encomenda: EncomendaModel, morador: MoradorModel) -> tuple[bool, str | None]:
    webhook_repo = WebhookN8nRepository(db)
    webhook = webhook_repo.find_by_tipo("whatsapp_notify")
    if webhook is None or not webhook.ativo:
        return False, "webhook_notify_nao_configurado"

    condominio_nome = ""
    condominio = CondominioRepository(db).find_by_id(encomenda.condominio_id)
    if condominio is not None and condominio.nome:
        condominio_nome = condominio.nome

    payload = {
        "telefone_morador": morador.telefone,
        "nome_morador": morador.nome,
        "codigo_rastreio": encomenda.codigo_externo or "",
        "tipo_encomenda": encomenda.tipo,
        "status_encomenda": encomenda.status,
        "data_recebimento": str(encomenda.data_recebimento),
        "empresa_responsavel": encomenda.empresa_entregadora or "",
        "nome_condominio": condominio_nome,
        "encomenda_id": encomenda.id,
        "condominio_id": encomenda.condominio_id,
        "scope": "condominio",
    }
    return _call_whatsapp_notify(webhook.url, payload)

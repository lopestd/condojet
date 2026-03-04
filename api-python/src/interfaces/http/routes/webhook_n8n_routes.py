import json
from datetime import datetime, timezone
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.application.dtos.webhook_n8n_dto import WEBHOOK_TYPES, UpsertWebhookN8nDTO, WebhookN8nTestDTO
from src.application.services.exceptions import AppError
from src.infrastructure.database.session import get_db
from src.infrastructure.repositories.webhook_n8n_repository import WebhookN8nRepository
from src.interfaces.http.dependencies.auth import Principal, require_roles

router = APIRouter(tags=["webhooks_n8n"])


ALLOWED_WEBHOOK_TYPES = set(WEBHOOK_TYPES)


def _ensure_tipo(tipo: str) -> str:
    normalized = tipo.strip().lower()
    if normalized not in ALLOWED_WEBHOOK_TYPES:
        raise AppError("tipo_webhook_invalido", status_code=422, code="tipo_webhook_invalido")
    return normalized


def _to_out(model) -> dict:
    return {
        "tipo": model.tipo,
        "url": model.url,
        "ativo": bool(model.ativo),
        "updated_by_usuario_id": model.updated_by_usuario_id,
        "updated_at": (model.updated_at or datetime.now(timezone.utc)).isoformat(),
    }


def _call_webhook(tipo: str, url: str) -> tuple[bool, int | None, str]:
    try:
        if tipo == "whatsapp_query":
            query = urlencode({"scope": "global", "healthcheck": "true"})
            separator = "&" if "?" in url else "?"
            final_url = f"{url}{separator}{query}"
            request = Request(final_url, method="GET")
            with urlopen(request, timeout=10) as response:  # noqa: S310
                status_code = int(response.status)
                if 200 <= status_code < 400:
                    return True, status_code, "ok"
                return False, status_code, "status_invalido"

        payload = json.dumps(
            {
                "mode": "test",
                "scope": "global",
                "instanceName": "condojet-global-test",
                "phone": "00000000000",
            }
        ).encode("utf-8")
        request = Request(url, data=payload, method="POST", headers={"Content-Type": "application/json"})
        with urlopen(request, timeout=10) as response:  # noqa: S310
            status_code = int(response.status)
            if 200 <= status_code < 400:
                return True, status_code, "ok"
            return False, status_code, "status_invalido"
    except HTTPError as err:
        return False, err.code, "http_error"
    except URLError:
        return False, 0, "network_error"


@router.get("/webhooks-n8n")
def list_webhooks_n8n(
    contexto: str = "whatsapp",
    _principal: Principal = Depends(require_roles("ADMIN_GLOBAL")),
    db: Session = Depends(get_db),
) -> dict:
    if contexto != "whatsapp":
        raise AppError("contexto_invalido", status_code=422, code="contexto_invalido")

    repository = WebhookN8nRepository(db)
    models = repository.list_all()
    return {
        "contexto": contexto,
        "items": [_to_out(model) for model in models],
    }


@router.get("/webhooks-n8n/{tipo}")
def get_webhook_n8n(
    tipo: str,
    _principal: Principal = Depends(require_roles("ADMIN_GLOBAL")),
    db: Session = Depends(get_db),
) -> dict:
    tipo_normalizado = _ensure_tipo(tipo)
    repository = WebhookN8nRepository(db)
    model = repository.find_by_tipo(tipo_normalizado)
    if model is None:
        raise AppError("webhook_nao_encontrado", status_code=404, code="webhook_nao_encontrado")
    return _to_out(model)


@router.put("/webhooks-n8n/{tipo}")
def upsert_webhook_n8n(
    tipo: str,
    payload: UpsertWebhookN8nDTO,
    principal: Principal = Depends(require_roles("ADMIN_GLOBAL")),
    db: Session = Depends(get_db),
) -> dict:
    tipo_normalizado = _ensure_tipo(tipo)
    repository = WebhookN8nRepository(db)
    model = repository.upsert(
        tipo=tipo_normalizado,
        url=payload.url,
        ativo=payload.ativo,
        updated_by_usuario_id=principal.user_id,
    )
    return _to_out(model)


@router.post("/webhooks-n8n/{tipo}/testar")
def test_webhook_n8n(
    tipo: str,
    payload: WebhookN8nTestDTO,
    _principal: Principal = Depends(require_roles("ADMIN_GLOBAL")),
    db: Session = Depends(get_db),
) -> dict:
    tipo_normalizado = _ensure_tipo(tipo)
    repository = WebhookN8nRepository(db)
    model = repository.find_by_tipo(tipo_normalizado)
    target_url = payload.url or (model.url if model is not None else None)
    if not target_url:
        raise AppError("webhook_nao_encontrado", status_code=404, code="webhook_nao_encontrado")

    ok, status_code, detail = _call_webhook(tipo_normalizado, target_url)
    return {
        "tipo": tipo_normalizado,
        "ok": ok,
        "status_code": status_code,
        "detail": detail,
    }

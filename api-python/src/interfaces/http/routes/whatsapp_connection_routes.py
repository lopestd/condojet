import json
import re
import unicodedata
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urlparse, urlunparse
from urllib.request import Request, urlopen

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from src.application.services.exceptions import AppError
from src.infrastructure.database.session import get_db
from src.infrastructure.repositories.condominio_repository import CondominioRepository
from src.infrastructure.repositories.webhook_n8n_repository import WebhookN8nRepository
from src.interfaces.http.dependencies.auth import Principal, require_roles

router = APIRouter(tags=["whatsapp_conexoes"])


class CreateWhatsappConnectionDTO(BaseModel):
    instanceName: str = Field(min_length=3, max_length=120)
    phone: str = Field(min_length=10, max_length=20)

    @field_validator("instanceName")
    @classmethod
    def validate_instance_name(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("nome_instancia_invalido")
        return normalized

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value: str) -> str:
        digits = "".join(ch for ch in value if ch.isdigit())
        if len(digits) not in {10, 11}:
            raise ValueError("telefone_invalido")
        return digits


class RenewWhatsappQrDTO(BaseModel):
    phone: str = Field(min_length=10, max_length=20)

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value: str) -> str:
        digits = "".join(ch for ch in value if ch.isdigit())
        if len(digits) not in {10, 11}:
            raise ValueError("telefone_invalido")
        return digits


def _slugify(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    normalized = normalized.lower()
    normalized = re.sub(r"[^a-z0-9]+", "-", normalized).strip("-")
    return normalized or "condominio"


def _fallback_webhook_url(url: str) -> str | None:
    parsed = urlparse(url)
    if "/webhook/" not in parsed.path:
        return None
    fallback_path = parsed.path.replace("/webhook/", "/webhook-test/")
    return urlunparse(parsed._replace(path=fallback_path))


def _call_webhook_query(url: str, condominio_id: int, condominio_slug: str, instancia: str | None = None) -> object:
    targets = [url]
    fallback_url = _fallback_webhook_url(url)
    if fallback_url and fallback_url != url:
        targets.append(fallback_url)

    params = {
        "condominio_id": condominio_id,
        "condominio_slug": condominio_slug,
    }
    if instancia:
        params["instancia"] = instancia

    for target in targets:
        query = urlencode(params)
        separator = "&" if "?" in target else "?"
        final_url = f"{target}{separator}{query}"
        try:
            request = Request(final_url, method="GET")
            with urlopen(request, timeout=15) as response:  # noqa: S310
                payload = response.read().decode("utf-8")
                if not payload.strip():
                    return []
                return json.loads(payload)
        except HTTPError as err:
            raise AppError("webhook_query_http_error", status_code=502, code=f"webhook_query_http_{err.code}") from err
        except URLError:
            continue

    raise AppError("webhook_query_unavailable", status_code=503, code="webhook_query_unavailable")


def _call_webhook_create(url: str, payload: dict) -> object:
    targets = [url]
    fallback_url = _fallback_webhook_url(url)
    if fallback_url and fallback_url != url:
        targets.append(fallback_url)

    data = json.dumps(payload).encode("utf-8")
    for target in targets:
        try:
            request = Request(target, data=data, method="POST", headers={"Content-Type": "application/json"})
            with urlopen(request, timeout=15) as response:  # noqa: S310
                response_payload = response.read().decode("utf-8")
                if not response_payload.strip():
                    return {"ok": True}
                return json.loads(response_payload)
        except HTTPError as err:
            raise AppError("webhook_create_http_error", status_code=502, code=f"webhook_create_http_{err.code}") from err
        except URLError:
            continue

    raise AppError("webhook_create_unavailable", status_code=503, code="webhook_create_unavailable")


def _extract_items(payload: object) -> list[dict]:
    if isinstance(payload, list):
        raw_items = payload
    elif isinstance(payload, dict):
        if isinstance(payload.get("data"), list):
            raw_items = payload["data"]
        elif isinstance(payload.get("items"), list):
            raw_items = payload["items"]
        else:
            raw_items = [payload]
    else:
        raw_items = []

    items: list[dict] = []
    for item in raw_items:
        if not isinstance(item, dict):
            continue
        name = str(item.get("instancia_whatsapp") or item.get("instanceName") or item.get("name") or "").strip()
        if not name:
            continue
        status = str(item.get("instancia_status") or item.get("status") or "").strip()
        phone = str(item.get("clientecontrato_telefone") or item.get("phone") or "").strip()
        qr = str(item.get("qrcode_conexao") or item.get("qr") or "").strip()
        items.append(
            {
                "id": item.get("id"),
                "name": name,
                "status": status,
                "phone": phone,
                "qr": qr,
                "raw": item,
            }
        )
    return items


def _resolve_webhooks(principal: Principal, db: Session) -> tuple[str, str, str, str]:
    if principal.condominio_id is None:
        raise AppError("forbidden", status_code=403, code="forbidden")

    condominio = CondominioRepository(db).find_by_id(principal.condominio_id)
    if condominio is None:
        raise AppError("condominio_nao_encontrado", status_code=404, code="condominio_nao_encontrado")

    webhook_repo = WebhookN8nRepository(db)
    webhook_create = webhook_repo.find_by_tipo(principal.condominio_id, "whatsapp_create")
    webhook_query = webhook_repo.find_by_tipo(principal.condominio_id, "whatsapp_query")

    if webhook_create is None or not webhook_create.ativo:
        raise AppError("webhook_create_nao_configurado", status_code=409, code="webhook_create_nao_configurado")
    if webhook_query is None or not webhook_query.ativo:
        raise AppError("webhook_query_nao_configurado", status_code=409, code="webhook_query_nao_configurado")

    return condominio.nome, _slugify(condominio.nome), webhook_create.url, webhook_query.url


@router.get("/whatsapp/conexoes")
def list_whatsapp_connections(
    instancia: str | None = None,
    principal: Principal = Depends(require_roles("ADMIN", "PORTEIRO")),
    db: Session = Depends(get_db),
) -> dict:
    condominio_nome, condominio_slug, _, webhook_query_url = _resolve_webhooks(principal, db)
    payload = _call_webhook_query(webhook_query_url, principal.condominio_id or 0, condominio_slug, instancia)
    items = _extract_items(payload)
    items.sort(key=lambda item: item["name"].lower())
    return {
        "items": items,
        "condominio": {
            "id": principal.condominio_id,
            "nome": condominio_nome,
            "slug": condominio_slug,
        },
    }


@router.post("/whatsapp/conexoes")
def create_whatsapp_connection(
    body: CreateWhatsappConnectionDTO,
    principal: Principal = Depends(require_roles("ADMIN")),
    db: Session = Depends(get_db),
) -> dict:
    condominio_nome, condominio_slug, webhook_create_url, _ = _resolve_webhooks(principal, db)
    payload = {
        "instanceName": body.instanceName,
        "phone": body.phone,
        "condominio_id": principal.condominio_id,
        "condominio_slug": condominio_slug,
        "condominio_nome": condominio_nome,
    }
    data = _call_webhook_create(webhook_create_url, payload)
    return {"ok": True, "instanceName": body.instanceName, "result": data}


@router.post("/whatsapp/conexoes/{nome}/renovar-qr")
def renew_whatsapp_qr(
    nome: str,
    body: RenewWhatsappQrDTO,
    principal: Principal = Depends(require_roles("ADMIN")),
    db: Session = Depends(get_db),
) -> dict:
    instance_name = nome.strip()
    if not instance_name:
        raise AppError("nome_instancia_invalido", status_code=422, code="nome_instancia_invalido")

    condominio_nome, condominio_slug, webhook_create_url, _ = _resolve_webhooks(principal, db)
    payload = {
        "instanceName": instance_name,
        "phone": body.phone,
        "condominio_id": principal.condominio_id,
        "condominio_slug": condominio_slug,
        "condominio_nome": condominio_nome,
    }
    data = _call_webhook_create(webhook_create_url, payload)
    return {"ok": True, "instanceName": instance_name, "result": data}

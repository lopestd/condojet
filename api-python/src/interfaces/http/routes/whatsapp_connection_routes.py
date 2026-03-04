import json
from json import JSONDecodeError
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from src.application.services.exceptions import AppError
from src.infrastructure.database.session import get_db
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


def _call_webhook_query(url: str, instancia: str | None = None) -> object:
    params = {"scope": "global"}
    if instancia:
        params["instancia"] = instancia

    query = urlencode(params)
    separator = "&" if "?" in url else "?"
    final_url = f"{url}{separator}{query}"
    try:
        request = Request(final_url, method="GET")
        with urlopen(request, timeout=15) as response:  # noqa: S310
            payload = response.read().decode("utf-8")
            if not payload.strip():
                return []
            try:
                return json.loads(payload)
            except JSONDecodeError as err:
                raise AppError(
                    "webhook_query_invalid_response", status_code=502, code="webhook_query_invalid_response"
                ) from err
    except HTTPError as err:
        raise AppError("webhook_query_http_error", status_code=502, code=f"webhook_query_http_{err.code}") from err
    except URLError as err:
        raise AppError("webhook_query_unavailable", status_code=503, code="webhook_query_unavailable") from err


def _call_webhook_create(url: str, payload: dict) -> object:
    data = json.dumps(payload).encode("utf-8")
    try:
        request = Request(url, data=data, method="POST", headers={"Content-Type": "application/json"})
        with urlopen(request, timeout=15) as response:  # noqa: S310
            response_payload = response.read().decode("utf-8")
            if not response_payload.strip():
                return {"ok": True}
            try:
                return json.loads(response_payload)
            except JSONDecodeError:
                # Some n8n flows answer as plain text; treat 2xx + non-JSON as success payload.
                return {"ok": True, "raw_response": response_payload}
    except HTTPError as err:
        raise AppError("webhook_create_http_error", status_code=502, code=f"webhook_create_http_{err.code}") from err
    except URLError as err:
        raise AppError("webhook_create_unavailable", status_code=503, code="webhook_create_unavailable") from err


def _extract_items(payload: object) -> list[dict]:
    def _unwrap_items(value: object) -> list[dict]:
        if isinstance(value, list):
            return [item for item in value if isinstance(item, dict)]
        if isinstance(value, dict):
            candidate_list_keys = (
                "data",
                "items",
                "result",
                "results",
                "instances",
                "connections",
                "conexoes",
                "payload",
            )
            for key in candidate_list_keys:
                nested = value.get(key)
                if isinstance(nested, list):
                    return [item for item in nested if isinstance(item, dict)]
                if isinstance(nested, dict):
                    nested_items = _unwrap_items(nested)
                    if nested_items:
                        return nested_items
            if len(value) == 1:
                only_value = next(iter(value.values()))
                nested_items = _unwrap_items(only_value)
                if nested_items:
                    return nested_items
            return [value]
        if isinstance(value, str):
            text = value.strip()
            if not text:
                return []
            try:
                decoded = json.loads(text)
            except JSONDecodeError:
                return []
            return _unwrap_items(decoded)
        return []

    raw_items = _unwrap_items(payload)

    items: list[dict] = []
    for item in raw_items:
        source = item
        if not any(k in source for k in ("instancia_whatsapp", "instanceName", "name", "instance", "instancia")):
            if isinstance(item.get("data"), dict):
                source = item["data"]
            elif isinstance(item.get("instance"), dict):
                source = item["instance"]

        name = str(
            source.get("instancia_whatsapp")
            or source.get("instanceName")
            or source.get("name")
            or source.get("instance")
            or source.get("instancia")
            or source.get("instance_name")
            or source.get("nome_instancia")
            or source.get("nome")
            or ""
        ).strip()
        if not name:
            continue
        status = str(
            source.get("instancia_status")
            or source.get("status")
            or source.get("state")
            or source.get("connectionStatus")
            or source.get("connection_status")
            or ""
        ).strip()
        phone = str(
            source.get("clientecontrato_telefone")
            or source.get("phone")
            or source.get("telefone")
            or source.get("phoneNumber")
            or source.get("numero")
            or ""
        ).strip()
        qr = str(
            source.get("qrcode_conexao")
            or source.get("qr")
            or source.get("qrCode")
            or source.get("qrcode")
            or source.get("qr_code")
            or source.get("qrcode_base64")
            or ""
        ).strip()
        items.append(
            {
                "id": source.get("id") if isinstance(source, dict) else item.get("id"),
                "name": name,
                "status": status,
                "phone": phone,
                "qr": qr,
                "raw": item,
            }
        )
    return items


def _resolve_create_webhook(db: Session) -> str:
    webhook_repo = WebhookN8nRepository(db)
    webhook_create = webhook_repo.find_by_tipo("whatsapp_create")
    if webhook_create is None or not webhook_create.ativo:
        raise AppError("webhook_create_nao_configurado", status_code=409, code="webhook_create_nao_configurado")
    return webhook_create.url


def _resolve_query_webhook(db: Session) -> str:
    webhook_repo = WebhookN8nRepository(db)
    webhook_query = webhook_repo.find_by_tipo("whatsapp_query")
    if webhook_query is None or not webhook_query.ativo:
        raise AppError("webhook_query_nao_configurado", status_code=409, code="webhook_query_nao_configurado")
    return webhook_query.url


@router.get("/whatsapp/conexoes")
def list_whatsapp_connections(
    instancia: str | None = None,
    _principal: Principal = Depends(require_roles("ADMIN_GLOBAL")),
    db: Session = Depends(get_db),
) -> dict:
    webhook_query_url = _resolve_query_webhook(db)
    payload = _call_webhook_query(webhook_query_url, instancia)
    items = _extract_items(payload)
    items.sort(key=lambda item: item["name"].lower())
    return {
        "items": items,
        "escopo": "global",
    }


@router.post("/whatsapp/conexoes")
def create_whatsapp_connection(
    body: CreateWhatsappConnectionDTO,
    _principal: Principal = Depends(require_roles("ADMIN_GLOBAL")),
    db: Session = Depends(get_db),
) -> dict:
    webhook_create_url = _resolve_create_webhook(db)
    payload = {
        "instanceName": body.instanceName,
        "phone": body.phone,
        "scope": "global",
        "tenant": "global",
    }
    data = _call_webhook_create(webhook_create_url, payload)
    return {"ok": True, "instanceName": body.instanceName, "result": data}


@router.post("/whatsapp/conexoes/{nome}/renovar-qr")
def renew_whatsapp_qr(
    nome: str,
    body: RenewWhatsappQrDTO,
    _principal: Principal = Depends(require_roles("ADMIN_GLOBAL")),
    db: Session = Depends(get_db),
) -> dict:
    instance_name = nome.strip()
    if not instance_name:
        raise AppError("nome_instancia_invalido", status_code=422, code="nome_instancia_invalido")

    webhook_create_url = _resolve_create_webhook(db)
    payload = {
        "instanceName": instance_name,
        "phone": body.phone,
        "scope": "global",
        "tenant": "global",
    }
    data = _call_webhook_create(webhook_create_url, payload)
    return {"ok": True, "instanceName": instance_name, "result": data}

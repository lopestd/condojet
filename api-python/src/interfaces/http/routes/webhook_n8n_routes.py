import json
from datetime import datetime, timezone
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urlparse, urlunparse
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


def _fallback_webhook_url(url: str) -> str | None:
    parsed = urlparse(url)
    if "/webhook/" not in parsed.path:
        return None
    fallback_path = parsed.path.replace("/webhook/", "/webhook-test/")
    return urlunparse(parsed._replace(path=fallback_path))


def _call_webhook(tipo: str, url: str, condominio_id: int) -> tuple[bool, int | None, str]:
    targets = [url]
    fallback_url = _fallback_webhook_url(url)
    if fallback_url and fallback_url != url:
        targets.append(fallback_url)

    for target in targets:
        try:
            if tipo == "whatsapp_query":
                query = urlencode({"condominio_id": condominio_id, "healthcheck": "true"})
                separator = "&" if "?" in target else "?"
                final_url = f"{target}{separator}{query}"
                request = Request(final_url, method="GET")
                with urlopen(request, timeout=10) as response:  # noqa: S310
                    status_code = int(response.status)
                    if 200 <= status_code < 400:
                        return True, status_code, "ok"
                    return False, status_code, "status_invalido"

            payload = json.dumps(
                {
                    "mode": "test",
                    "condominio_id": condominio_id,
                    "instanceName": f"condominio-{condominio_id}-test",
                    "phone": "00000000000",
                }
            ).encode("utf-8")
            request = Request(target, data=payload, method="POST", headers={"Content-Type": "application/json"})
            with urlopen(request, timeout=10) as response:  # noqa: S310
                status_code = int(response.status)
                if 200 <= status_code < 400:
                    return True, status_code, "ok"
                return False, status_code, "status_invalido"
        except HTTPError as err:
            return False, err.code, "http_error"
        except URLError:
            continue

    return False, 0, "network_error"


@router.get("/webhooks-n8n")
def list_webhooks_n8n(
    contexto: str = "whatsapp",
    principal: Principal = Depends(require_roles("ADMIN", "PORTEIRO")),
    db: Session = Depends(get_db),
) -> dict:
    if principal.condominio_id is None:
        raise AppError("forbidden", status_code=403, code="forbidden")

    if contexto != "whatsapp":
        raise AppError("contexto_invalido", status_code=422, code="contexto_invalido")

    repository = WebhookN8nRepository(db)
    models = repository.list_by_condominio_id(principal.condominio_id)
    return {
        "contexto": contexto,
        "items": [_to_out(model) for model in models],
    }


@router.get("/webhooks-n8n/{tipo}")
def get_webhook_n8n(
    tipo: str,
    principal: Principal = Depends(require_roles("ADMIN", "PORTEIRO")),
    db: Session = Depends(get_db),
) -> dict:
    if principal.condominio_id is None:
        raise AppError("forbidden", status_code=403, code="forbidden")

    tipo_normalizado = _ensure_tipo(tipo)
    repository = WebhookN8nRepository(db)
    model = repository.find_by_tipo(principal.condominio_id, tipo_normalizado)
    if model is None:
        raise AppError("webhook_nao_encontrado", status_code=404, code="webhook_nao_encontrado")
    return _to_out(model)


@router.put("/webhooks-n8n/{tipo}")
def upsert_webhook_n8n(
    tipo: str,
    payload: UpsertWebhookN8nDTO,
    principal: Principal = Depends(require_roles("ADMIN")),
    db: Session = Depends(get_db),
) -> dict:
    if principal.condominio_id is None:
        raise AppError("forbidden", status_code=403, code="forbidden")

    tipo_normalizado = _ensure_tipo(tipo)
    repository = WebhookN8nRepository(db)
    model = repository.upsert(
        condominio_id=principal.condominio_id,
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
    principal: Principal = Depends(require_roles("ADMIN")),
    db: Session = Depends(get_db),
) -> dict:
    if principal.condominio_id is None:
        raise AppError("forbidden", status_code=403, code="forbidden")

    tipo_normalizado = _ensure_tipo(tipo)
    repository = WebhookN8nRepository(db)
    model = repository.find_by_tipo(principal.condominio_id, tipo_normalizado)
    target_url = payload.url or (model.url if model is not None else None)
    if not target_url:
        raise AppError("webhook_nao_encontrado", status_code=404, code="webhook_nao_encontrado")

    ok, status_code, detail = _call_webhook(tipo_normalizado, target_url, principal.condominio_id)
    return {
        "tipo": tipo_normalizado,
        "ok": ok,
        "status_code": status_code,
        "detail": detail,
    }

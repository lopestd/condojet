import pytest
from pydantic import ValidationError

from src.application.dtos.webhook_n8n_dto import UpsertWebhookN8nDTO, WebhookN8nTestDTO


def test_upsert_webhook_accepts_valid_http_url() -> None:
    dto = UpsertWebhookN8nDTO(url='https://n8n.local/webhook/whatsapp', ativo=True)
    assert dto.url == 'https://n8n.local/webhook/whatsapp'
    assert dto.ativo is True


def test_upsert_webhook_rejects_invalid_url() -> None:
    with pytest.raises(ValidationError):
        UpsertWebhookN8nDTO(url='ftp://n8n.local/webhook/whatsapp', ativo=True)


def test_test_webhook_payload_accepts_empty_url() -> None:
    dto = WebhookN8nTestDTO()
    assert dto.url is None

from urllib.parse import urlparse

from pydantic import BaseModel, Field, field_validator

WEBHOOK_TYPES = ("whatsapp_create", "whatsapp_query")


class UpsertWebhookN8nDTO(BaseModel):
    url: str = Field(min_length=8, max_length=2048)
    ativo: bool = True

    @field_validator("url")
    @classmethod
    def validate_url(cls, value: str) -> str:
        normalized = value.strip()
        parsed = urlparse(normalized)
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            raise ValueError("url_invalida")
        return normalized


class WebhookN8nTestDTO(BaseModel):
    url: str | None = Field(default=None, min_length=8, max_length=2048)

    @field_validator("url")
    @classmethod
    def validate_optional_url(cls, value: str | None) -> str | None:
        if value is None:
            return value
        normalized = value.strip()
        parsed = urlparse(normalized)
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            raise ValueError("url_invalida")
        return normalized


class WebhookN8nOutDTO(BaseModel):
    tipo: str
    url: str
    ativo: bool
    updated_by_usuario_id: int | None
    updated_at: str


class WebhookN8nContextOutDTO(BaseModel):
    contexto: str
    items: list[WebhookN8nOutDTO]

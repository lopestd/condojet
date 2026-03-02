from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import BaseModel, Field, field_validator, model_validator


class UpdateConfiguracaoDTO(BaseModel):
    timezone: str | None = Field(default=None, min_length=3, max_length=64)
    prazo_dias_encomenda_esquecida: int | None = Field(default=None, ge=1, le=365)

    @field_validator("timezone")
    @classmethod
    def validate_timezone(cls, value: str | None) -> str | None:
        if value is None:
            return value
        normalized = value.strip()
        try:
            ZoneInfo(normalized)
        except ZoneInfoNotFoundError as exc:
            raise ValueError("timezone_invalida") from exc
        return normalized

    @model_validator(mode="after")
    def validate_at_least_one_field(self) -> "UpdateConfiguracaoDTO":
        if self.timezone is None and self.prazo_dias_encomenda_esquecida is None:
            raise ValueError("payload_vazio")
        return self

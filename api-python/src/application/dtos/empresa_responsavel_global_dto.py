from pydantic import BaseModel, Field, field_validator, model_validator


class CreateEmpresaResponsavelGlobalDTO(BaseModel):
    nome: str = Field(..., min_length=1, max_length=120)

    @field_validator("nome")
    @classmethod
    def validate_nome(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("field_required")
        return normalized


class UpdateEmpresaResponsavelGlobalDTO(BaseModel):
    nome: str | None = Field(default=None, min_length=1, max_length=120)
    ativo: bool | None = None

    @field_validator("nome")
    @classmethod
    def validate_nome(cls, value: str | None) -> str | None:
        if value is None:
            return value
        normalized = value.strip()
        if not normalized:
            raise ValueError("field_required")
        return normalized

    @model_validator(mode="after")
    def validate_any_field(self) -> "UpdateEmpresaResponsavelGlobalDTO":
        if self.nome is None and self.ativo is None:
            raise ValueError("payload_vazio")
        return self

from pydantic import BaseModel, Field, field_validator


class CreateEncomendaDTO(BaseModel):
    tipo: str
    morador_id: int
    endereco_id: int
    codigo_externo: str = Field(..., min_length=1)
    descricao: str | None = None
    empresa_entregadora: str = Field(..., min_length=1)

    @field_validator("codigo_externo", "empresa_entregadora")
    @classmethod
    def validate_required_text(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("field_required")
        return normalized


class EntregarEncomendaDTO(BaseModel):
    retirado_por_nome: str


class ReabrirEncomendaDTO(BaseModel):
    motivo_reabertura: str


class UpdateEncomendaDTO(BaseModel):
    tipo: str | None = None
    morador_id: int | None = None
    endereco_id: int | None = None
    codigo_externo: str | None = None
    descricao: str | None = None
    empresa_entregadora: str | None = None

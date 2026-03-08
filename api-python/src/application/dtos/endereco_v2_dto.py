from pydantic import BaseModel, model_validator


class CreateEnderecoV2DTO(BaseModel):
    bloco: str | None = None
    andar: str | None = None
    apartamento: str | None = None
    tipo_logradouro_horizontal_id: int | None = None
    subtipo_logradouro_horizontal_id: int | None = None
    numero: str | None = None

    @model_validator(mode="after")
    def validate_at_least_one_pattern(self) -> "CreateEnderecoV2DTO":
        predio = bool(self.bloco and self.andar and self.apartamento)
        horizontal = bool(self.tipo_logradouro_horizontal_id and self.subtipo_logradouro_horizontal_id and self.numero)
        if not predio and not horizontal:
            raise ValueError("endereco_v2_incompleto")
        return self

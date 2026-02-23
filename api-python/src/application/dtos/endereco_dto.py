from pydantic import BaseModel, model_validator


class CreateEnderecoDTO(BaseModel):
    tipo_endereco: str
    quadra: str
    conjunto: str | None = None
    lote: str | None = None
    setor_chacara: str | None = None
    numero_chacara: str | None = None

    @model_validator(mode="after")
    def validate_by_type(self) -> "CreateEnderecoDTO":
        if self.tipo_endereco == "QUADRA_CONJUNTO_LOTE":
            if not self.conjunto or not self.lote:
                raise ValueError("conjunto e lote sao obrigatorios para QUADRA_CONJUNTO_LOTE")
        elif self.tipo_endereco == "QUADRA_SETOR_CHACARA":
            if not self.setor_chacara or not self.numero_chacara:
                raise ValueError("setor_chacara e numero_chacara sao obrigatorios para QUADRA_SETOR_CHACARA")
        else:
            raise ValueError("tipo_endereco invalido")
        return self

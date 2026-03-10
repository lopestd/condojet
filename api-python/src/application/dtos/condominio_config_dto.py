from pydantic import BaseModel, Field, model_validator


class EnderecamentoParametrosDTO(BaseModel):
    predio_rotulo_bloco: str = Field(default="Bloco", min_length=1, max_length=80)
    predio_rotulo_andar: str = Field(default="Andar", min_length=1, max_length=80)
    predio_rotulo_apartamento: str = Field(default="Apartamento", min_length=1, max_length=80)
    horizontal_rotulo_tipo: str = Field(default="Tipo", min_length=1, max_length=80)
    horizontal_rotulo_subtipo: str = Field(default="Subtipo", min_length=1, max_length=80)
    horizontal_rotulo_numero: str = Field(default="Numero", min_length=1, max_length=80)
    horizontal_hint_tipo: str = Field(default="Trecho, Quadra, Etapa ou Area", min_length=1, max_length=255)
    horizontal_hint_subtipo: str = Field(
        default="Conjunto, Chacara, Quadra ou Area Especial", min_length=1, max_length=255
    )
    horizontal_tipos_permitidos_ids: list[int] = Field(default_factory=list)
    horizontal_subtipos_permitidos_ids: list[int] = Field(default_factory=list)
    horizontal_tipos_permitidos_nomes: list[str] = Field(default_factory=list)
    horizontal_subtipos_permitidos_nomes: list[str] = Field(default_factory=list)

    @model_validator(mode="after")
    def normalize(self) -> "EnderecamentoParametrosDTO":
        self.predio_rotulo_bloco = self.predio_rotulo_bloco.strip()
        self.predio_rotulo_andar = self.predio_rotulo_andar.strip()
        self.predio_rotulo_apartamento = self.predio_rotulo_apartamento.strip()
        self.horizontal_rotulo_tipo = self.horizontal_rotulo_tipo.strip()
        self.horizontal_rotulo_subtipo = self.horizontal_rotulo_subtipo.strip()
        self.horizontal_rotulo_numero = self.horizontal_rotulo_numero.strip()
        self.horizontal_hint_tipo = self.horizontal_hint_tipo.strip()
        self.horizontal_hint_subtipo = self.horizontal_hint_subtipo.strip()
        self.horizontal_tipos_permitidos_ids = sorted({int(item) for item in self.horizontal_tipos_permitidos_ids if int(item) > 0})
        self.horizontal_subtipos_permitidos_ids = sorted(
            {int(item) for item in self.horizontal_subtipos_permitidos_ids if int(item) > 0}
        )
        self.horizontal_tipos_permitidos_nomes = sorted(
            {str(item).strip() for item in self.horizontal_tipos_permitidos_nomes if str(item).strip()}
        )
        self.horizontal_subtipos_permitidos_nomes = sorted(
            {str(item).strip() for item in self.horizontal_subtipos_permitidos_nomes if str(item).strip()}
        )
        return self


class UpdateCondominioConfigDTO(BaseModel):
    nome_condominio: str = Field(min_length=2, max_length=150)
    tipo_condominio_id: int = Field(ge=1)
    parametros_enderecamento: EnderecamentoParametrosDTO | None = None

    @model_validator(mode="after")
    def validate_nome(self) -> "UpdateCondominioConfigDTO":
        self.nome_condominio = self.nome_condominio.strip()
        if not self.nome_condominio:
            raise ValueError("nome_condominio_obrigatorio")
        return self

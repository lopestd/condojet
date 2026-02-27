from pydantic import BaseModel


class CreateEncomendaDTO(BaseModel):
    tipo: str
    morador_id: int
    endereco_id: int
    codigo_externo: str | None = None
    descricao: str | None = None
    empresa_entregadora: str | None = None


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

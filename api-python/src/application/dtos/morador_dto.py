from pydantic import BaseModel, EmailStr


class CreateMoradorDTO(BaseModel):
    nome: str
    telefone: str
    email: EmailStr
    endereco_id: int
    senha: str


class UpdateMoradorDTO(BaseModel):
    nome: str | None = None
    telefone: str | None = None
    ativo: bool | None = None
    senha: str | None = None

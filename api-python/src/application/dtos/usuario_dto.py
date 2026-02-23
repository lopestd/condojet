from pydantic import BaseModel, EmailStr


class CreateUsuarioDTO(BaseModel):
    nome: str
    email: EmailStr
    senha: str
    perfil: str


class UpdateUsuarioDTO(BaseModel):
    nome: str | None = None
    senha: str | None = None
    ativo: bool | None = None

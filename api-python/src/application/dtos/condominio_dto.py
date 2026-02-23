from pydantic import BaseModel, EmailStr, Field

PHONE_REGEX = r"^\(\d{2}\)\s\d{5}-\d{4}$"


class CreateCondominioAdminDTO(BaseModel):
    nome: str = Field(min_length=2, max_length=120)
    email: EmailStr
    senha: str = Field(min_length=6, max_length=120)
    telefone: str = Field(min_length=15, max_length=15, pattern=PHONE_REGEX)


class CreateCondominioDTO(BaseModel):
    nome: str = Field(min_length=2, max_length=150)
    admin: CreateCondominioAdminDTO


class UpdateCondominioDTO(BaseModel):
    nome: str | None = Field(default=None, min_length=2, max_length=150)
    ativo: bool | None = None


class CreateCondominioAdminUserDTO(BaseModel):
    nome: str = Field(min_length=2, max_length=120)
    email: EmailStr
    senha: str = Field(min_length=6, max_length=120)
    telefone: str = Field(min_length=15, max_length=15, pattern=PHONE_REGEX)


class UpdateCondominioAdminUserDTO(BaseModel):
    nome: str | None = Field(default=None, min_length=2, max_length=120)
    senha: str | None = Field(default=None, min_length=6, max_length=120)
    telefone: str | None = Field(default=None, min_length=15, max_length=15, pattern=PHONE_REGEX)
    responsavel_sistema: bool | None = None
    ativo: bool | None = None

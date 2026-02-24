from pydantic import BaseModel, EmailStr


class LoginRequestDTO(BaseModel):
    email: EmailStr
    senha: str
    acesso_condominio: bool = False
    condominio_id: int | None = None


class LoginResponseDTO(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    condominio_id: int | None = None

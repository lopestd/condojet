from pydantic import BaseModel, Field


class UpdateConfiguracaoDTO(BaseModel):
    timezone: str = Field(min_length=3, max_length=64)


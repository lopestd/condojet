from src.application.dtos.endereco_dto import CreateEnderecoDTO


def validate_endereco_payload(payload: CreateEnderecoDTO) -> dict:
    return payload.model_dump()

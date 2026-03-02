import pytest
from pydantic import ValidationError

from src.application.dtos.configuracao_dto import UpdateConfiguracaoDTO


def test_update_configuracao_timezone_valido() -> None:
    dto = UpdateConfiguracaoDTO(timezone="America/Sao_Paulo")
    assert dto.timezone == "America/Sao_Paulo"


def test_update_configuracao_prazo_valido() -> None:
    dto = UpdateConfiguracaoDTO(prazo_dias_encomenda_esquecida=7)
    assert dto.prazo_dias_encomenda_esquecida == 7


def test_update_configuracao_rejeita_payload_vazio() -> None:
    with pytest.raises(ValidationError):
        UpdateConfiguracaoDTO()


def test_update_configuracao_rejeita_timezone_invalido() -> None:
    with pytest.raises(ValidationError):
        UpdateConfiguracaoDTO(timezone="America/Invalid")


def test_update_configuracao_rejeita_prazo_invalido() -> None:
    with pytest.raises(ValidationError):
        UpdateConfiguracaoDTO(prazo_dias_encomenda_esquecida=0)

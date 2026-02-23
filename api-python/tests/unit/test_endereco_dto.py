import pytest

from src.application.dtos.endereco_dto import CreateEnderecoDTO


def test_tipo_1_valido() -> None:
    dto = CreateEnderecoDTO(tipo_endereco="QUADRA_CONJUNTO_LOTE", quadra="Q1", conjunto="C1", lote="10")
    assert dto.conjunto == "C1"


def test_tipo_1_invalido_sem_conjunto() -> None:
    with pytest.raises(ValueError):
        CreateEnderecoDTO(tipo_endereco="QUADRA_CONJUNTO_LOTE", quadra="Q1", lote="10")


def test_tipo_2_invalido_sem_setor() -> None:
    with pytest.raises(ValueError):
        CreateEnderecoDTO(tipo_endereco="QUADRA_SETOR_CHACARA", quadra="Q2", numero_chacara="5")

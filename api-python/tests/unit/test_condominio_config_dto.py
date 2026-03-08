import pytest
from pydantic import ValidationError

from src.application.dtos.condominio_config_dto import UpdateCondominioConfigDTO


def test_update_condominio_config_valido() -> None:
    dto = UpdateCondominioConfigDTO(nome_condominio="Condominio Primavera", tipo_condominio_id=1)
    assert dto.nome_condominio == "Condominio Primavera"
    assert dto.tipo_condominio_id == 1


def test_update_condominio_config_rejeita_nome_vazio() -> None:
    with pytest.raises(ValidationError):
        UpdateCondominioConfigDTO(nome_condominio="   ", tipo_condominio_id=1)


def test_update_condominio_config_rejeita_tipo_invalido() -> None:
    with pytest.raises(ValidationError):
        UpdateCondominioConfigDTO(nome_condominio="Condominio Primavera", tipo_condominio_id=0)


def test_update_condominio_config_aceita_parametros_enderecamento() -> None:
    dto = UpdateCondominioConfigDTO(
        nome_condominio="Condominio Primavera",
        tipo_condominio_id=1,
        parametros_enderecamento={
            "predio_rotulo_bloco": "Bloco",
            "predio_rotulo_andar": "Andar",
            "predio_rotulo_apartamento": "Apto",
            "horizontal_rotulo_tipo": "Tipo",
            "horizontal_rotulo_subtipo": "Subtipo",
            "horizontal_rotulo_numero": "Numero",
            "horizontal_hint_tipo": "Trecho, Quadra, Etapa ou Area",
            "horizontal_hint_subtipo": "Conjunto, Chacara, Quadra ou Area Especial",
        },
    )
    assert dto.parametros_enderecamento is not None
    assert dto.parametros_enderecamento.horizontal_rotulo_tipo == "Tipo"

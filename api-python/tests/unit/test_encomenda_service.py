from types import SimpleNamespace

import pytest

from src.application.services.encomenda_service import (
    ensure_entrega_allowed,
    ensure_morador_endereco_consistency,
    ensure_reabertura_allowed,
    ensure_update_allowed,
    format_endereco_label,
)
from src.application.services.exceptions import AppError


def test_consistencia_morador_endereco_ok() -> None:
    morador = SimpleNamespace(endereco_id=10)
    ensure_morador_endereco_consistency(morador, 10)


def test_consistencia_morador_endereco_invalida() -> None:
    morador = SimpleNamespace(endereco_id=10)
    with pytest.raises(AppError):
        ensure_morador_endereco_consistency(morador, 11)


def test_entrega_nao_permitida_para_entregue() -> None:
    encomenda = SimpleNamespace(status="ENTREGUE")
    with pytest.raises(AppError):
        ensure_entrega_allowed(encomenda)


def test_reabertura_exige_status_entregue() -> None:
    encomenda = SimpleNamespace(status="RECEBIDA")
    with pytest.raises(AppError):
        ensure_reabertura_allowed(encomenda, "erro")


def test_reabertura_exige_motivo() -> None:
    encomenda = SimpleNamespace(status="ENTREGUE")
    with pytest.raises(AppError):
        ensure_reabertura_allowed(encomenda, "   ")


def test_update_nao_permitido_para_entregue() -> None:
    encomenda = SimpleNamespace(status="ENTREGUE")
    with pytest.raises(AppError):
        ensure_update_allowed(encomenda)


def test_format_endereco_label_quadra_conjunto_lote() -> None:
    label = format_endereco_label(
        {
            "tipo_endereco": "QUADRA_CONJUNTO_LOTE",
            "quadra": "Q1",
            "conjunto": "C2",
            "lote": "L5",
        }
    )
    assert label == "Q1 - C2/L5"


def test_format_endereco_label_quadra_setor_chacara() -> None:
    label = format_endereco_label(
        {
            "tipo_endereco": "QUADRA_SETOR_CHACARA",
            "quadra": "Q7",
            "setor_chacara": "S1",
            "numero_chacara": "N3",
        }
    )
    assert label == "Q7 - S1/N3"

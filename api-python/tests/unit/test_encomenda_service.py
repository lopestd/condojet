from types import SimpleNamespace

import pytest

from src.application.services.encomenda_service import (
    ensure_entrega_allowed,
    ensure_morador_endereco_consistency,
    ensure_reabertura_allowed,
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

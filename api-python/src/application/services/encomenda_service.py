from datetime import datetime

from src.application.services.exceptions import AppError
from src.infrastructure.database.models import EncomendaModel, MoradorModel


def _build_codigo_interno(now: datetime) -> str:
    # 24 chars: CBX-YYYYMMDD-HHMMSS-XXXX
    return f"CBX-{now:%Y%m%d-%H%M%S}-{now.microsecond % 10000:04d}"


def build_encomenda_payload(payload: dict, principal_id: int, condominio_id: int) -> dict:
    now = datetime.now()
    return {
        "condominio_id": condominio_id,
        "codigo_interno": _build_codigo_interno(now),
        "tipo": payload["tipo"],
        "morador_id": payload["morador_id"],
        "endereco_id": payload["endereco_id"],
        "codigo_externo": payload.get("codigo_externo"),
        "descricao": payload.get("descricao"),
        "empresa_entregadora": payload.get("empresa_entregadora"),
        "status": "RECEBIDA",
        "data_recebimento": now.date(),
        "hora_recebimento": now.time().replace(microsecond=0),
        "recebido_por_usuario_id": principal_id,
    }


def ensure_morador_endereco_consistency(morador: MoradorModel | None, endereco_id: int) -> None:
    if morador is None:
        raise AppError("morador_not_found", status_code=404, code="morador_not_found")
    if morador.endereco_id != endereco_id:
        raise AppError("morador_endereco_mismatch", status_code=409, code="morador_endereco_mismatch")


def ensure_entrega_allowed(encomenda: EncomendaModel | None) -> EncomendaModel:
    if encomenda is None:
        raise AppError("encomenda_not_found", status_code=404, code="encomenda_not_found")
    if encomenda.status == "ENTREGUE":
        raise AppError("encomenda_already_delivered", status_code=409, code="encomenda_already_delivered")
    return encomenda


def ensure_update_allowed(encomenda: EncomendaModel | None) -> EncomendaModel:
    if encomenda is None:
        raise AppError("encomenda_not_found", status_code=404, code="encomenda_not_found")
    if encomenda.status == "ENTREGUE":
        raise AppError("encomenda_update_not_allowed", status_code=409, code="encomenda_update_not_allowed")
    return encomenda


def ensure_reabertura_allowed(encomenda: EncomendaModel | None, motivo_reabertura: str) -> EncomendaModel:
    if encomenda is None:
        raise AppError("encomenda_not_found", status_code=404, code="encomenda_not_found")
    if encomenda.status != "ENTREGUE":
        raise AppError("encomenda_not_delivered", status_code=409, code="encomenda_not_delivered")
    if not motivo_reabertura.strip():
        raise AppError("motivo_reabertura_required", status_code=422, code="motivo_reabertura_required")
    return encomenda


def format_endereco_label(endereco: dict | None) -> str:
    if endereco is None:
        return "-"

    quadra = str(endereco.get("quadra") or "-")
    tipo_endereco = str(endereco.get("tipo_endereco") or "")

    if tipo_endereco == "QUADRA_SETOR_CHACARA":
        setor_chacara = str(endereco.get("setor_chacara") or "-")
        numero_chacara = endereco.get("numero_chacara")
        complemento = f"{setor_chacara}/{numero_chacara}" if numero_chacara else setor_chacara
        return f"{quadra} - {complemento}"

    conjunto = str(endereco.get("conjunto") or "-")
    lote = endereco.get("lote")
    complemento = f"{conjunto}/{lote}" if lote else conjunto
    return f"{quadra} - {complemento}"

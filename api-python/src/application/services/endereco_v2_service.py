from src.application.services.exceptions import AppError


def build_endereco_v2_label(endereco: dict | None) -> str:
    if endereco is None:
        return "-"

    tipo_condominio_slug = str(endereco.get("tipo_condominio_slug") or "")
    if tipo_condominio_slug == "PREDIO_CONJUNTO":
        bloco = str(endereco.get("bloco") or "-")
        andar = str(endereco.get("andar") or "-")
        apartamento = str(endereco.get("apartamento") or "-")
        return f"Bloco {bloco} - Andar {andar} - Apto {apartamento}"

    tipo = str(endereco.get("tipo_logradouro_nome") or "-")
    subtipo = str(endereco.get("subtipo_logradouro_nome") or "-")
    numero = str(endereco.get("numero") or "-")
    return f"{tipo} / {subtipo} / {numero}"


def validate_endereco_v2_payload_by_tipo_condominio(
    *,
    tipo_condominio_slug: str,
    bloco: str | None,
    andar: str | None,
    apartamento: str | None,
    tipo_logradouro_horizontal_id: int | None,
    tipo_logradouro_horizontal_nome: str | None,
    subtipo_logradouro_horizontal_id: int | None,
    subtipo_logradouro_horizontal_nome: str | None,
    numero: str | None,
) -> None:
    if tipo_condominio_slug == "PREDIO_CONJUNTO":
        if not bloco or not andar or not apartamento:
            raise AppError("endereco_predio_campos_obrigatorios", status_code=422, code="validation_error")
        if tipo_logradouro_horizontal_id or subtipo_logradouro_horizontal_id or numero:
            raise AppError("endereco_predio_campos_invalidos", status_code=422, code="validation_error")
        return

    if tipo_condominio_slug == "HORIZONTAL":
        horizontal = bool(
            tipo_logradouro_horizontal_id
            and subtipo_logradouro_horizontal_id
            and str(tipo_logradouro_horizontal_nome or "").strip()
            and str(subtipo_logradouro_horizontal_nome or "").strip()
            and str(numero or "").strip()
        )
        if not horizontal:
            raise AppError("endereco_horizontal_campos_obrigatorios", status_code=422, code="validation_error")
        if bloco or andar or apartamento:
            raise AppError("endereco_horizontal_campos_invalidos", status_code=422, code="validation_error")
        return

    raise AppError("tipo_condominio_not_supported", status_code=422, code="validation_error")

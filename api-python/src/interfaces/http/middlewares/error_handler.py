from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError

from src.application.services.exceptions import AppError


def _with_request_id(request: Request, payload: dict) -> dict:
    request_id = getattr(request.state, "request_id", None)
    if request_id:
        payload["request_id"] = request_id
    return payload


def configure_error_handler(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def handle_app_error(request: Request, exc: AppError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content=_with_request_id(request, {"message": exc.message, "code": exc.code}),
        )

    @app.exception_handler(RequestValidationError)
    async def handle_validation(request: Request, exc: RequestValidationError) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content=_with_request_id(
                request,
                {"message": "validation_error", "detail": jsonable_encoder(exc.errors())},
            ),
        )

    @app.exception_handler(IntegrityError)
    async def handle_integrity_error(request: Request, exc: IntegrityError) -> JSONResponse:
        detail = str(exc).lower()
        if (
            "email_already_exists" in detail
            or "ux_usuarios_condominio_email_lower" in detail
            or "ux_moradores_condominio_email_lower" in detail
            or "ux_usuarios_globais_email_lower" in detail
        ):
            return JSONResponse(
                status_code=409,
                content=_with_request_id(request, {"message": "email_already_exists", "code": "email_already_exists"}),
            )
        return JSONResponse(
            status_code=409,
            content=_with_request_id(request, {"message": "integrity_error", "code": "integrity_error"}),
        )

    @app.exception_handler(Exception)
    async def handle_exception(request: Request, exc: Exception) -> JSONResponse:
        return JSONResponse(
            status_code=500,
            content=_with_request_id(request, {"message": "internal_error", "detail": str(exc)}),
        )

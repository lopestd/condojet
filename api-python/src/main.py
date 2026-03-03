from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.infrastructure.config.settings import settings
from src.interfaces.http.middlewares.error_handler import configure_error_handler
from src.interfaces.http.middlewares.request_observability import configure_request_observability
from src.interfaces.http.routes.auth_routes import router as auth_router
from src.interfaces.http.routes.condominio_routes import router as condominio_router
from src.interfaces.http.routes.configuracao_routes import router as configuracao_router
from src.interfaces.http.routes.empresa_responsavel_global_routes import router as empresa_responsavel_global_router
from src.interfaces.http.routes.encomenda_routes import router as encomenda_router
from src.interfaces.http.routes.endereco_routes import router as endereco_router
from src.interfaces.http.routes.health_routes import router as health_router
from src.interfaces.http.routes.morador_routes import router as morador_router
from src.interfaces.http.routes.system_routes import router as system_router
from src.interfaces.http.routes.usuario_routes import router as usuario_router

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

configure_error_handler(app)
configure_request_observability(app)

app.include_router(health_router, prefix="/api/v1")
app.include_router(system_router, prefix="/api/v1")
app.include_router(condominio_router, prefix="/api/v1")
app.include_router(configuracao_router, prefix="/api/v1")
app.include_router(empresa_responsavel_global_router, prefix="/api/v1")
app.include_router(auth_router, prefix="/api/v1")
app.include_router(usuario_router, prefix="/api/v1")
app.include_router(endereco_router, prefix="/api/v1")
app.include_router(morador_router, prefix="/api/v1")
app.include_router(encomenda_router, prefix="/api/v1")

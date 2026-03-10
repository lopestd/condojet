from datetime import date, datetime, time

from sqlalchemy import BIGINT, TIMESTAMP, Boolean, Date, Enum, ForeignKey, String, Text, Time, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

from src.infrastructure.config.settings import settings


class Base(DeclarativeBase):
    pass


class CondominioModel(Base):
    __tablename__ = "condominios"
    __table_args__ = {"schema": settings.db_schema}

    id: Mapped[int] = mapped_column(BIGINT, primary_key=True)
    nome: Mapped[str] = mapped_column(String(150), nullable=False)
    api_key: Mapped[str] = mapped_column(String(120), nullable=False)
    tipo_condominio_id: Mapped[int | None] = mapped_column(
        BIGINT,
        ForeignKey(f"{settings.db_schema}.tipos_condominio.id"),
        nullable=True,
    )
    ativo: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False, server_default=text("now()"))
    updated_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False, server_default=text("now()"))


class TipoCondominioModel(Base):
    __tablename__ = "tipos_condominio"
    __table_args__ = {"schema": settings.db_schema}

    id: Mapped[int] = mapped_column(BIGINT, primary_key=True)
    nome: Mapped[str] = mapped_column(String(120), nullable=False)
    slug: Mapped[str] = mapped_column(String(40), nullable=False)
    ativo: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False, server_default=text("now()"))
    updated_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False, server_default=text("now()"))


class TipoLogradouroHorizontalModel(Base):
    __tablename__ = "tipos_logradouro_horizontal"
    __table_args__ = {"schema": settings.db_schema}

    id: Mapped[int] = mapped_column(BIGINT, primary_key=True)
    condominio_id: Mapped[int | None] = mapped_column(
        BIGINT,
        ForeignKey(f"{settings.db_schema}.condominios.id"),
        nullable=True,
    )
    nome: Mapped[str] = mapped_column(String(80), nullable=False)
    slug: Mapped[str] = mapped_column(String(40), nullable=False)
    ativo: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))
    ordem_exibicao: Mapped[int] = mapped_column(BIGINT, nullable=False, server_default=text("100"))
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False, server_default=text("now()"))
    updated_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False, server_default=text("now()"))


class SubtipoLogradouroHorizontalModel(Base):
    __tablename__ = "subtipos_logradouro_horizontal"
    __table_args__ = {"schema": settings.db_schema}

    id: Mapped[int] = mapped_column(BIGINT, primary_key=True)
    condominio_id: Mapped[int | None] = mapped_column(
        BIGINT,
        ForeignKey(f"{settings.db_schema}.condominios.id"),
        nullable=True,
    )
    tipo_logradouro_horizontal_id: Mapped[int] = mapped_column(
        BIGINT,
        ForeignKey(f"{settings.db_schema}.tipos_logradouro_horizontal.id"),
        nullable=False,
    )
    nome: Mapped[str] = mapped_column(String(80), nullable=False)
    slug: Mapped[str] = mapped_column(String(40), nullable=False)
    ativo: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))
    ordem_exibicao: Mapped[int] = mapped_column(BIGINT, nullable=False, server_default=text("100"))
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False, server_default=text("now()"))
    updated_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False, server_default=text("now()"))


class EnderecoModel(Base):
    __tablename__ = "enderecos"
    __table_args__ = {"schema": settings.db_schema}

    id: Mapped[int] = mapped_column(BIGINT, primary_key=True)
    condominio_id: Mapped[int] = mapped_column(
        BIGINT,
        ForeignKey(f"{settings.db_schema}.condominios.id"),
        nullable=False,
    )
    tipo_endereco: Mapped[str] = mapped_column(
        Enum(
            "QUADRA_CONJUNTO_LOTE",
            "QUADRA_SETOR_CHACARA",
            name="tipo_endereco",
            schema=settings.db_schema,
            create_type=False,
        ),
        nullable=False,
    )
    quadra: Mapped[str] = mapped_column(String(20), nullable=False)
    conjunto: Mapped[str | None] = mapped_column(String(20), nullable=True)
    lote: Mapped[str | None] = mapped_column(String(20), nullable=True)
    setor_chacara: Mapped[str | None] = mapped_column(String(80), nullable=True)
    numero_chacara: Mapped[str | None] = mapped_column(String(20), nullable=True)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False, server_default=text("now()"))
    updated_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False, server_default=text("now()"))


class EnderecoMoradorModel(Base):
    __tablename__ = "enderecos_morador"
    __table_args__ = {"schema": settings.db_schema}

    id: Mapped[int] = mapped_column(BIGINT, primary_key=True)
    condominio_id: Mapped[int] = mapped_column(BIGINT, ForeignKey(f"{settings.db_schema}.condominios.id"), nullable=False)
    tipo_condominio_id: Mapped[int] = mapped_column(
        BIGINT,
        ForeignKey(f"{settings.db_schema}.tipos_condominio.id"),
        nullable=False,
    )
    bloco: Mapped[str | None] = mapped_column(String(30), nullable=True)
    andar: Mapped[str | None] = mapped_column(String(20), nullable=True)
    apartamento: Mapped[str | None] = mapped_column(String(30), nullable=True)
    tipo_logradouro_horizontal_id: Mapped[int | None] = mapped_column(
        BIGINT,
        ForeignKey(f"{settings.db_schema}.tipos_logradouro_horizontal.id"),
        nullable=True,
    )
    tipo_logradouro_horizontal_nome_livre: Mapped[str | None] = mapped_column(String(80), nullable=True)
    tipo_logradouro_horizontal_campo_nome: Mapped[str | None] = mapped_column(String(80), nullable=True)
    subtipo_logradouro_horizontal_id: Mapped[int | None] = mapped_column(
        BIGINT,
        ForeignKey(f"{settings.db_schema}.subtipos_logradouro_horizontal.id"),
        nullable=True,
    )
    subtipo_logradouro_horizontal_nome_livre: Mapped[str | None] = mapped_column(String(80), nullable=True)
    subtipo_logradouro_horizontal_campo_nome: Mapped[str | None] = mapped_column(String(80), nullable=True)
    numero: Mapped[str | None] = mapped_column(String(30), nullable=True)
    ativo: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False, server_default=text("now()"))
    updated_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False, server_default=text("now()"))


class UsuarioModel(Base):
    __tablename__ = "usuarios"
    __table_args__ = {"schema": settings.db_schema}

    id: Mapped[int] = mapped_column(BIGINT, primary_key=True)
    condominio_id: Mapped[int] = mapped_column(
        BIGINT,
        ForeignKey(f"{settings.db_schema}.condominios.id"),
        nullable=False,
    )
    nome: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    telefone: Mapped[str] = mapped_column(String(15), nullable=False)
    senha_hash: Mapped[str] = mapped_column(Text, nullable=False)
    perfil: Mapped[str] = mapped_column(
        Enum("ADMIN", "PORTEIRO", name="perfil_usuario", schema=settings.db_schema, create_type=False), nullable=False
    )
    responsavel_sistema: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("false"))
    ativo: Mapped[bool] = mapped_column(Boolean, nullable=False)


class MoradorModel(Base):
    __tablename__ = "moradores"
    __table_args__ = {"schema": settings.db_schema}

    id: Mapped[int] = mapped_column(BIGINT, primary_key=True)
    condominio_id: Mapped[int] = mapped_column(
        BIGINT,
        ForeignKey(f"{settings.db_schema}.condominios.id"),
        nullable=False,
    )
    nome: Mapped[str] = mapped_column(String(120), nullable=False)
    telefone: Mapped[str] = mapped_column(String(30), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    endereco_id: Mapped[int] = mapped_column(BIGINT, ForeignKey(f"{settings.db_schema}.enderecos_morador.id"), nullable=False)
    senha_hash: Mapped[str] = mapped_column(Text, nullable=False)
    ativo: Mapped[bool] = mapped_column(Boolean, nullable=False)


class EncomendaModel(Base):
    __tablename__ = "encomendas"
    __table_args__ = {"schema": settings.db_schema}

    id: Mapped[int] = mapped_column(BIGINT, primary_key=True)
    condominio_id: Mapped[int] = mapped_column(
        BIGINT,
        ForeignKey(f"{settings.db_schema}.condominios.id"),
        nullable=False,
    )
    codigo_interno: Mapped[str] = mapped_column(String(24), nullable=False)
    codigo_externo: Mapped[str | None] = mapped_column(String(100), nullable=True)
    descricao: Mapped[str | None] = mapped_column(Text, nullable=True)
    tipo: Mapped[str] = mapped_column(
        Enum("PACOTE", "ENVELOPE", "CAIXA", name="tipo_encomenda", schema=settings.db_schema, create_type=False),
        nullable=False,
    )
    empresa_entregadora: Mapped[str | None] = mapped_column(String(120), nullable=True)
    endereco_id: Mapped[int] = mapped_column(BIGINT, nullable=False)
    morador_id: Mapped[int] = mapped_column(BIGINT, nullable=False)
    status: Mapped[str] = mapped_column(
        Enum(
            "RECEBIDA",
            "DISPONIVEL_RETIRADA",
            "ENTREGUE",
            name="status_encomenda",
            schema=settings.db_schema,
            create_type=False,
        ),
        nullable=False,
    )
    data_recebimento: Mapped[date] = mapped_column(Date, nullable=False)
    hora_recebimento: Mapped[time] = mapped_column(Time, nullable=False)
    recebido_por_usuario_id: Mapped[int] = mapped_column(BIGINT, nullable=False)
    data_entrega: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
    entregue_por_usuario_id: Mapped[int | None] = mapped_column(BIGINT, nullable=True)
    retirado_por_nome: Mapped[str | None] = mapped_column(String(120), nullable=True)
    motivo_reabertura: Mapped[str | None] = mapped_column(Text, nullable=True)
    reaberto_por_usuario_id: Mapped[int | None] = mapped_column(BIGINT, nullable=True)
    reaberto_em: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
    notificado_em: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
    notificado_por: Mapped[str | None] = mapped_column(String(80), nullable=True)
    notificacao_status: Mapped[str] = mapped_column(String(20), nullable=False, server_default=text("'PENDENTE'"))
    notificacao_erro: Mapped[str | None] = mapped_column(Text, nullable=True)


class ConfiguracaoModel(Base):
    __tablename__ = "configuracoes"
    __table_args__ = {"schema": settings.db_schema}

    id: Mapped[int] = mapped_column(BIGINT, primary_key=True)
    condominio_id: Mapped[int] = mapped_column(
        BIGINT,
        ForeignKey(f"{settings.db_schema}.condominios.id"),
        nullable=False,
    )
    whatsapp_token: Mapped[str | None] = mapped_column(Text, nullable=True)
    numero_condominio: Mapped[str | None] = mapped_column(String(30), nullable=True)
    timezone: Mapped[str] = mapped_column(String(64), nullable=False, server_default=text("'America/Sao_Paulo'"))
    prazo_dias_encomenda_esquecida: Mapped[int] = mapped_column(BIGINT, nullable=False, server_default=text("15"))
    endereco_predio_rotulo_bloco: Mapped[str] = mapped_column(String(80), nullable=False, server_default=text("'Bloco'"))
    endereco_predio_rotulo_andar: Mapped[str] = mapped_column(String(80), nullable=False, server_default=text("'Andar'"))
    endereco_predio_rotulo_apartamento: Mapped[str] = mapped_column(
        String(80), nullable=False, server_default=text("'Apartamento'")
    )
    endereco_horizontal_rotulo_tipo: Mapped[str] = mapped_column(String(80), nullable=False, server_default=text("'Tipo'"))
    endereco_horizontal_rotulo_subtipo: Mapped[str] = mapped_column(
        String(80), nullable=False, server_default=text("'Subtipo'")
    )
    endereco_horizontal_rotulo_numero: Mapped[str] = mapped_column(
        String(80), nullable=False, server_default=text("'Numero'")
    )
    endereco_horizontal_hint_tipo: Mapped[str] = mapped_column(
        String(255), nullable=False, server_default=text("'Trecho, Quadra, Etapa ou Area'")
    )
    endereco_horizontal_hint_subtipo: Mapped[str] = mapped_column(
        String(255), nullable=False, server_default=text("'Conjunto, Chacara, Quadra ou Area Especial'")
    )
    endereco_horizontal_tipos_permitidos_ids: Mapped[list[int]] = mapped_column(
        JSONB, nullable=False, server_default=text("'[]'::jsonb")
    )
    endereco_horizontal_subtipos_permitidos_ids: Mapped[list[int]] = mapped_column(
        JSONB, nullable=False, server_default=text("'[]'::jsonb")
    )
    endereco_horizontal_tipos_permitidos_nomes: Mapped[list[str]] = mapped_column(
        JSONB, nullable=False, server_default=text("'[]'::jsonb")
    )
    endereco_horizontal_subtipos_permitidos_nomes: Mapped[list[str]] = mapped_column(
        JSONB, nullable=False, server_default=text("'[]'::jsonb")
    )
    status_conexao: Mapped[str] = mapped_column(
        Enum(
            "DESCONECTADO",
            "CONECTADO",
            "ERRO",
            name="status_conexao_whatsapp",
            schema=settings.db_schema,
            create_type=False,
        ),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False, server_default=text("now()"))
    updated_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False, server_default=text("now()"))


class WebhookN8nGlobalModel(Base):
    __tablename__ = "webhooks_n8n_global"
    __table_args__ = {"schema": settings.db_schema}

    id: Mapped[int] = mapped_column(BIGINT, primary_key=True)
    tipo: Mapped[str] = mapped_column(String(32), nullable=False)
    url: Mapped[str] = mapped_column(Text, nullable=False)
    ativo: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))
    updated_by_usuario_id: Mapped[int | None] = mapped_column(BIGINT, nullable=True)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False, server_default=text("now()"))
    updated_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False, server_default=text("now()"))


class EmpresaResponsavelGlobalModel(Base):
    __tablename__ = "empresas_responsaveis_globais"
    __table_args__ = {"schema": settings.db_schema}

    id: Mapped[int] = mapped_column(BIGINT, primary_key=True)
    nome: Mapped[str] = mapped_column(String(120), nullable=False)
    nome_normalizado: Mapped[str] = mapped_column(String(120), nullable=False)
    ativo: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False, server_default=text("now()"))
    updated_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False, server_default=text("now()"))


class ChaveSistemaModel(Base):
    __tablename__ = "chaves_sistema"
    __table_args__ = {"schema": settings.db_schema}

    id: Mapped[int] = mapped_column(BIGINT, primary_key=True)
    nome: Mapped[str] = mapped_column(String(80), nullable=False)
    valor: Mapped[str] = mapped_column(String(180), nullable=False)
    ativo: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False, server_default=text("now()"))
    updated_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False, server_default=text("now()"))


class UsuarioGlobalModel(Base):
    __tablename__ = "usuarios_globais"
    __table_args__ = {"schema": settings.db_schema}

    id: Mapped[int] = mapped_column(BIGINT, primary_key=True)
    nome: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    senha_hash: Mapped[str] = mapped_column(Text, nullable=False)
    perfil: Mapped[str] = mapped_column(
        Enum("ADMIN_GLOBAL", name="perfil_global_usuario", schema=settings.db_schema, create_type=False), nullable=False
    )
    ativo: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False, server_default=text("now()"))
    updated_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False, server_default=text("now()"))

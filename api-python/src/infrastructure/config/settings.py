from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = Field(default="CondoJET API", alias="API_APP_NAME")
    app_env: str = Field(default="development", alias="API_APP_ENV")
    app_port: int = Field(default=8000, alias="API_APP_PORT")

    db_host: str = Field(default="127.0.0.1", alias="DB_HOST")
    db_port: int = Field(default=5432, alias="DB_PORT")
    db_user: str = Field(default="condojet", alias="DB_USER")
    db_password: str = Field(default="change-me", alias="DB_PASSWORD")
    db_name: str = Field(default="condojet", alias="DB_NAME")
    db_schema: str = Field(default="admcondojet", alias="DB_SCHEMA")

    api_database_url: str | None = Field(default=None, alias="API_DATABASE_URL")

    jwt_secret: str = Field(default="change-me", alias="API_JWT_SECRET")
    jwt_expires_minutes: int = Field(default=60, alias="API_JWT_EXPIRES_MINUTES")
    cors_origins: str = Field(default="http://localhost:5173,http://localhost:3000", alias="API_CORS_ORIGINS")
    global_api_key: str = Field(alias="API_GLOBAL_API_KEY")
    global_admin_name: str = Field(default="Admin Global CondoJET", alias="API_GLOBAL_ADMIN_NAME")
    global_admin_email: str = Field(default="admin.global@condojet.app", alias="API_GLOBAL_ADMIN_EMAIL")
    global_admin_password: str = Field(default="change-me-global-admin", alias="API_GLOBAL_ADMIN_PASSWORD")

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore", populate_by_name=True)

    @property
    def database_url(self) -> str:
        if self.api_database_url:
            return self.api_database_url
        return f"postgresql+psycopg://{self.db_user}:{self.db_password}@{self.db_host}:{self.db_port}/{self.db_name}"

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()

# CondoJET

Estrutura inicial do CondoJET seguindo MVP + prompt arquitetural.

## Arquitetura adotada

1. `frontend` (React + Vite + TypeScript, mobile-first)
2. `backend` (BFF Node.js + TypeScript, sem acesso direto ao banco)
3. `api-python` (FastAPI em Clean Architecture, única camada com acesso ao PostgreSQL)
4. `database` (DDL PostgreSQL para provisionamento administrado externamente)

Fluxo: `Frontend -> Backend (BFF) -> API Python -> PostgreSQL`.

## Estratégia de configuração de ambiente (padrão do projeto)

Para manter desenvolvimento simples e deploy profissional sem retrabalho:

1. Contrato único versionado em `config/env/.env.example`.
2. Arquivo por ambiente, com o mesmo formato e as mesmas chaves:
   - `config/env/.env.dsv`
   - `config/env/.env.staging`
   - `config/env/.env.prod` (não versionar)
3. Namespaces por camada:
   - `DB_*` para banco
   - `API_*` para API Python
   - `BFF_*` para backend BFF
   - `WEB_*` para frontend
4. Cada serviço deve consumir apenas suas variáveis.
5. Deploy sem alteração de código: muda apenas o arquivo/valores de ambiente.

Guia detalhado de mapeamento (DSV + PROD/Portainer): `plans/mapeamento_variaveis_ambiente.md`.

### Template recomendado (`config/env/.env.example`)

```env
# =========================
# DATABASE (PostgreSQL)
# =========================
DB_NAME=condojet
DB_USER=condojet
DB_PASSWORD=condojet
DB_HOST=localhost
DB_PORT=5432

# =========================
# API PYTHON
# =========================
API_APP_NAME=CondoJET API
API_APP_ENV=development
API_APP_PORT=8000
API_DATABASE_URL=postgresql+psycopg://condojet:condojet@localhost:5432/condojet
API_DATABASE_URL_DOCKER=postgresql+psycopg://condojet:condojet@host.docker.internal:5432/condojet
API_JWT_SECRET=change-me
API_JWT_EXPIRES_MINUTES=60
API_CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# =========================
# BACKEND BFF
# =========================
BFF_NODE_ENV=development
BFF_PORT=3000
BFF_API_PYTHON_BASE_URL=http://localhost:8000/api/v1
BFF_CORS_ORIGIN=http://localhost:5173
BFF_GLOBAL_API_KEY=change-me-global-key

# =========================
# FRONTEND WEB
# =========================
WEB_VITE_BACKEND_URL=http://localhost:3000/api/v1
```

## Como rodar (base)

1. Use `config/env/.env.example` como contrato base.
2. Crie o arquivo do ambiente desejado dentro de `config/env/` (ex.: `config/env/.env.dsv`).
3. Suba todos os serviços da stack com o script centralizado.

```bash
scripts/up_docker_stack.sh
```

Opcional: informar arquivo de ambiente customizado.

```bash
scripts/up_docker_stack.sh ./config/env/.env.dsv
```

## Estratégia de execução e testes (API Python)

1. `local`:
   - API: `scripts/start_api_local.sh`
   - Unitários: `scripts/setup_tests_env.sh` e `tests_env/scripts/run_api_python_unit.sh local`
   - Suíte completa: `tests_env/scripts/run_all_local_tests.sh local`
2. `docker`:
   - Stack de aplicação (api-python + backend + frontend): `scripts/up_docker_stack.sh`
   - Banco PostgreSQL: externo, administrado pelo admin (fora da stack Compose)
   - Health API: `scripts/wait_api_health.sh`
   - Unitários: `tests_env/scripts/run_api_python_unit.sh docker`
   - Suíte completa: `tests_env/scripts/run_all_local_tests.sh docker`

Toda a documentação de planejamento e arquitetura está concentrada em `plans/` (índice em `plans/INDEX_DOCUMENTACAO.md`).

## Pastas principais

- `database/ddl`: scripts SQL de criação de schema
- `api-python`: API principal da aplicação
- `backend`: BFF para integração com frontend
- `frontend`: aplicação web responsiva
- `plans`: documentos de planejamento (inclui plano de implementação)

## CI/CD (preparação)

- Estrutura pronta para pipeline com etapas: lint, testes, build, deploy.
- Próximo passo sugerido: adicionar workflow em `.github/workflows/ci.yml`.

# API Python (CondoJET)

API principal da solução CondoJET. Esta camada é a única autorizada a acessar o PostgreSQL.

## Stack
- Python 3.12+
- FastAPI
- SQLAlchemy
- Pydantic

## Estrutura
- `src/domain`: regras de domínio e contratos
- `src/application`: casos de uso e DTOs
- `src/infrastructure`: acesso a banco e configurações
- `src/interfaces/http`: controllers, rotas e middlewares
- `tests`: testes automatizados
- `../tests_env`: ambiente de testes DSV (pasta própria na raiz do projeto)

## Convenção de ambiente
- Esta camada consome variáveis `DB_*` e `API_*`.
- Ambiente DSV recomendado: `config/env/.env.dsv`.

## Execução da API (DSV)

### Modo local (desenvolvimento)
```bash
scripts/start_api_local.sh
```

### Modo Docker (execução próxima de produção)
```bash
scripts/recreate_api_python_container.sh
scripts/wait_api_health.sh
```

## Testes (DSV)

### Modo local (usa Python/venv no host)
```bash
scripts/setup_tests_env.sh
tests_env/scripts/run_api_python_unit.sh local
tests_env/scripts/run_all_local_tests.sh local
```

### Modo Docker (completo em container)
```bash
tests_env/scripts/run_api_python_unit.sh docker
tests_env/scripts/run_all_local_tests.sh docker
```

Observação: no modo Docker, os testes unitários usam `api-python/Dockerfile.test`.

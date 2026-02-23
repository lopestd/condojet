# Backend BFF (CondoJET)

Camada BFF para o frontend. Não acessa banco diretamente; integra apenas com a API Python.

## Stack
- Node.js 20+
- TypeScript
- Fastify
- Zod
- Pino
- Axios
- Vitest

## Convenção de ambiente
- Variáveis principais:
  - `BFF_NODE_ENV`
  - `BFF_PORT`
- `BFF_API_PYTHON_BASE_URL`
- `BFF_CORS_ORIGIN`
- `BFF_GLOBAL_API_KEY`
- Compatibilidade legada mantida com fallback:
  - `NODE_ENV`, `PORT`, `API_PYTHON_BASE_URL`, `CORS_ORIGIN`, `API_GLOBAL_API_KEY`

No startup, o backend sincroniza a `GLOBAL-API-KEY` na API Python (`/api/v1/internal/global-api-key/sync`) e usa essa chave em todas as chamadas backend -> API.

## Execução local
```bash
npm install
npm run dev
```

## Testes unitários/funcionais (Docker)
```bash
docker run --rm -v /home/lopes/2026_projetos/CondoJET:/workspace -w /workspace/backend node:20-alpine sh -lc "npm install --silent && npx vitest run"
```

## Build (Docker)
```bash
docker run --rm -v /home/lopes/2026_projetos/CondoJET:/workspace -w /workspace/backend node:20-alpine sh -lc "npm install --silent && npm run build"
```

## Bateria completa de integração (Backend consumindo API real em Docker)
```bash
tests_env/scripts/run_backend_bff_full_docker.sh
```

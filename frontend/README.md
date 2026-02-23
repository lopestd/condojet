# Frontend Web - CondoJET

Interface web com acesso por perfil:

1. `ADMIN_GLOBAL` (gestão SaaS).
2. `ADMIN` (gestão interna do condomínio).
3. `PORTEIRO` (operação de encomendas).
4. `MORADOR` (consulta de encomendas próprias).

## Stack

1. React 18 + TypeScript.
2. Vite.
3. React Router.
4. Axios.

## Ambiente

1. Variável obrigatória: `VITE_BACKEND_URL`.
2. Exemplo: `frontend/.env.example`.

## Execução local

```bash
npm install
npm run dev
```

## Validação

```bash
npm run build
npm run lint
```

## Rotas principais

1. `/login`
2. `/global`
3. `/condo/admin`
4. `/condo/operacao`
5. `/condo/minhas-encomendas`

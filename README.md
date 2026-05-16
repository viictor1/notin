# notin

Cofre pessoal de notas e arquivos. Acesso exclusivo via autenticação por senha com tokens JWT e refresh automático.

## Stack

- **API** — Cloudflare Workers + Hono + TypeScript
- **Banco** — Supabase (PostgreSQL + RLS)
- **Web** — React + Vite + Tailwind CSS
- **Auth** — JWT (access token em memória + refresh token via HttpOnly cookie)

## Estrutura
    notin/
    ├── apps/
    │   ├── api/       # REST API (Cloudflare Workers)
    │   └── web/       # Frontend (React)
    └── supabase/
        └── migrations/

## Funcionalidades

- Login por senha
- Criação, edição e exclusão de notas
- Dark mode
- Sessão persistente via refresh token
- Proteção contra XSS (tokens fora do localStorage)

## Desenvolvimento

### Pré-requisitos

- Node.js 24+
- Conta na Cloudflare
- Conta no Supabase

### API

```bash
cd apps/api
npm install
npm run dev
```

### Web

```bash
cd apps/web
npm install
npm run dev
```

### Testes

```bash
npm run test  # roda todos os testes
```

### Lint e formatação

```bash
npm run lint
npm run format
```

## Variáveis de ambiente

### API (`.dev.vars`)

| Variável | Descrição |
|---|---|
| `SUPABASE_URL` | URL do projeto Supabase |
| `SUPABASE_SERVICE_KEY` | Chave service_role do Supabase |
| `JWT_SECRET` | Secret para assinar os JWTs |
| `ENCRYPTION_KEY` | Chave para encriptação AES-256 (futuro) |
| `OWNER_ID` | UUID do usuário no Supabase |
| `OWNER_PASSWORD` | Senha de acesso ao app |

### Web (`.env.local`)

| Variável | Descrição |
|---|---|
| `VITE_API_URL` | URL da API |

## Deploy

```bash
npm run deploy:api   # deploy da API na Cloudflare
```

API e frontend são deployados automaticamente via GitHub Actions no push para `main`.

## Roadmap

- [ ] Upload de arquivos
- [ ] Whitelist de dispositivos
- [ ] App React Native
- [ ] Encriptação de dados sensíveis (AES-256)
# DevChat - Assistente Virtual IFSC

Chatbot institucional com **RAG (Retrieval-Augmented Generation)** para o Instituto de Física de São Carlos (IFSC-USP). O assistente responde perguntas sobre processos, bolsas, editais e documentos institucionais.

## Tecnologias

| Camada | Tecnologias |
|--------|-------------|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS 4, Framer Motion |
| **Backend** | Python 3.11, FastAPI, LangChain, ChromaDB |
| **LLM** | Mistral AI (`mistral-medium-latest`) |
| **Embeddings** | Mistral AI (`mistral-embed`) |
| **Busca Web** | DDGS (metabusca) |
| **Autenticação** | JWT (PyJWT) com senhas PBKDF2 (OAuth2 Password Flow) |
| **Containerização** | Docker + Docker Compose |

## Funcionalidades

- Chat interativo com perguntas e respostas em linguagem natural
- Base de conhecimento com ~150 PDFs institucionais (normas FAPESP, resoluções USP, guias IFSC, programas de bolsa)
- Recuperação híbrida (embeddings + BM25), com diversidade e fontes por página
- Busca web usada como fallback ou em perguntas que exigem informação atual
- Renderização de Markdown (código, tabelas, listas, links)
- Expansão de respostas longas, cópia e download em Markdown
- Autenticação JWT
- Proteção contra força bruta e abuso do chat, expiração de sessão e CORS restrito
- Markdown e links externos sanitizados
- Sugestões de perguntas e referências dos documentos
- Interface responsiva e animada com Tailwind CSS + Framer Motion

## Estrutura

```
├── backend/              # API FastAPI + RAG engine
│   ├── app/              # Código da aplicação (auth, rotas, RAG)
│   ├── data/             # PDFs e banco vetorial ChromaDB
│   └── ingest.py         # Script de ingestão de PDFs
├── src/                  # Frontend React
│   ├── components/       # Componentes (Auth, Chat, Message)
│   ├── context/          # Contexto de autenticação
│   └── styles/           # Estilos Tailwind
├── public/               # Assets estáticos
├── docker-compose.yml    # Orquestração dos serviços
├── compose.production.yml # Orquestração endurecida para produção
└── package.json          # Dependências e scripts
```

## Como Executar

### Desenvolvimento

```bash
# Frontend
npm install
npm run dev

# Backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Docker

```bash
# Ambiente de desenvolvimento com hot reload
docker compose up --build
```

O compose de desenvolvimento usa a etapa Node do frontend. A imagem final de
produção serve apenas arquivos estáticos com Nginx não privilegiado.

### Produção

Crie um usuário sem colocar a senha no histórico do shell:

```bash
install -d -m 700 secrets
(cd backend && python create_user.py admin --name "Administrador") > secrets/users.json
chmod 600 secrets/users.json
```

Configure `.env` com `APP_ENV=production`, uma `SECRET_KEY` aleatória,
`ALLOWED_HOSTS`, `ALLOWED_ORIGINS` (HTTPS) e `MISTRAL_API_KEY`. Em seguida:

```bash
docker compose -f compose.production.yml up --build -d
```

O frontend fica disponível na porta `8080` e encaminha `/api` internamente ao
backend, cuja porta não é publicada. Coloque um proxy TLS na frente desse
serviço em uma implantação pública.

### Scripts Disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento (porta 3000) |
| `npm run build` | Build de produção |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |
| `npm run type-check` | TypeScript type checking |
| `npm test` | Testes (Vitest) |
| `cd backend && python -m unittest discover -s tests` | Testes unitários do RAG |

### Atualizar a base de conhecimento

Depois de adicionar ou remover PDFs em `backend/data/pdfs`, reconstrua o índice:

```bash
cd backend
python ingest.py
```

A ingestão normaliza o texto, remove cabeçalhos e rodapés repetidos, gera IDs
determinísticos e só substitui a base anterior quando a nova estiver completa.
Reinicie a API depois da atualização para recarregar o índice híbrido.

## Ambiente

Copie `.env.example` para `.env`, gere uma chave JWT e configure a API Mistral AI:

```bash
cp .env.example .env
python3 -c "import secrets; print(secrets.token_urlsafe(48))"
```

Defina o valor gerado em `SECRET_KEY`. Em produção, configure também
`APP_ENV=production`, `ALLOWED_ORIGINS` com a origem HTTPS real,
`ALLOWED_HOSTS` com o host público e `AUTH_USERS_FILE` com os usuários. A API
recusa inicialização insegura ou sem usuários nesse ambiente.

Por padrão, `RAG_WEB_SEARCH_MODE=fallback`: a web só é consultada quando a
recuperação local tem baixa confiança ou a pergunta pede algo atual, vigente ou
com prazo. Use `off` para operar exclusivamente com os PDFs ou `always` para
manter o comportamento de busca em toda pergunta. Os demais limites e limiares
do RAG estão documentados em `.env.example`.

## Segurança

Não há credenciais predefinidas no código. Use `backend/create_user.py` para
gerar entradas PBKDF2 e forneça-as via `AUTH_USERS_FILE` (preferível) ou
`AUTH_USERS_JSON`. Consulte [SECURITY.md](SECURITY.md) para o checklist de
produção, comandos de auditoria e a análise dos avisos atuais do ChromaDB.

## Fluxo de branches

- `development`: integração e validação das mudanças.
- `production`: estado aprovado para implantação, promovido a partir de
  `development` por merge explícito.

## Licença

MIT

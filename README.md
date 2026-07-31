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
| **Autenticação** | JWT com senhas PBKDF2 (OAuth2 Password Flow) |
| **Containerização** | Docker + Docker Compose |

## Funcionalidades

- Chat interativo com perguntas e respostas em linguagem natural
- Base de conhecimento com ~150 PDFs institucionais (normas FAPESP, resoluções USP, guias IFSC, programas de bolsa)
- Recuperação híbrida (embeddings + BM25), com diversidade e fontes por página
- Busca web usada como fallback ou em perguntas que exigem informação atual
- Renderização de Markdown (código, tabelas, listas, links)
- Expansão de respostas longas, cópia e download em Markdown
- Autenticação JWT
- Proteção contra força bruta, expiração automática de sessão e CORS restrito
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
docker compose up --build
```

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
`APP_ENV=production`, `ALLOWED_ORIGINS` com o domínio HTTPS real e não use as
contas de demonstração.

Por padrão, `RAG_WEB_SEARCH_MODE=fallback`: a web só é consultada quando a
recuperação local tem baixa confiança ou a pergunta pede algo atual, vigente ou
com prazo. Use `off` para operar exclusivamente com os PDFs ou `always` para
manter o comportamento de busca em toda pergunta. Os demais limites e limiares
do RAG estão documentados em `.env.example`.

## Autenticação de demonstração

As contas abaixo existem somente para desenvolvimento. As senhas são armazenadas
como hashes PBKDF2 no código; substitua o módulo de usuários por um banco de dados
antes de publicar o serviço.

| Usuário | Senha |
|---------|-------|
| `admin` | `teste123` |
| `maria` | `bolsas2024` |

## Licença

MIT

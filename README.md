# DevChat - Assistente Virtual IFSC

Chatbot institucional com **RAG (Retrieval-Augmented Generation)** para o Instituto de Física de São Carlos (IFSC-USP). O assistente responde perguntas sobre processos, bolsas, editais e documentos institucionais.

## Tecnologias

| Camada | Tecnologias |
|--------|-------------|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS 4, Framer Motion |
| **Backend** | Python 3.11, FastAPI, LangChain, ChromaDB |
| **LLM** | Mistral AI (`mistral-medium-latest`) |
| **Embeddings** | Mistral AI (`mistral-embed`) |
| **Busca Web** | DuckDuckGo |
| **Autenticação** | JWT (OAuth2 Password Flow) |
| **Containerização** | Docker + Docker Compose |

## Funcionalidades

- Chat interativo com perguntas e respostas em linguagem natural
- Base de conhecimento com ~150 PDFs institucionais (normas FAPESP, resoluções USP, guias IFSC, programas de bolsa)
- Respostas combinam contexto do banco vetorial + busca web
- Renderização de Markdown (código, tabelas, listas, links)
- Expansão de respostas longas, cópia e download em Markdown
- Autenticação JWT
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

## Ambiente

Copie `.env.example` para `.env` e configure as chaves da API Mistral AI:

```env
MISTRAL_API_KEY=sua_chave_aqui
```

## Autenticação

Usuários padrão (em memória):

| Usuário | Senha |
|---------|-------|
| `admin` | `teste123` |
| `maria` | `bolsas2024` |

## Licença

MIT

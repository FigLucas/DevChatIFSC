# Política e notas de segurança

## Configuração obrigatória de produção

- Use uma `SECRET_KEY` aleatória com pelo menos 32 caracteres.
- Defina `APP_ENV=production`, `ALLOWED_HOSTS` e `ALLOWED_ORIGINS` com valores
  explícitos. Origens HTTP e curingas são recusados em produção.
- Monte `AUTH_USERS_FILE` como secret. Não mantenha senhas ou hashes no Git.
- Publique apenas o frontend/reverse proxy; a porta do backend e o diretório do
  Chroma não devem ficar acessíveis pela internet.
- Termine TLS em um proxy confiável e mantenha os cabeçalhos de segurança do
  arquivo `frontend/nginx.conf`.

## Auditoria de dependências

Execute periodicamente:

```bash
npm audit
pip-audit -r backend/requirements.txt
bandit -r backend -x backend/tests,backend/data
```

Enquanto a exceção do Chroma abaixo for válida, o comando que falha apenas para
novos avisos é:

```bash
pip-audit -r backend/requirements.txt \
  --ignore-vuln PYSEC-2026-311 \
  --ignore-vuln CVE-2026-45830 \
  --ignore-vuln CVE-2026-45831 \
  --ignore-vuln CVE-2026-45833
```

Em 2 de setembro de 2026, `chromadb==1.5.9` possui os avisos
`PYSEC-2026-311`, `CVE-2026-45830`, `CVE-2026-45831` e `CVE-2026-45833` sem
release corrigida no PyPI. Todos descrevem rotas e autorização da API servidor
do Chroma. O projeto instancia apenas `langchain_chroma.Chroma` em modo local,
com diretório persistente, e não inicia nem publica o servidor Chroma. Portanto,
essas rotas não fazem parte da superfície de ataque desta aplicação. A
mitigação deixa de ser válida se um serviço Chroma for adicionado ou exposto;
nesse caso, bloqueie a implantação até atualizar para uma versão corrigida.

O antigo `python-jose` foi substituído por `PyJWT`; isso remove a dependência
`python-ecdsa`, afetada por `PYSEC-2026-1325`.

## Credencial encontrada no histórico

A auditoria local encontrou um valor com formato de chave OpenAI em
`.env.example` nos commits `3277d15` e `82d4b33`. O valor não está na árvore
atual e não coincide com a variável homônima do `.env` local, mas deve ser
revogado no painel do provedor caso tenha sido uma chave real. Reescrever o
histórico só deve ocorrer depois de coordenar um force-push com todos os clones;
isso reduz a exposição acidental, mas não substitui a revogação.

## Relato de vulnerabilidades

Não abra uma issue pública com chaves, credenciais ou detalhes exploráveis.
Envie o relato diretamente ao mantenedor responsável pelo deployment.

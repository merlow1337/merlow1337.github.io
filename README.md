# Filipe Carneiro — currículo interativo com agente de IA

Currículo profissional em **React + TypeScript + Vite**, publicado no **GitHub Pages**: https://srcarneiro1.github.io/

## O que tem no site

| Recurso | O que faz |
|---|---|
| **Filipe.ai** | Agente que responde perguntas sobre a trajetória, com **fontes clicáveis** e a **execução visível** (intenção → plano → ferramentas → resposta). Também executa ações: navegar, exportar PDF/JSON, trocar tema, copiar e-mail. |
| **Copiloto do recrutador** | Cole uma vaga: o agente extrai os requisitos e mostra quais têm evidência em experiência, quais são só declarados e quais faltam. |
| **Grafo de competências** | Grafo de conhecimento gerado do currículo, ligando cada competência à experiência onde aparece. |
| **Terminal** | `help`, `ask <pergunta>`, `match <vaga>`, `stats`, `theme`, `pdf`, `json`… |
| **Modo leitura / modo agente** | Na primeira visita o recrutador escolhe se quer ler direto ou interagir. |
| **Conquistas + XP** | Gamificação leve (só no modo agente). |
| **PDF ATS** | Botão de impressão gera uma versão em texto puro, sem foto, legível por ATS. |
| **3 temas, PT/EN, mobile** | Escuro, Claro e Neon; bilíngue; respeita `prefers-reduced-motion`. |

### Como o agente funciona (sem API, sem chave)

Ele roda 100% no navegador: o currículo vira *chunks*, que entram num índice **BM25** com expansão de consulta por sinônimos PT/EN. Um roteador de intenções escolhe a ferramenta certa. É a etapa de *retrieval* de um RAG, sem a parte generativa: o agente não inventa nada, e nenhum dado ou chave fica exposto no front-end.

Código: `src/agent/` (`text.ts` conceitos e sinônimos · `knowledge.ts` índice BM25 · `agent.ts` roteador e ferramentas · `jobMatch.ts` copiloto).

## Atualizar a partir do LinkedIn

O LinkedIn não libera API de perfil para uso pessoal, e scraping viola os termos de uso. Por isso o site usa o **PDF que o próprio LinkedIn exporta** (perfil → *Recursos* → *Salvar como PDF*).

```
Profile.pdf ──importador──▶ src/data/linkedin.json  ─┐
                            (sem contato)             ├─▶ src/data/resume.ts ─▶ site, agente, JSON-LD e PDF ATS
             tradução ───▶ src/data/translations.json ┘
```

**O PDF nunca vai para o GitHub.** Duas formas de atualizar:

- **Com um assistente:** envie o PDF, o `linkedin.json` e o `translations.json` atuais e use a skill em `.github/skills/atualizar-curriculo-linkedin`. Suba só os 2 JSON devolvidos (*Add file → Upload files* em `src/data/`).
- **No computador:** `cp ~/Downloads/Profile.pdf linkedin/ && npm run linkedin:import && npm run check`, depois commit dos 2 JSON.

### De onde vem cada dado

| Arquivo | Conteúdo | Quem edita |
|---|---|---|
| `src/data/linkedin.json` | experiências, períodos, descrições, formação, idiomas, certificações e resumo (PT) | gerado pelo importador |
| `src/data/translations.json` | memória de tradução PT → EN (chave = texto exato do LinkedIn) | assistente ou você |
| `src/data/curriculum.ts` | e-mail, links, tags e área de cada experiência | manual, raramente |
| `src/data/extra.ts` | frases do topo, grupo "IA & segurança", cursos extras | manual |

Cargo atual, números do topo (anos de carreira, CDs, cargos na mesma empresa, pós-graduações), respostas do agente, JSON-LD e PDF ATS são **calculados** desses arquivos. Nada é escrito à mão em dois lugares.

## Validação automática

`npm run check` (e o GitHub Actions, em todo push) roda, nesta ordem:

1. **Privacidade** (`scripts/check-sensitive.mjs`): bloqueia PDF, Word, planilhas, chaves e `.env` versionados, imagens fora da lista permitida, telefone, CPF e e-mails não autorizados, tanto no repositório quanto no site gerado.
2. **Consistência** (`tests/data.test.ts`): o site tem exatamente as experiências, a ordem, as datas e os bullets do LinkedIn; o cargo atual é o mesmo no topo, no JSON-LD e no PDF; a versão EN tem a mesma estrutura da PT; o PDF ATS (PT e EN) contém todas as experiências, formações e idiomas; traduções pendentes viram aviso.
3. **Agente** (`tests/agent.test.ts`): cada pergunta cai na intenção certa, toda citação leva a uma seção existente, nunca aparece telefone e perguntas fora do currículo não são respondidas com invenção.
4. **Build** e nova varredura de privacidade em `dist/`.

Se algo falhar, o deploy não acontece e o site continua na última versão boa.

## Desenvolvimento

Requer Node.js 22+.

```bash
npm ci
npm run dev
npm run check   # privacidade + testes + build
```

O deploy (`.github/workflows/deploy.yml`) publica `dist/` a cada push na `main`. Em **Settings → Pages**, use **Source: GitHub Actions**.

## Privacidade e segurança

- Nenhum segredo, token ou chave de API no código ou no navegador.
- O importador **descarta a seção de contato** do PDF; o telefone nunca vai para o site.
- `linkedin/*.pdf` está no `.gitignore`, e o CI bloqueia o deploy se algum documento for versionado.
- Sem cookies, analytics ou coleta de dados. As preferências (tema, idioma, conquistas) ficam só no `localStorage` do visitante.

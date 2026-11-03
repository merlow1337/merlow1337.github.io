# Filipe Carneiro — currículo interativo com agente de IA

Currículo profissional em **React + TypeScript + Vite**, publicado no **GitHub Pages**: https://srcarneiro1.github.io/

## O que tem no site

| Recurso | O que faz |
|---|---|
| **Filipe.ai** | Agente que responde perguntas sobre a trajetória, com **fontes clicáveis** e a **execução visível** (intenção → plano → ferramentas → resposta). Também executa ações: navegar, exportar PDF/JSON, trocar tema, copiar e-mail. |
| **Copiloto do recrutador** | Cole uma vaga: o agente extrai os requisitos e mostra quais têm evidência em experiência, quais são só declarados e quais faltam. |
| **Grafo de competências** | Grafo de conhecimento gerado do currículo, ligando cada competência à experiência onde aparece. |
| **Terminal** | `help`, `ask <pergunta>`, `match <vaga>`, `stats`, `theme`, `pdf`, `json`… |
| **Leitura direta** | O currículo abre na hora; uma faixa discreta oferece o modo agente, sem bloquear a leitura. |
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

`npm run check` e o GitHub Actions (em todo push, pull request e toda segunda-feira) rodam:

| Etapa | O que garante |
|---|---|
| **Privacidade — arquivos** (`check:privacy`) | Nenhum PDF, Word, planilha, chave ou `.env` versionado; nenhuma imagem fora da lista; nenhum telefone, CPF ou e-mail não autorizado no repositório nem no site gerado. |
| **Privacidade — histórico** (`check:history`) | O mesmo em **todos os commits de todos os branches**. |
| **Dependências** (`audit`) | Vulnerabilidade alta ou crítica bloqueia. O Dependabot abre PRs semanais de atualização. |
| **Consistência** (`tests/data.test.ts`) | O site tem exatamente as experiências, ordem, datas e bullets do LinkedIn; cargo igual no topo, no JSON-LD e no PDF; EN com a mesma estrutura do PT; nenhum dado corporativo que deveria estar generalizado. |
| **Importador** (`tests/importer.test.ts`) | PDFs sintéticos (dados fictícios) no layout do LinkedIn: cargos repetidos na mesma empresa, quebra de página, perfil em inglês, cargo sem local, bullets quebrados, PDF sem formação, duplicados, PDF que não é do LinkedIn e descarte do contato. |
| **Agente e copiloto** (`tests/agent.test.ts`) | Intenção certa, citações que levam a seções reais, nunca telefone, sem invenção, termos fora do dicionário listados e fora da conta. |
| **Navegador** (`test:e2e`, Playwright) | Gera os **PDFs ATS reais (PT e EN)**, extrai o texto e confere seções, ordem dos cargos, datas, formações, contato, 1–3 páginas e ausência de texto da interface; desktop e celular sem rolagem horizontal e sem janela bloqueando; teclado (pular conteúdo, abrir e fechar o agente com foco correto); **axe-core WCAG 2.1 AA** nos 3 temas. |

Os PDFs, prints e relatórios de acessibilidade ficam no artefato **e2e-artifacts** de cada execução do workflow *Validate*, para inspeção visual.

Se algo falhar, o site não é publicado e continua na última versão boa. **Limite importante:** a falha do deploy não desfaz um commit público. Por isso a proteção acontece antes:

- **Hook de pre-commit** (ativado pelo `npm install`): bloqueia o commit local de documentos ou dados pessoais.
- **Pull request** para atualizações feitas por assistente (os testes rodam antes do merge).
- Uploads pelo site do GitHub não passam pelo hook. Se o seu plano tiver *Settings → Rules → Rulesets → Restrict file extensions*, bloqueie `.pdf`, `.docx`, `.xlsx` e `.csv` por lá também.

### Generalização de dados corporativos

`src/data/redactions.json` tem regras genéricas (regex) que trocam números internos de empresas por termos gerais, por exemplo "N depositantes" → "múltiplos depositantes". Elas valem no importador, no site e nos testes. Para generalizar outro tipo de dado, acrescente uma regra.

### PDF ATS

O PDF é gerado pela impressão do navegador (botão "PDF ATS"). As regras de tamanho ficam em `src/data/extra.ts`:

- `atsSummary`: o resumo no PDF usa o 1º parágrafo e os 2 últimos; o site mostra o resumo completo.
- `atsHighlights`: no cargo atual entram todos os bullets; desde 2022, 3 por cargo; nos anteriores, 2.

### Copiloto de vagas

O percentual é a **aderência aos requisitos reconhecidos** por um dicionário de conceitos (`src/agent/text.ts`). Evidência em experiência ou formação vale 1 ponto, competência só declarada vale 0,5 e sem evidência vale 0. O que o dicionário não reconhece aparece como "não avaliado" e fica fora da conta. É uma triagem indicativa: não é um ATS e não substitui a avaliação do recrutador.

## Desenvolvimento

Requer Node.js 22+.

```bash
npm ci
npm run dev
npm run check   # privacidade + testes + build + navegador
npm run check:history   # varre todo o histórico do Git
```

O deploy (`.github/workflows/deploy.yml`) publica `dist/` a cada push na `main`. Em **Settings → Pages**, use **Source: GitHub Actions**.

## Privacidade e segurança

- Nenhum segredo, token ou chave de API no código ou no navegador.
- O importador **descarta a seção de contato** do PDF; o telefone nunca vai para o site.
- `linkedin/*.pdf` está no `.gitignore`, e o CI bloqueia o deploy se algum documento for versionado.
- Sem cookies, analytics ou coleta de dados. As preferências (tema, idioma, conquistas) ficam só no `localStorage` do visitante.

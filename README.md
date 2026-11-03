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
linkedin/Profile.pdf  ──npm run linkedin:import──▶  src/data/linkedin.json  ──▶  site
                                                     (sem telefone/e-mail)
```

**Opção A, local (recomendada):** o PDF nunca sai do seu computador.

```bash
cp ~/Downloads/Profile.pdf linkedin/
npm run linkedin:import
npm run dev            # confira
git add src/data/linkedin.json
git commit -m "chore(data): atualiza LinkedIn"
git push
```

**Opção B, pelo GitHub:** *Add file → Upload files* → `linkedin/Profile.pdf`. O workflow *Import LinkedIn profile* converte o PDF, apaga o arquivo, faz o commit do JSON e dispara o deploy.
⚠️ O PDF contém telefone e e-mail e continua no histórico do Git mesmo depois de apagado. Como o repositório é público, prefira a opção A.

### De onde vem cada dado

- `src/data/linkedin.json` (gerado): experiências, descrições, períodos, formação, idiomas, certificações e resumo **em PT**. É a fonte da verdade.
- `src/data/curriculum.ts` (manual): **traduções EN**, tags, área de cada experiência, e-mail, links e o resumo em inglês. Quando você adicionar uma experiência nova no LinkedIn, ela aparece no site automaticamente (com tags inferidas); para ter a versão em inglês, adicione a entrada correspondente aqui.
- `src/data/extra.ts` (manual): frases do topo, grupo "IA & segurança" e cursos extras.
- `src/data/resume.ts`: junta tudo. Sem o `linkedin.json`, o site usa só o `curriculum.ts`.

## Desenvolvimento

Requer Node.js 22+.

```bash
npm ci
npm run dev
npm run build
```

O deploy (`.github/workflows/deploy.yml`) publica `dist/` a cada push na `main`. Em **Settings → Pages**, use **Source: GitHub Actions**.

## Privacidade e segurança

- Nenhum segredo, token ou chave de API no código ou no navegador.
- O importador **descarta a seção de contato** do PDF; o telefone nunca vai para o site.
- `linkedin/*.pdf` está no `.gitignore`.
- Sem cookies, analytics ou coleta de dados. As preferências (tema, idioma, conquistas) ficam só no `localStorage` do visitante.

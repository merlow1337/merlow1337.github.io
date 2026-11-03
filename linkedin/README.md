# linkedin/

**Não envie o PDF do LinkedIn para o GitHub.** Ele contém telefone e e-mail, e tudo o que entra no
repositório fica no histórico público para sempre, mesmo depois de apagado.
Se um PDF for enviado, o deploy é bloqueado pelo `check:privacy` e o site continua na versão anterior.

Como atualizar:

- **Com um assistente (Claude/ChatGPT):** envie o PDF + `src/data/linkedin.json` + `src/data/translations.json`
  e use a skill `.github/skills/atualizar-curriculo-linkedin` (ela aplica também as regras de `src/data/redactions.json`). Suba no GitHub só os 2 JSON que ele devolver.
- **No seu computador:** coloque o PDF aqui (esta pasta ignora PDFs no `.gitignore`), rode
  `npm run linkedin:import` e depois `npm run check`. O importador lista os textos sem tradução para o inglês.

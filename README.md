# Filipe Carneiro — Professional Portfolio

Bilingual professional portfolio built with **React, TypeScript and Vite**, hosted on **GitHub Pages**.

**Live website:** https://srcarneiro1.github.io/

## PT-BR

Este é o site pessoal de Filipe Carneiro, dedicado a desenvolvimento de software, análise de dados, automação de processos e governança da informação.

### Funcionalidades

- Interface responsiva com identidade visual dark/terminal.
- Alternância de idioma português / inglês.
- Terminal interativo com comandos seguros e predefinidos: `help`, `about`, `skills`, `projects`, `research`, `contact`, `clear`, `exit`.
- Projetos públicos selecionados e consulta opcional de estrelas pela API pública do GitHub.
- Seções de pesquisa e contato.
- Deploy automatizado com GitHub Actions.

### Desenvolvimento local

Requisitos: Node.js 22+ e npm.

```bash
npm install
npm run dev
npm run build
```

### Publicação

`.github/workflows/deploy.yml` compila e publica a pasta `dist/` no GitHub Pages sempre que há push em `main`. Em **Settings > Pages > Build and deployment**, configure **Source: GitHub Actions**.

### Privacidade e dados

- Não utiliza segredos ou tokens pessoais no navegador.
- A API do GitHub é consultada sem autenticação apenas para os dois repositórios selecionados.
- Não executa scraping do LinkedIn.
- Não contém dados de sistemas corporativos ou informações internas.
- As informações de currículo ainda deverão ser revisadas antes de publicação.
- O terminal não executa comandos reais: é uma interface de consulta aos textos publicados.

## EN

This repository contains Filipe Carneiro's bilingual professional portfolio.

The website is statically deployed through GitHub Actions and GitHub Pages. The browser reads only selected public GitHub repositories, and the interactive terminal runs a fixed set of local commands.

No LinkedIn scraping, AI API tokens, private information or corporate application data are included.

## Maintenance

Update project descriptions and the curated public repository list in `src/App.tsx`. All changes to `main` trigger a new deployment.

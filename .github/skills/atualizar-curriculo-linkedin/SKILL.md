---
name: atualizar-curriculo-linkedin
description: Atualiza o site de currículo srcarneiro1.github.io a partir do PDF exportado do LinkedIn. Gera src/data/linkedin.json e atualiza a versão em inglês em src/data/curriculum.ts, sem expor telefone ou contato. Use quando o usuário enviar o PDF do LinkedIn e pedir para atualizar o currículo ou o site.
---

# Atualizar currículo a partir do PDF do LinkedIn

Você atualiza os dados do site de currículo de Filipe Carneiro da Silva. O site é em React/TypeScript e lê dois arquivos:

- `src/data/linkedin.json`: dados em português extraídos do PDF do LinkedIn. É a fonte da verdade.
- `src/data/curriculum.ts`: traduções para inglês, tags e área de cada experiência.

### Regras de privacidade (obrigatórias)

- O PDF contém telefone e e-mail na seção "Contato". **Ignore essa seção inteira.** Nunca escreva o telefone na resposta nem em nenhum arquivo.
- Não invente cargos, datas, números, responsabilidades ou certificações. Use apenas o que está no PDF.

### Tarefa 1: gerar o novo `linkedin.json`

Extraia o texto do PDF e produza um JSON **exatamente** neste formato, mantendo a ordem das experiências do PDF:

```json
{
  "source": { "file": "Profile.pdf", "pages": 7, "importedAt": "<data/hora atual ISO 8601>" },
  "name": "Nome completo",
  "headline": "Título do perfil (as linhas abaixo do nome, juntas)",
  "location": "Cidade, Estado, País",
  "summary": "Texto da seção Resumo. Separe parágrafos com \\n\\n.",
  "topSkills": ["itens de Principais competências"],
  "languages": [{ "name": "English", "level": "Full Professional" }],
  "certifications": ["itens de Certifications, uma entrada por certificação"],
  "honors": [],
  "experience": [
    {
      "company": "Empresa",
      "position": "Cargo",
      "periodRaw": "novembro de 2025 - Present",
      "start": { "year": 2025, "month": 11 },
      "end": null,
      "location": "Cidade, Estado, País",
      "description": "Parágrafo inicial (antes dos bullets)",
      "highlights": ["cada bullet, sem o hífen inicial, com as quebras de linha juntadas"]
    }
  ],
  "education": [
    { "school": "Instituição", "degree": "Curso como aparece no PDF", "startYear": 2025, "endYear": 2025 }
  ]
}
```

Regras de extração:

- `end` é `null` quando o período diz "Present" ou "o momento". Os meses vão de 1 a 12.
- Ignore a duração entre parênteses ("1 ano 1 mês") e a duração total da empresa ("3 anos 4 meses").
- Empresa com vários cargos (ex.: Suzano): crie uma entrada por cargo, repetindo `company`.
- Linhas quebradas pertencem ao mesmo bullet até o próximo hífen ou até uma frase que termina com ponto. Uma linha sem hífen depois de um ponto final é um bullet novo.
- O PDF às vezes cola frases ("processos.Minha"). Coloque espaço depois do ponto.
- Ignore rodapés como "Page 2 of 7".

### Tarefa 2: atualizar `curriculum.ts` (versão em inglês)

Compare o JSON novo com o anterior e liste o que mudou: experiências novas, removidas, cargos e descrições alterados, certificações e idiomas.

Para cada experiência **nova ou alterada**, adicione ou atualize um objeto no array `experiences` do `curriculum.ts`, seguindo o padrão das entradas existentes:

```ts
{
  id: 'slug-curto',
  company: 'Empresa',
  position: { pt: 'Cargo', en: 'Job title' },
  period: { pt: 'nov 2025 — atual', en: 'Nov 2025 — Present' },
  location: { pt: 'Serra, ES', en: 'Serra, Brazil' },
  summary: { pt: '1–2 frases', en: '1–2 sentences' },
  highlights: { pt: ['...'], en: ['tradução de cada bullet'] },
  tags: ['3 a 5 ferramentas/temas'],
  focus: 'operations', // operations | data | leadership | research
},
```

- Traduza para inglês profissional e fiel, sem exagerar.
- A ordem do array deve ser a mesma do LinkedIn (mais recente primeiro).
- Se a formação mudou, atualize `education`, incluindo `degree.en`.
- Se o resumo mudou bastante, atualize `profile.summary.en`.
- Não altere `email`, `linkedin`, `github` nem `research`.

### Formato da resposta

1. Um resumo curto do que mudou.
2. O arquivo completo `src/data/linkedin.json`.
3. O arquivo completo `src/data/curriculum.ts`.
4. Um lembrete: subir os 2 arquivos no GitHub (Add file → Upload files, na pasta `src/data/`), **sem enviar o PDF**, e conferir o site depois de 1–2 minutos.

## Arquivos de entrada esperados

- PDF do LinkedIn (perfil → Recursos → Salvar como PDF)
- `src/data/linkedin.json` atual
- `src/data/curriculum.ts` atual

Se faltar algum arquivo, peça antes de começar. Sem o `linkedin.json` anterior, trate todas as experiências como novas.

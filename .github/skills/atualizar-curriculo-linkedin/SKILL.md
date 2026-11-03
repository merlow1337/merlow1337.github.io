---
name: atualizar-curriculo-linkedin
description: Atualiza o site de currículo srcarneiro1.github.io a partir do PDF exportado do LinkedIn. Gera src/data/linkedin.json e completa a memória de tradução src/data/translations.json, sem expor telefone ou contato. Use quando o usuário enviar o PDF do LinkedIn e pedir para atualizar o currículo ou o site.
---

# Atualizar currículo a partir do PDF do LinkedIn

Você atualiza os dados do site de currículo de Filipe Carneiro da Silva. O site é em React/TypeScript e lê estes arquivos:

- `src/data/linkedin.json`: dados em português extraídos do PDF do LinkedIn. É a fonte da verdade.
- `src/data/translations.json`: memória de tradução PT → EN (chave = texto exato do LinkedIn).
- `src/data/curriculum.ts`: tags, área de cada experiência, e-mail e links (não precisa mexer na maioria das atualizações).

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
  "summary": "Texto da seção Resumo. Separe parágrafos com \n\n.",
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

### Tarefa 2: completar `translations.json` (versão em inglês)

O site traduz por memória: `src/data/translations.json` tem `{ "entries": { "<texto PT exato do linkedin.json>": "<tradução EN>" } }`.

- Para cada texto do novo `linkedin.json` que **não** existe como chave em `entries` (cada parágrafo do `summary` separado por `\n\n`, o `headline`, e de cada experiência o `position`, o `description` e cada item de `highlights`, mais cada `degree` da formação), adicione a entrada com a tradução.
- A chave precisa ser **idêntica, caractere por caractere**, ao texto do JSON. Se mudar uma vírgula, a tradução não é encontrada.
- Traduza para inglês profissional e fiel, sem inventar responsabilidades ou números.
- Mantenha as entradas existentes. Pode remover as que não correspondem mais a nenhum texto.
- `curriculum.ts` só muda se houver experiência **nova** e você quiser definir `tags` e `focus` (sem isso, o site infere automaticamente).

### Formato da resposta

1. Um resumo curto do que mudou.
2. O arquivo completo `src/data/linkedin.json`.
3. O arquivo completo `src/data/translations.json`.
4. Se você gravou no repositório: o link do pull request. Senão, um lembrete: subir os 2 arquivos no GitHub (Add file → Upload files, na pasta `src/data/`), **sem enviar o PDF**. O GitHub roda os testes: se algo estiver inconsistente ou com dado pessoal, o deploy é bloqueado e o site continua na versão anterior. Confira a aba **Actions**; avisos de "Tradução pendente" indicam textos que faltou traduzir.

## Arquivos de entrada esperados

- PDF do LinkedIn (perfil → Recursos → Salvar como PDF), sempre anexado pelo usuário na conversa
- `src/data/linkedin.json` atual
- `src/data/translations.json` atual

### Onde buscar os dois JSON

1. **Se você tiver acesso ao repositório `srcarneiro1/srcarneiro1.github.io`:** leia `src/data/linkedin.json` e `src/data/translations.json` direto da branch `main`. Antes de começar, informe o valor de `source.importedAt` que você leu, para o usuário confirmar que é a versão atual.
2. **Se não tiver acesso:** peça os dois arquivos antes de começar.

Sem o `linkedin.json` anterior, trate todas as experiências como novas.

### Se você puder gravar no repositório

- Entregue por **pull request** numa branch nova (ex.: `chore/linkedin-AAAA-MM-DD`), **nunca direto na `main`**. Assim os testes de privacidade e consistência rodam antes do merge.
- O pull request altera **somente** `src/data/linkedin.json` e `src/data/translations.json`.
- Não faça o merge: o usuário aprova depois de ver os testes verdes.
- **Nunca adicione o PDF ao repositório**, em nenhuma pasta, branch ou commit.
Nunca peça nem aceite que o PDF seja enviado ao GitHub.

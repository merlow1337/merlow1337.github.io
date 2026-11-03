// Filipe.ai — agente local que responde perguntas sobre o currículo.
// Arquitetura: roteador de intenções → plano → ferramentas (busca BM25, job match, ações na página) → resposta com citações.
// Não usa LLM nem API externa: nenhuma chave, nenhum dado enviado. Tudo é determinístico e auditável.
import { profile, experiences, education, allSkills as skills, research, courses, languages, dataSource, firstYear, longestCompany, postgrads, type Lang } from '../data/resume'
import { search, indexStats } from './knowledge'
import { matchJob, evidenceFor, type Evidence, type MatchResult } from './jobMatch'
import { normalize, conceptsIn, conceptById } from './text'

export type TraceStep = { kind: 'intent' | 'plan' | 'tool' | 'observe' | 'answer'; label: string }
export type AgentAction =
  | { type: 'scroll'; target: string }
  | { type: 'pdf' }
  | { type: 'json' }
  | { type: 'theme'; theme: 'midnight' | 'light' | 'neon' }
  | { type: 'copy'; value: string }
export type AgentReply = {
  text: string
  trace: TraceStep[]
  citations: Evidence[]
  actions: AgentAction[]
  suggestions: string[]
  match?: MatchResult
}

type Intent =
  | 'greet' | 'help' | 'agent' | 'contact' | 'pdf' | 'json' | 'theme' | 'current' | 'years' | 'career'
  | 'education' | 'updated' | 'skills' | 'ai' | 'research' | 'match' | 'languages' | 'courses' | 'skillcheck' | 'search'

const rules: { intent: Intent; pattern: RegExp }[] = [
  { intent: 'agent', pattern: /\b(como (voce|vc|isso|esse agente) funciona|voce e (uma )?ia|quem e voce|o que e voce|chatgpt|gpt|llm|how do you work|who are you|are you (an )?ai|rag|bm25)\b/ },
  { intent: 'greet', pattern: /^(oi|ola|ola+|hey|hello|hi|bom dia|boa tarde|boa noite|e ai|salve)\b/ },
  { intent: 'help', pattern: /\b(ajuda|help|o que (voce )?(pode|sabe) fazer|what can you do|comandos|commands)\b/ },
  { intent: 'match', pattern: /\b(vaga|job description|descricao da vaga|aderencia|fit|match|combina com|requisitos)\b/ },
  { intent: 'pdf', pattern: /\b(pdf|imprimir|print|baixar curriculo|download (cv|resume)|ats)\b/ },
  { intent: 'json', pattern: /\b(json|dados brutos|raw data)\b/ },
  { intent: 'theme', pattern: /\b(tema|theme|modo (claro|escuro|neon)|dark mode|light mode|neon)\b/ },
  { intent: 'contact', pattern: /\b(contato|contatar|email|e mail|linkedin|github|falar com|entrar em contato|contact|reach|telefone|phone)\b/ },
  { intent: 'years', pattern: /\b(quantos anos|tempo de experiencia|anos de experiencia|years of experience|how long|ha quanto tempo)\b/ },
  { intent: 'current', pattern: /\b(atual|atualmente|hoje|agora|onde (ele )?trabalha|cargo atual|current(ly)?|where does he work|now)\b/ },
  { intent: 'languages', pattern: /\b(idiomas?|ingles|espanhol|languages?|english|spanish)\b/ },
  { intent: 'updated', pattern: /\b(atualizad[oa]|ultima atualizacao|last updated|updated)\b/ },
  { intent: 'courses', pattern: /\b(cursos?|certificac(ao|oes)|certificados?|courses?|certifications?)\b/ },
  { intent: 'ai', pattern: /\b(inteligencia artificial|ia|ai|machine learning|agentes?|agents?|automac(ao|oes)|automation|genai)\b/ },
  { intent: 'research', pattern: /\b(pesquisa|research|cnpq|iniciacao cientifica|artigo|gephi|apees)\b/ },
  { intent: 'education', pattern: /\b(formacao|faculdade|graduacao|pos graduacao|pos|universidade|estudou|education|degree|university|studied)\b/ },
  { intent: 'skills', pattern: /\b(skills?|competencias?|habilidades?|stack|tecnologias|ferramentas|tools|technologies|sabe fazer)\b/ },
  { intent: 'career', pattern: /\b(experiencias?|trajetoria|carreira|empresas|historico|career|experience|companies|resumo|perfil|summary|profile)\b/ },
]


const t = {
  pt: {
    suggestions: ['O que ele faz hoje?', 'Ele sabe Power BI e SQL?', 'Qual a experiência com IA?', 'Como você funciona?'],
    noResult: 'Não encontrei isso no currículo. Tente perguntar sobre experiências, ferramentas (ex.: SAP, Python), formação ou cole uma descrição de vaga para eu avaliar a aderência.',
  },
  en: {
    suggestions: ['What does he do now?', 'Does he know Power BI and SQL?', 'What is his AI background?', 'How do you work?'],
    noResult: "I couldn't find that in the resume. Try asking about experience, tools (e.g. SAP, Python), education, or paste a job description so I can assess the fit.",
  },
}

function detectIntent(query: string, raw: string): { intent: Intent; rule: string } {
  if (raw.length > 160) return { intent: 'match', rule: 'texto longo → descrição de vaga' }
  const specific = conceptsIn(raw).filter(id => !['data', 'process', 'planning', 'ai', 'english'].includes(id))
  for (const rule of rules) {
    if (!rule.pattern.test(query)) continue
    // "experiência com WMS" → verificar a ferramenta, não listar a carreira inteira
    if (specific.length && ['career', 'skills', 'search'].includes(rule.intent)) break
    return { intent: rule.intent, rule: rule.pattern.source.slice(0, 42) + '…' }
  }
  if (specific.length) return { intent: 'skillcheck', rule: 'conceitos: ' + specific.join(', ') }
  return { intent: 'search', rule: 'fallback → busca semântica' }
}

const companiesSummary = (lang: Lang) => {
  const groups: { company: string; roles: number; from: string; to: string }[] = []
  for (const exp of experiences) {
    const last = groups[groups.length - 1]
    const [start, end] = exp.period[lang].split('—').map(part => part.trim())
    if (last && last.company === exp.company) { last.roles++; last.from = start }
    else groups.push({ company: exp.company, roles: 1, from: start, to: end })
  }
  return groups
}

export function runAgent(input: string, lang: Lang): AgentReply {
  const raw = input.trim()
  const query = normalize(raw)
  const L = lang === 'pt'
  const trace: TraceStep[] = []
  const citations: Evidence[] = []
  const actions: AgentAction[] = []
  let match: MatchResult | undefined
  let text = ''

  const { intent, rule } = detectIntent(query, raw)
  trace.push({ kind: 'intent', label: `intent = ${intent}  ·  ${rule}` })

  const plan = (steps: string) => trace.push({ kind: 'plan', label: steps })
  const tool = (call: string) => trace.push({ kind: 'tool', label: call })
  const observe = (result: string) => trace.push({ kind: 'observe', label: result })

  switch (intent) {
    case 'greet':
    case 'help': {
      plan(L ? 'apresentar capacidades do agente' : 'present agent capabilities')
      text = L
        ? `Olá! Eu sou o **Filipe.ai**, um agente que responde sobre a trajetória do Filipe usando somente os dados publicados neste site.\n\nPosso:\n• responder perguntas sobre experiências, ferramentas e formação\n• avaliar a aderência a uma vaga (cole a descrição aqui)\n• navegar pela página, exportar o PDF ATS ou trocar o tema\n\nTodas as respostas vêm com fontes clicáveis.`
        : `Hi! I'm **Filipe.ai**, an agent that answers questions about Filipe's career using only the data published on this site.\n\nI can:\n• answer questions about experience, tools and education\n• assess fit for a job (paste the description here)\n• navigate the page, export the ATS PDF or switch themes\n\nEvery answer comes with clickable sources.`
      break
    }
    case 'agent': {
      plan(L ? 'explicar arquitetura do agente' : 'explain agent architecture')
      tool(`index.stats()`)
      observe(`${indexStats.chunks} chunks · ${indexStats.vocabulary} termos · ${indexStats.tokens} tokens`)
      text = L
        ? `Sou um agente **100% local**, rodando no seu navegador — sem LLM, sem API e sem chave nenhuma.\n\nComo funciono:\n• **Ingestão:** o currículo é dividido em ${indexStats.chunks} trechos (chunks)\n• **Indexação:** cada trecho entra num índice BM25 com ${indexStats.vocabulary} termos\n• **Roteamento:** identifico a intenção da pergunta\n• **Ferramentas:** busco evidências, comparo com vagas ou executo ações na página\n• **Resposta:** monto o texto citando as fontes, para você conferir\n\nÉ a mesma lógica de um RAG (retrieval-augmented generation), só que sem a parte generativa: nada é inventado. Abra "Execução" abaixo das respostas para ver cada passo.`
        : `I'm a **100% local** agent running in your browser — no LLM, no API, no keys.\n\nHow I work:\n• **Ingestion:** the resume is split into ${indexStats.chunks} chunks\n• **Indexing:** each chunk goes into a BM25 index with ${indexStats.vocabulary} terms\n• **Routing:** I detect the intent of your question\n• **Tools:** I retrieve evidence, compare with job descriptions or act on the page\n• **Answer:** I compose the text citing sources so you can verify\n\nIt's the same logic as RAG (retrieval-augmented generation), minus the generative part: nothing is made up. Open "Trace" under each answer to see every step.`
      citations.push({ title: L ? 'Como o agente funciona' : 'How the agent works', target: 'agente' })
      break
    }
    case 'contact': {
      plan(L ? 'recuperar dados de contato públicos' : 'retrieve public contact info')
      tool(`get_contact()`)
      observe('email, linkedin, github')
      text = L
        ? `Você pode falar com o Filipe por:\n• **E-mail:** ${profile.email}\n• **LinkedIn:** ${profile.linkedin}\n• **GitHub:** ${profile.github}\n\nCopiei o e-mail para a sua área de transferência.`
        : `You can reach Filipe via:\n• **Email:** ${profile.email}\n• **LinkedIn:** ${profile.linkedin}\n• **GitHub:** ${profile.github}\n\nI copied the email to your clipboard.`
      actions.push({ type: 'copy', value: profile.email })
      citations.push({ title: L ? 'Contato' : 'Contact', target: 'contato' })
      break
    }
    case 'pdf': {
      plan(L ? 'gerar versão ATS e abrir impressão' : 'render ATS version and open print dialog')
      tool('export_pdf({ format: "ATS", photo: false })')
      text = L
        ? 'Abrindo a janela de impressão com a versão ATS (texto puro, sem foto e sem elementos visuais). Escolha **Salvar como PDF**.'
        : 'Opening the print dialog with the ATS version (plain text, no photo or visuals). Choose **Save as PDF**.'
      actions.push({ type: 'pdf' })
      break
    }
    case 'json': {
      plan(L ? 'serializar o currículo em JSON' : 'serialize resume as JSON')
      tool('export_json()')
      text = L ? 'Baixando o currículo em JSON — útil para integrar com ATS ou outras ferramentas.' : 'Downloading the resume as JSON — handy for ATS or other tools.'
      actions.push({ type: 'json' })
      break
    }
    case 'theme': {
      const theme = /claro|light/.test(query) ? 'light' : /neon/.test(query) ? 'neon' : 'midnight'
      plan(L ? 'alterar tema da interface' : 'change UI theme')
      tool(`set_theme("${theme}")`)
      text = L ? `Tema alterado para **${theme === 'light' ? 'Claro' : theme === 'neon' ? 'Neon' : 'Escuro'}**.` : `Theme switched to **${theme === 'light' ? 'Light' : theme === 'neon' ? 'Neon' : 'Dark'}**.`
      actions.push({ type: 'theme', theme })
      break
    }
    case 'current': {
      const exp = experiences[0]
      plan(L ? 'buscar posição mais recente' : 'fetch most recent position')
      tool(`get_experience({ order: "desc", limit: 1 })`)
      observe(`${exp.company} · ${exp.period[lang]}`)
      text = `${L ? 'Atualmente o Filipe é' : 'Filipe currently works as'} **${exp.position[lang]}** ${L ? 'na' : 'at'} **${exp.company}** (${exp.period[lang]}, ${exp.location[lang]}).\n\n${exp.summary[lang]}\n\n${exp.highlights[lang].slice(0, 3).map(item => '• ' + item).join('\n')}`
      citations.push({ title: exp.position[lang] + ' · ' + exp.company, target: 'exp-' + exp.id })
      actions.push({ type: 'scroll', target: 'exp-' + exp.id })
      break
    }
    case 'years': {
      const years = new Date().getFullYear() - firstYear
      plan(L ? 'calcular tempo de carreira a partir dos períodos' : 'compute career length from periods')
      tool(`compute_tenure(experiences)`)
      observe(`${L ? 'primeiro registro' : 'first record'}: ${firstYear}`)
      const tenure = longestCompany()
      const tenureYears = Math.floor(tenure.months / 12)
      const extraPt = tenure.roles > 1 ? ` — incluindo ${tenureYears >= 1 ? 'mais de ' + tenureYears + (tenureYears > 1 ? ' anos' : ' ano') : tenure.months + ' meses'} na ${tenure.company}, em ${tenure.roles} cargos com progressão` : ''
      const extraEn = tenure.roles > 1 ? ` — including ${tenureYears >= 1 ? 'over ' + tenureYears + (tenureYears > 1 ? ' years' : ' year') : tenure.months + ' months'} at ${tenure.company}, across ${tenure.roles} roles with steady progression` : ''
      observe(`${tenure.company}: ${tenure.roles} roles, ${tenure.months} months`)
      text = L
        ? `O Filipe tem cerca de **${years} anos de experiência profissional**, desde ${firstYear}, passando por ${companiesSummary(lang).length} organizações${extraPt}.`
        : `Filipe has about **${years} years of professional experience**, since ${firstYear}, across ${companiesSummary(lang).length} organizations${extraEn}.`
      citations.push({ title: L ? 'Trajetória' : 'Career', target: 'experiencia' })
      break
    }
    case 'career': {
      const groups = companiesSummary(lang)
      plan(L ? 'agrupar experiências por empresa' : 'group experience by company')
      tool(`list_experience({ group_by: "company" })`)
      observe(`${experiences.length} ${L ? 'posições' : 'positions'} · ${groups.length} ${L ? 'organizações' : 'organizations'}`)
      text = `${L ? 'Resumo da trajetória' : 'Career summary'}:\n\n${groups
        .map(group => `• **${group.company}** — ${group.from} → ${group.to}${group.roles > 1 ? ` (${group.roles} ${L ? 'cargos' : 'roles'})` : ''}`)
        .join('\n')}\n\n${profile.summary[lang]}`
      citations.push({ title: L ? 'Experiência profissional' : 'Work experience', target: 'experiencia' })
      actions.push({ type: 'scroll', target: 'experiencia' })
      break
    }
    case 'education': {
      plan(L ? 'listar formação acadêmica' : 'list education')
      tool('list_education()')
      observe(`${education.length} ${L ? 'registros' : 'records'}`)
      text = `${L ? 'Formação' : 'Education'}:\n\n${education.map(ed => `• **${ed.degree[lang]}** — ${ed.school} (${ed.period})`).join('\n')}`
      citations.push({ title: L ? 'Formação acadêmica' : 'Education', target: 'formacao' })
      actions.push({ type: 'scroll', target: 'formacao' })
      break
    }
    case 'skills': {
      plan(L ? 'listar competências por área' : 'list skills by area')
      tool('list_skills()')
      observe(`${skills.reduce((sum, group) => sum + group.items.length, 0)} skills · ${skills.length} ${L ? 'áreas' : 'areas'}`)
      text = skills.map(group => `**${group.name[lang]}:** ${group.items.join(', ')}`).join('\n\n')
      text += L ? '\n\nDica: veja o **grafo de competências** para saber onde cada uma foi aplicada.' : '\n\nTip: check the **skills graph** to see where each one was applied.'
      citations.push({ title: L ? 'Grafo de competências' : 'Skills graph', target: 'competencias' })
      actions.push({ type: 'scroll', target: 'competencias' })
      break
    }
    case 'ai': {
      plan(L ? 'buscar evidências de IA e automação' : 'retrieve AI & automation evidence')
      tool('evidence_for(["ai", "automation", "security"])')
      const ev = [...evidenceFor('ai', lang), ...evidenceFor('automation', lang), ...evidenceFor('security', lang)]
      observe(`${ev.length} ${L ? 'evidências' : 'pieces of evidence'}`)
      // tudo vem dos dados: pós-graduações e experiências que citam IA/automação
      const studies = postgrads().map(ed => `• **${ed.degree[lang]}** (${ed.school}, ${ed.period})`)
      const work = ev.filter(item => item.kind === 'experience').slice(0, 2).map(item => `• ${L ? 'Automação e dados em' : 'Automation and data at'} **${item.title}**`)
      text = [
        L ? 'IA e automação na trajetória do Filipe:' : "AI and automation in Filipe's career:",
        [...studies, ...work, L ? '• Este site: um agente local com recuperação de informação (BM25), roteamento de intenções e uso de ferramentas.' : '• This site: a local agent with information retrieval (BM25), intent routing and tool use.'].join('\n'),
      ].join('\n\n')
      citations.push(...ev.filter((item, i, all) => all.findIndex(other => other.title === item.title) === i).slice(0, 3))
      citations.push({ title: L ? 'Arquitetura do agente' : 'Agent architecture', target: 'agente' })
      break
    }
    case 'research': {
      plan(L ? 'recuperar pesquisa científica' : 'retrieve scientific research')
      tool('get_research()')
      const researchExp = experiences.find(exp => exp.focus === 'research')
      text = `**${research.name}**\n\n${research.description[lang]}` + (researchExp ? `\n\n**${researchExp.position[lang]}** — ${researchExp.company} (${researchExp.period[lang]})\n\n${researchExp.summary[lang]}` : '')
      citations.push({ title: L ? 'Pesquisa científica' : 'Scientific research', target: 'pesquisa' })
      actions.push({ type: 'scroll', target: 'pesquisa' })
      break
    }
    case 'languages': {
      plan(L ? 'listar idiomas' : 'list languages')
      tool('list_languages()')
      text = `${L ? 'Idiomas' : 'Languages'}:\n\n${languages.map(item => `• **${item.name[lang]}** — ${item.level[lang]}`).join('\n')}`
      break
    }
    case 'updated': {
      plan(L ? 'consultar origem e data dos dados' : 'check data source and date')
      tool('data_source()')
      observe(dataSource.from)
      text = dataSource.importedAt
        ? (L ? `Os dados vêm do PDF exportado do LinkedIn, importado em **${new Date(dataSource.importedAt).toLocaleDateString('pt-BR')}** e convertido automaticamente em JSON (sem dados de contato).` : `The data comes from the LinkedIn PDF export, imported on **${new Date(dataSource.importedAt).toLocaleDateString('en-US')}** and converted to JSON automatically (contact data excluded).`)
        : (L ? 'Os dados vêm do arquivo curriculum.ts, mantido manualmente.' : 'The data comes from curriculum.ts, maintained by hand.')
      break
    }
    case 'courses': {
      plan(L ? 'listar cursos e certificações' : 'list courses and certifications')
      tool('list_courses()')
      observe(`${courses.length} ${L ? 'registros' : 'records'}`)
      text = courses.length
        ? courses.map(course => `• **${course.name}**${[course.issuer, course.year].filter(Boolean).length ? ' — ' + [course.issuer, course.year].filter(Boolean).join(', ') : ''}`).join('\n')
        : L ? 'Ainda não há cursos cadastrados neste site. As pós-graduações estão na seção de formação.' : 'No courses listed on this site yet. Postgraduate studies are listed under education.'
      citations.push({ title: L ? 'Formação acadêmica' : 'Education', target: 'formacao' })
      break
    }
    case 'match': {
      plan(L ? 'extrair requisitos → cruzar com evidências → pontuar' : 'extract requirements → cross-check evidence → score')
      tool(`match_job(text[${raw.length} chars])`)
      const result = matchJob(raw, lang)
      if (!result) {
        observe(L ? '0 requisitos reconhecidos' : '0 recognized requirements')
        text = L
          ? 'Cole aqui a descrição completa da vaga (requisitos, ferramentas, responsabilidades) e eu calculo a aderência com base nas evidências do currículo.'
          : 'Paste the full job description here (requirements, tools, responsibilities) and I will compute the fit based on resume evidence.'
        break
      }
      match = result
      observe(`${result.matched.length}/${result.required} ${L ? 'requisitos com evidência' : 'requirements with evidence'} → ${result.score}%`)
      text = L ? `Analisei a vaga: reconheci **${result.required} requisitos** e cruzei cada um com as evidências do currículo.` : `I analyzed the job: found **${result.required} requirements** and cross-checked each one against the resume.`
      citations.push(...result.matched.flatMap(item => item.evidence.slice(0, 1)).filter((item, i, all) => all.findIndex(other => other.target === item.target) === i).slice(0, 4))
      break
    }
    case 'skillcheck': {
      let ids = conceptsIn(raw).filter(id => !['data', 'process', 'planning'].includes(id))
      if (ids.includes('powerbi')) ids = ids.filter(id => id !== 'bi')
      ids = ids.slice(0, 5)
      plan(L ? `verificar evidências para ${ids.length} conceito(s)` : `check evidence for ${ids.length} concept(s)`)
      const lines: string[] = []
      for (const id of ids) {
        tool(`evidence_for("${id}")`)
        const ev = evidenceFor(id, lang, 2)
        observe(`${id}: ${ev.length} ${L ? 'fonte(s)' : 'source(s)'}`)
        const label = conceptById(id)!.label[lang]
        lines.push(ev.length ? `✓ **${label}** — ${ev.map(item => item.title).join('; ')}` : `○ **${label}** — ${L ? 'não aparece no currículo' : 'not listed in the resume'}`)
        citations.push(...ev.slice(0, 1))
      }
      text = lines.join('\n')
      break
    }
    default: {
      plan(L ? 'busca semântica com expansão de consulta' : 'semantic search with query expansion')
      tool(`search_index("${raw.slice(0, 40)}", k=3)`)
      const hits = search(raw)
      observe(hits.length ? hits.map(hit => `${hit.chunk.id}:${hit.score.toFixed(2)}`).join('  ') : '0 hits')
      if (!hits.length) { text = t[lang].noResult; break }
      text = (L ? 'Encontrei isto no currículo:' : 'Here is what I found in the resume:') + '\n\n' +
        hits.map(hit => { const s = (hit.chunk.snippet ?? hit.chunk.text)[lang]; return `• **${hit.chunk.title[lang]}** — ${s.length > 220 ? s.slice(0, 217).replace(/\s+\S*$/, '') + '…' : s}` }).join('\n')
      citations.push(...hits.map(hit => ({ title: hit.chunk.title[lang], target: hit.chunk.target })))
    }
  }

  const unique = citations.filter((cite, i) => citations.findIndex(other => other.target === cite.target) === i)
  citations.splice(0, citations.length, ...unique)
  trace.push({ kind: 'answer', label: `${L ? 'resposta' : 'answer'} · ${citations.length} ${L ? 'fonte(s)' : 'source(s)'} · ${actions.length} ${L ? 'ação(ões)' : 'action(s)'}` })
  return { text, trace, citations, actions, match, suggestions: t[lang].suggestions }
}

export const agentSuggestions = (lang: Lang) => t[lang].suggestions

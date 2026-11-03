// Parser do PDF exportado pelo LinkedIn ("Salvar como PDF").
// Separado da linha de comando para poder ser testado com PDFs sintéticos (tests/importer.test.ts).
//
// Privacidade: a seção de CONTATO é descartada; telefone, e-mail e URLs nunca entram no resultado.
import { readFileSync } from 'node:fs'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'

// ---------- 1. extração de linhas com tamanho de fonte e posição ----------
export async function extractLines(bytes) {
  const doc = await getDocument({ data: new Uint8Array(bytes), useSystemFonts: true, verbosity: 0 }).promise
  const lines = []
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p)
    const { items } = await page.getTextContent()
    const rows = new Map()
    for (const item of items) {
      if (!item.str || !item.str.trim()) continue
      const x = item.transform[4]
      const y = Math.round(item.transform[5])
      const column = x < 200 ? 'side' : 'main'
      const key = `${column}:${y}`
      const row = rows.get(key) ?? { page: p, column, y, x, size: Math.round(item.height * 10) / 10, parts: [] }
      row.parts.push({ x, str: item.str })
      row.x = Math.min(row.x, x)
      row.size = Math.max(row.size, Math.round(item.height * 10) / 10)
      rows.set(key, row)
    }
    const pageLines = [...rows.values()]
      .map(row => ({ ...row, text: row.parts.sort((a, b) => a.x - b.x).map(part => part.str).join(' ').replace(/\s+/g, ' ').trim() }))
      .filter(row => !/^Page \d+ of \d+$|^Página \d+ de \d+$/i.test(row.text) && row.size > 9.2)
    // sidebar primeiro, depois coluna principal; cada uma de cima para baixo
    pageLines.sort((a, b) => (a.column === b.column ? b.y - a.y : a.column === 'side' ? -1 : 1))
    lines.push(...pageLines)
  }
  return { lines, pages: doc.numPages }
}

// ---------- 2. utilitários ----------
const SIDE_SECTIONS = {
  contact: /^(contato|contact|contactar)$/i,
  skills: /^(principais competências|top skills|competências)$/i,
  languages: /^(languages|idiomas)$/i,
  certifications: /^(certifications|certificações|licenças e certificados)$/i,
  honors: /^(honors-awards|prêmios|honors & awards|honras e prêmios)$/i,
  publications: /^(publications|publicações)$/i,
}
const MAIN_SECTIONS = {
  summary: /^(resumo|summary|sobre|about)$/i,
  experience: /^(experiência|experience)$/i,
  education: /^(formação acadêmica|education|formação)$/i,
}
const MONTHS = {
  janeiro: 1, fevereiro: 2, março: 3, marco: 3, abril: 4, maio: 5, junho: 6, julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12,
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
}
const DATE_LINE = /^((?:[a-zçã]+ (?:de )?)?\d{4}) - ((?:[a-zçã]+ (?:de )?)?\d{4}|present|presente|o momento|atual)/i
const DURATION = /^\d+ (anos?|m[eê]s(es)?|years?|months?|mos?|yrs?)( \d+ (m[eê]s(es)?|months?|mos?))?$/i

function parseDate(text) {
  const clean = text.trim().toLowerCase()
  if (/present|presente|momento|atual/.test(clean)) return null
  const year = Number(/\d{4}/.exec(clean)?.[0])
  const month = MONTHS[clean.split(' ')[0]] ?? null
  return { year, month }
}
const isLocation = text => text.length < 70 && !/[.;:]$/.test(text) && /(brasil|brazil|espírito santo|são paulo|rio de janeiro|minas gerais|remote|remoto|híbrido|, [a-z]{2}$|portugal|united states)/i.test(text)
const startsNewItem = (previous, line) => line.startsWith('- ') || line.startsWith('• ') || (/[.!?]$/.test(previous) && /^[A-ZÀ-Ú]/.test(line))

/** Junta linhas quebradas em parágrafo + bullets. */
function toBlocks(lines) {
  const description = []
  const highlights = []
  let current = null
  for (const line of lines) {
    const bullet = line.startsWith('- ') || line.startsWith('• ')
    if (!highlights.length && !bullet && current === null) { description.push(line); continue }
    if (current === null || startsNewItem(current, line)) {
      if (current !== null) highlights.push(current)
      current = line.replace(/^[-•]\s*/, '')
    } else current += ' ' + line
  }
  if (current !== null) highlights.push(current)
  return { description: fixSentences(description.join(' ')), highlights: highlights.map(fixSentences) }
}
// LinkedIn remove quebras de parágrafo ("processos.Minha"); recoloca o espaço/parágrafo.
const SENTENCE = /([a-zà-ú)]|[A-Z]{2,})\.([A-ZÀ-Ú][a-zà-ú])/g
const fixSentences = text => text.replace(SENTENCE, '$1. $2').replace(/\s+/g, ' ').trim()
const toParagraphs = text => text.replace(/\s+/g, ' ').replace(SENTENCE, '$1.\n\n$2').trim()

// ---------- 3. parser ----------
export function parse(lines) {
  const out = { name: '', headline: '', location: '', summary: '', topSkills: [], languages: [], certifications: [], honors: [], experience: [], education: [] }

  // Sidebar
  let section = null
  let lastSide = null
  for (const line of lines.filter(l => l.column === 'side')) {
    const header = Object.entries(SIDE_SECTIONS).find(([, re]) => re.test(line.text))
    if (header && line.size >= 12.5) { section = header[0]; lastSide = null; continue }
    if (!section || section === 'contact') continue // contato é descartado de propósito
    const continuation = lastSide && lastSide.page === line.page && lastSide.y - line.y <= 13.5
    const bucket = { skills: out.topSkills, languages: out.languages, certifications: out.certifications, honors: out.honors, publications: out.honors }[section]
    if (continuation && bucket.length) bucket[bucket.length - 1] += ' ' + line.text
    else bucket.push(line.text)
    lastSide = line
  }
  out.languages = out.languages.map(text => {
    const m = /^(.*?)\s*\((.*)\)\s*$/.exec(text)
    return m ? { name: m[1].trim(), level: m[2].trim() } : { name: text.trim(), level: '' }
  })

  // Coluna principal
  const main = lines.filter(l => l.column === 'main')
  const nameIdx = main.findIndex(l => l.size >= 20)
  if (nameIdx === -1) throw new Error('Não encontrei o nome (fonte grande) — o PDF parece não ser uma exportação do LinkedIn.')
  out.name = main[nameIdx].text
  const firstSection = main.findIndex((l, i) => i > nameIdx && l.size >= 15)
  const intro = main.slice(nameIdx + 1, firstSection === -1 ? undefined : firstSection).map(l => l.text)
  out.location = intro.length > 1 ? intro.pop() : ''
  out.headline = intro.join(' ').replace(/\s+/g, ' ').trim()

  let current = null
  const blocks = { summary: [], experience: [], education: [] }
  for (const line of main.slice(firstSection)) {
    const header = Object.entries(MAIN_SECTIONS).find(([, re]) => re.test(line.text))
    if (header && line.size >= 15) { current = header[0]; continue }
    if (line.size >= 15) { current = null; continue } // seção desconhecida: ignora
    if (current) blocks[current].push(line)
  }
  out.summary = toParagraphs(blocks.summary.map(l => l.text).join(' '))

  // Experiência: empresa (12) → [duração total] → cargo (11.5) → datas → local → descrição (10.5)
  let company = null
  let role = null
  let body = []
  let stage = 'none'
  const closeRole = () => {
    if (!role) return
    Object.assign(role, toBlocks(body))
    out.experience.push(role)
    role = null
    body = []
  }
  for (const line of blocks.experience) {
    if (line.size >= 11.8) { closeRole(); company = line.text; stage = 'company'; continue }
    if (line.size >= 11.2) { closeRole(); role = { company, position: line.text, periodRaw: '', start: null, end: null, location: '' }; stage = 'title'; continue }
    if (!role) continue // ex.: "3 anos 4 meses" logo abaixo da empresa
    if (stage === 'title' && DATE_LINE.test(line.text)) {
      const [, from, to] = DATE_LINE.exec(line.text)
      role.periodRaw = line.text.replace(/\s*\(.*\)\s*$/, '')
      role.start = parseDate(from)
      role.end = parseDate(to)
      stage = 'dates'
      continue
    }
    if (stage === 'dates' && isLocation(line.text)) { role.location = line.text; stage = 'body'; continue }
    stage = 'body'
    if (!DURATION.test(line.text)) body.push(line.text)
  }
  closeRole()

  // Formação: escola (12) → curso · (datas)
  let edu = null
  for (const line of blocks.education) {
    if (line.size >= 11.8) { if (edu) out.education.push(edu); edu = { school: line.text, raw: '' }; continue }
    if (edu) edu.raw += (edu.raw ? ' ' : '') + line.text
  }
  if (edu) out.education.push(edu)
  out.education = out.education.map(({ school, raw }) => {
    const m = /^(.*?)\s*·\s*\((.*)\)\s*$/.exec(raw)
    const degree = (m ? m[1] : raw).trim()
    const years = (m ? m[2] : '').match(/\d{4}/g) ?? []
    return { school, degree, startYear: years[0] ? Number(years[0]) : null, endYear: years[1] ? Number(years[1]) : years[0] ? Number(years[0]) : null }
  })
  return out
}


// ---------- 4. validação ----------
/** Problemas que impedem a importação (o JSON anterior é mantido). */
export function validate(data) {
  const problems = []
  if (!data.name) problems.push('nome não encontrado')
  if (!data.experience.length) problems.push('nenhuma experiência encontrada')
  if (data.experience.some(exp => !exp.start)) problems.push('alguma experiência ficou sem data de início')
  if (data.experience.some(exp => !exp.company || !exp.position)) problems.push('alguma experiência ficou sem empresa ou cargo')
  if (!data.education.length) problems.push('nenhuma formação encontrada')
  const keys = data.experience.map(exp => `${exp.company}|${exp.position}|${exp.start?.year}-${exp.start?.month}`)
  if (new Set(keys).size !== keys.length) problems.push('experiência duplicada (mesma empresa, cargo e início)')
  const text = JSON.stringify(data)
  if (/\(?\b[1-9]{2}\)?[\s-]?9\d{4}[\s-]?\d{4}\b/.test(text)) problems.push('possível telefone no resultado')
  if (/@[a-z0-9-]+\.[a-z]/i.test(text)) problems.push('possível e-mail no resultado')
  return problems
}

/** Avisos que não bloqueiam (vale conferir). */
export function warnings(data) {
  const out = []
  for (const exp of data.experience) {
    if (!exp.description && !exp.highlights.length) out.push(`${exp.company} · ${exp.position}: sem descrição`)
    if (!exp.location) out.push(`${exp.company} · ${exp.position}: sem localização`)
  }
  return out
}

// ---------- 5. generalização de dados corporativos ----------
/**
 * Aplica as regras de src/data/redactions.json em todos os textos (ex.: "N depositantes" → "múltiplos depositantes").
 * As regras são genéricas (regex), então funcionam nas próximas importações sem precisar saber os números.
 */
export function applyRedactions(data, rules, lang = 'pt') {
  const list = rules?.[lang] ?? []
  const fix = value => {
    if (typeof value === 'string') return list.reduce((text, rule) => text.replace(new RegExp(rule.pattern, rule.flags ?? 'g'), rule.replace), value)
    if (Array.isArray(value)) return value.map(fix)
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, k === 'source' ? v : fix(v)]))
    return value
  }
  return fix(data)
}

export async function parseLinkedInPdf(bytes) {
  const { lines, pages } = await extractLines(bytes)
  return { pages, data: parse(lines) }
}

export const readPdf = file => readFileSync(file)

#!/usr/bin/env node
// Importa o PDF exportado pelo LinkedIn ("Mais" → "Salvar como PDF") e gera src/data/linkedin.json.
//
// Uso:  npm run linkedin:import                  (usa o PDF mais recente em ./linkedin)
//       npm run linkedin:import -- caminho/Profile.pdf
//
// Privacidade: os dados de CONTATO do PDF (telefone, e-mail, URLs) são ignorados de propósito e
// nunca entram no JSON. O e-mail e os links do site continuam vindo de src/data/curriculum.ts.
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, resolve, basename } from 'node:path'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'

const OUT = resolve('src/data/linkedin.json')

function findPdf(arg) {
  const target = resolve(arg || 'linkedin')
  if (!existsSync(target)) throw new Error(`Não encontrei ${target}. Coloque o PDF do LinkedIn na pasta linkedin/.`)
  if (statSync(target).isFile()) return target
  const pdfs = readdirSync(target).filter(name => name.toLowerCase().endsWith('.pdf')).map(name => join(target, name))
  if (!pdfs.length) throw new Error(`Nenhum PDF em ${target}.`)
  return pdfs.sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)[0]
}

// ---------- 1. extração de linhas com tamanho de fonte e posição ----------
async function extractLines(file) {
  const doc = await getDocument({ data: new Uint8Array(readFileSync(file)), useSystemFonts: true, verbosity: 0 }).promise
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
function parse(lines) {
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

// ---------- 4. execução ----------
const file = findPdf(process.argv[2])
const { lines, pages } = await extractLines(file)
const data = parse(lines)

const problems = []
if (!data.experience.length) problems.push('nenhuma experiência encontrada')
if (data.experience.some(exp => !exp.start)) problems.push('alguma experiência ficou sem data de início')
if (!data.education.length) problems.push('nenhuma formação encontrada')
if (problems.length) {
  console.error('✗ Importação abortada: ' + problems.join('; ') + '. O JSON anterior foi mantido.')
  process.exit(1)
}

const result = { source: { file: basename(file), pages, importedAt: new Date().toISOString() }, ...data }
const previous = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : null
writeFileSync(OUT, JSON.stringify(result, null, 2) + '\n')

console.log(`✓ ${basename(file)} → src/data/linkedin.json`)
console.log(`  ${data.experience.length} experiências · ${data.education.length} formações · ${data.languages.length} idiomas · ${data.certifications.length} certificações · ${data.topSkills.length} competências`)
if (previous) {
  const before = new Set(previous.experience.map(exp => exp.company + ' | ' + exp.position))
  const after = new Set(data.experience.map(exp => exp.company + ' | ' + exp.position))
  for (const item of after) if (!before.has(item)) console.log('  + nova experiência: ' + item)
  for (const item of before) if (!after.has(item)) console.log('  − removida: ' + item)
}

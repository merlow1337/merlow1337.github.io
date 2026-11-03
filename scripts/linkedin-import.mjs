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

const OUT = resolve('src/data/linkedin.json')

function findPdf(arg) {
  const target = resolve(arg || 'linkedin')
  if (!existsSync(target)) throw new Error(`Não encontrei ${target}. Coloque o PDF do LinkedIn na pasta linkedin/.`)
  if (statSync(target).isFile()) return target
  const pdfs = readdirSync(target).filter(name => name.toLowerCase().endsWith('.pdf')).map(name => join(target, name))
  if (!pdfs.length) throw new Error(`Nenhum PDF em ${target}.`)
  return pdfs.sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)[0]
}

import { parseLinkedInPdf, validate, warnings, applyRedactions } from './linkedin-parser.mjs'

// ---------- 4. execução ----------
const file = findPdf(process.argv[2])
const parsed = await parseLinkedInPdf(readFileSync(file))
const pages = parsed.pages
const RULES = resolve('src/data/redactions.json')
const data = applyRedactions(parsed.data, existsSync(RULES) ? JSON.parse(readFileSync(RULES, 'utf8')) : null)

const problems = validate(data)
if (problems.length) {
  console.error('✗ Importação abortada: ' + problems.join('; ') + '. O JSON anterior foi mantido.')
  process.exit(1)
}

const result = { source: { file: basename(file), pages, importedAt: new Date().toISOString() }, ...data }
const previous = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : null
writeFileSync(OUT, JSON.stringify(result, null, 2) + '\n')

console.log(`✓ ${basename(file)} → src/data/linkedin.json`)
for (const warning of warnings(data)) console.log('  ⚠ ' + warning)
console.log(`  ${data.experience.length} experiências · ${data.education.length} formações · ${data.languages.length} idiomas · ${data.certifications.length} certificações · ${data.topSkills.length} competências`)
// Traduções que faltam (memória PT→EN em src/data/translations.json)
const TR = resolve('src/data/translations.json')
if (existsSync(TR)) {
  const memory = JSON.parse(readFileSync(TR, 'utf8')).entries ?? {}
  const texts = [...data.summary.split(/\n{2,}/), data.headline, ...data.experience.flatMap(exp => [exp.position, exp.description, ...exp.highlights]), ...data.education.map(ed => ed.degree)].filter(Boolean)
  const missing = [...new Set(texts)].filter(text => !memory[text])
  if (missing.length) {
    console.log(`  ⚠ ${missing.length} texto(s) sem tradução para o inglês — adicione em src/data/translations.json:`)
    for (const text of missing) console.log('    • ' + text.slice(0, 110) + (text.length > 110 ? '…' : ''))
  } else console.log('  ✓ todas as traduções EN estão em dia')
}
if (previous) {
  const before = new Set(previous.experience.map(exp => exp.company + ' | ' + exp.position))
  const after = new Set(data.experience.map(exp => exp.company + ' | ' + exp.position))
  for (const item of after) if (!before.has(item)) console.log('  + nova experiência: ' + item)
  for (const item of before) if (!after.has(item)) console.log('  − removida: ' + item)
}

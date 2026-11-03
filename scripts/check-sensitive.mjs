#!/usr/bin/env node
// Barreira contra exposição de documentos e dados pessoais.
// Roda no CI antes do build e do deploy: se falhar, NADA é publicado.
//
//  1. Nenhum documento (PDF, Word, planilha, chave, .env...) pode estar versionado.
//  2. Nenhum telefone, CPF ou e-mail fora da lista permitida pode aparecer nos arquivos
//     versionados nem no site gerado (dist/).
//  3. O linkedin.json não pode conter a seção de contato.
//
// Modos:
//   node scripts/check-sensitive.mjs            arquivos versionados + dist/
//   node scripts/check-sensitive.mjs --history  TODO o histórico do Git (todos os commits e branches)
//   node scripts/check-sensitive.mjs --staged   só o que está no `git add` (usado pelo hook de pre-commit)
import { execSync } from 'node:child_process'
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { join, extname } from 'node:path'

const ALLOWED_EMAILS = new Set([
  'filipecarneirodasilva@gmail.com', // e-mail público do currículo
  '41898282+github-actions[bot]@users.noreply.github.com',
])
const BLOCKED_EXT = /\.(pdf|docx?|odt|rtf|xlsx?|xlsm|ods|csv|tsv|pptx?|zip|rar|7z|env|pem|key|p12|pfx|crt|sqlite|db)$/i
const ALLOWED_BINARIES = new Set(['public/og-image.jpg', 'public/portrait.webp', 'public/favicon.svg'])
const TEXT_EXT = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs', '.json', '.md', '.html', '.css', '.yml', '.yaml', '.txt', '.svg', ''])
const SKIP = new Set(['package-lock.json'])

const PATTERNS = [
  { name: 'telefone', re: /(?<![\d.])\(?\b[1-9]{2}\)?[\s-]?9\d{4}[\s-]?\d{4}\b/g },
  { name: 'CPF', re: /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g },
  { name: 'e-mail', re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, allow: m => ALLOWED_EMAILS.has(m.toLowerCase()) || /@(example|exemplo)\./i.test(m) },
]

const problems = []
const report = (file, msg) => {
  problems.push(`${file}: ${msg}`)
  if (process.env.GITHUB_ACTIONS) console.log(`::error file=${file}::${msg}`)
}

const MODE = process.argv.includes('--history') ? 'history' : process.argv.includes('--staged') ? 'staged' : 'tree'
const git = cmd => execSync(cmd, { encoding: 'utf8', maxBuffer: 512 * 1024 * 1024 })

function scanText(file, text) {
  for (const { name, re, allow } of PATTERNS) {
    for (const match of text.matchAll(re)) {
      if (allow && allow(match[0])) continue
      report(file, `possível ${name} encontrado ("${match[0].slice(0, 4)}…")`)
    }
  }
}
const checkName = (file, where = '') => {
  if (BLOCKED_EXT.test(file)) report(file, `documento/arquivo sensível versionado${where} — remova do repositório (e do histórico, se tiver dados pessoais)`)
  if (!ALLOWED_BINARIES.has(file) && /\.(png|jpe?g|gif|webp|heic|tiff?)$/i.test(file)) report(file, `imagem fora da lista permitida${where} (pode ser print de documento)`)
}

if (MODE === 'history') {
  // nomes de arquivo em qualquer commit (inclusive já apagados)
  const shallow = git('git rev-parse --is-shallow-repository').trim() === 'true'
  if (shallow) { console.error('✗ clone raso: rode com o histórico completo (actions/checkout com fetch-depth: 0)'); process.exit(1) }
  const names = new Set(git('git log --all --format= --name-only').split('\n').filter(Boolean))
  names.forEach(file => checkName(file, ' em algum commit do histórico'))
  // conteúdo adicionado em qualquer commit
  let commit = ''
  let file = ''
  for (const line of git('git log --all -p --no-color --no-ext-diff --format=commit:%h').split('\n')) {
    if (line.startsWith('commit:')) commit = line.slice(7)
    else if (line.startsWith('+++ b/')) file = line.slice(6)
    else if (line.startsWith('+') && !line.startsWith('+++') && !SKIP.has(file.split('/').pop()) && !file.endsWith('check-sensitive.mjs') && TEXT_EXT.has(extname(file).toLowerCase())) {
      const before = problems.length
      scanText(`${file}@${commit}`, line.slice(1))
      if (problems.length > before && problems.length > 50) break
    }
  }
  const commits = git('git rev-list --all --count').trim()
  if (problems.length) {
    console.error(`\n✗ ${problems.length} problema(s) no histórico (${commits} commits):\n  - ` + [...new Set(problems)].join('\n  - '))
    console.error('\nComo o repositório é público, remover o arquivo hoje não apaga o histórico. Para isso é preciso reescrevê-lo (git filter-repo) e trocar a credencial/dado exposto.')
    process.exit(1)
  }
  console.log(`✓ histórico: ${commits} commits em todos os branches, nenhum documento ou dado pessoal`)
  process.exit(0)
}

// 1. arquivos versionados (ou só os do `git add`, no pre-commit)
let tracked = []
try {
  tracked = MODE === 'staged'
    ? git('git diff --cached --name-only --diff-filter=ACMR -z').split('\0').filter(Boolean)
    : git('git ls-files -z').split('\0').filter(Boolean)
} catch {
  console.warn('! git indisponível — pulando a checagem de arquivos versionados')
}
for (const file of tracked) checkName(file)

// 2. conteúdo
function scan(file) {
  if (SKIP.has(file.split('/').pop()) || !TEXT_EXT.has(extname(file).toLowerCase())) return
  if (file.endsWith('check-sensitive.mjs')) return
  let text
  try { text = MODE === 'staged' ? git(`git show :"${file}"`) : readFileSync(file, 'utf8') } catch { return }
  scanText(file, text)
}
const walk = dir => readdirSync(dir).flatMap(name => {
  const path = join(dir, name)
  return statSync(path).isDirectory() ? walk(path) : [path]
})
tracked.forEach(scan)
if (MODE === 'tree' && existsSync('dist')) walk('dist').forEach(scan)

// 3. linkedin.json sem contato
if (existsSync('src/data/linkedin.json')) {
  const data = JSON.parse(readFileSync('src/data/linkedin.json', 'utf8'))
  for (const key of ['contact', 'contato', 'phone', 'telefone', 'email', 'emails', 'urls']) {
    if (key in data) report('src/data/linkedin.json', `campo "${key}" não deveria existir (dados de contato)`)
  }
}

if (problems.length) {
  console.error(`\n✗ ${problems.length} problema(s) de privacidade:\n  - ` + problems.join('\n  - '))
  process.exit(1)
}
console.log(`✓ privacidade: ${tracked.length} arquivos versionados${existsSync('dist') ? ' + dist/' : ''} verificados, nenhum documento ou dado pessoal exposto`)

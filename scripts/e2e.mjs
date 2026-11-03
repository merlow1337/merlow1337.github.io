#!/usr/bin/env node
// Testes de navegador (Playwright + Chromium) sobre o site já gerado em dist/.
//
//  • PDF ATS: gera os PDFs reais (PT e EN) pela impressão do navegador, extrai o texto com pdf.js e confere
//    seções, ordem dos cargos, datas, formação, idiomas e ausência de telefone ou texto da interface.
//    Os PDFs e prints ficam em e2e-artifacts/ para inspeção visual (no CI, como artefato do workflow).
//  • Interface: desktop e celular, sem erro de console, sem rolagem horizontal, nada bloqueando a leitura.
//  • Acessibilidade: axe-core (WCAG 2.1 A/AA) nos temas escuro e claro; navegação por teclado.
//  • Agente: abre pelo teclado, responde com fonte e fecha com Esc.
//
// Uso: npm run build && npm run test:e2e
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { chromium } from 'playwright'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'

const require = createRequire(import.meta.url)
const AXE = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8')
const PORT = 4321
const BASE = `http://127.0.0.1:${PORT}/`
const OUT = 'e2e-artifacts'
const PHONE = /\(?\b[1-9]{2}\)?[\s-]?9\d{4}[\s-]?\d{4}\b/

if (!existsSync('dist/index.html')) { console.error('✗ dist/ não existe — rode `npm run build` antes'); process.exit(1) }
mkdirSync(OUT, { recursive: true })

const failures = []
let passed = 0
const check = (ok, label, detail = '') => {
  if (ok) { passed++; console.log('  ✓ ' + label) } else { failures.push(label + (detail ? ` — ${detail}` : '')); console.log('  ✗ ' + label + (detail ? `\n      ${detail}` : '')) }
}

// ---------- servidor ----------
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], { stdio: 'ignore' })
const stop = () => { try { server.kill() } catch { /* já encerrado */ } }
process.on('exit', stop)
for (let i = 0; i < 50; i++) {
  try { if ((await fetch(BASE)).ok) break } catch { /* aguardando */ }
  await new Promise(r => setTimeout(r, 200))
}

const browser = await chromium.launch()
const open = async ({ viewport = { width: 1366, height: 900 }, lang = 'pt', theme = 'midnight', mode } = {}) => {
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce' })
  await context.addInitScript(([l, t, m]) => {
    localStorage.setItem('fc-cv-lang', l)
    localStorage.setItem('fc-cv-theme', t)
    if (m) localStorage.setItem('fc-cv-mode', m); else localStorage.removeItem('fc-cv-mode')
  }, [lang, theme, mode])
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
  await page.goto(BASE, { waitUntil: 'networkidle' })
  return { page, context, errors }
}

async function pdfText(bytes) {
  const doc = await getDocument({ data: new Uint8Array(bytes), verbosity: 0 }).promise
  let text = ''
  for (let p = 1; p <= doc.numPages; p++) {
    const content = await (await doc.getPage(p)).getTextContent()
    text += content.items.map(item => item.str + (item.hasEOL ? '\n' : ' ')).join('') + '\n'
  }
  return { text: text.replace(/[ \t]+/g, ' '), pages: doc.numPages }
}

try {
  // ---------- 1. PDF ATS ----------
  for (const lang of ['pt', 'en']) {
    console.log(`\nPDF ATS (${lang.toUpperCase()})`)
    const { page, context } = await open({ lang, mode: 'recruiter' })
    // o que o SITE mostra (abre as experiências antigas para ler todas)
    const earlier = page.locator('.earlier-toggle')
    if (await earlier.count()) await earlier.click()
    const site = await page.$$eval('.role', roles => roles.map(role => ({
      position: role.querySelector('h3')?.textContent?.trim() ?? '',
      period: (role.querySelector('.role-meta')?.textContent ?? '').split('·')[0].trim(),
    })))
    const companies = await page.$$eval('.company-head h3', els => els.map(el => el.textContent.trim()))
    const degrees = await page.$$eval('.edu h3', els => els.map(el => el.textContent.trim()))
    await page.emulateMedia({ media: 'print' })
    const bytes = await page.pdf({ format: 'A4', printBackground: false, preferCSSPageSize: true })
    writeFileSync(`${OUT}/curriculo-ats-${lang}.pdf`, bytes)
    await page.screenshot({ path: `${OUT}/curriculo-ats-${lang}.png`, fullPage: true })
    const { text, pages } = await pdfText(bytes)
    writeFileSync(`${OUT}/curriculo-ats-${lang}.txt`, text)
    const flat = text.replace(/\s+/g, ' ')

    check(pages >= 1 && pages <= 3, `PDF tem ${pages} página(s) (esperado 1–3)`)
    const headings = lang === 'pt'
      ? ['RESUMO PROFISSIONAL', 'EXPERIÊNCIA PROFISSIONAL', 'FORMAÇÃO ACADÊMICA', 'COMPETÊNCIAS', 'IDIOMAS']
      : ['PROFESSIONAL SUMMARY', 'WORK EXPERIENCE', 'EDUCATION', 'SKILLS', 'LANGUAGES']
    // títulos saem em maiúsculas no PDF; a busca é sequencial para não confundir com palavras do texto
    const pos = []
    for (const h of headings) pos.push(flat.indexOf(h, pos.length ? Math.max(0, pos[pos.length - 1]) : 0))
    check(headings.every(h => flat.includes(h)), 'todas as seções aparecem', headings.filter(h => !flat.includes(h)).join(', '))
    check(pos.every((p, i) => p >= 0 && (i === 0 || p > pos[i - 1])), 'seções na ordem certa')
    check(site.length > 0 && site.every(r => flat.includes(r.position)), `os ${site.length} cargos do site estão no PDF`, site.filter(r => !flat.includes(r.position)).map(r => r.position).join('; '))
    check(site.every(r => flat.includes(r.period)), 'todos os períodos do site estão no PDF', site.filter(r => !flat.includes(r.period)).map(r => r.period).join('; '))
    let last = -1, inOrder = true
    for (const r of site) { const i = flat.indexOf(r.position + ' - '); if (i < last) inOrder = false; last = Math.max(last, i) }
    check(inOrder, 'cargos na mesma ordem do site')
    check(companies.every(c => flat.includes(c)), 'todas as empresas estão no PDF', companies.filter(c => !flat.includes(c)).join('; '))
    check(degrees.every(d => flat.includes(d)), 'todas as formações estão no PDF', degrees.filter(d => !flat.includes(d)).join('; '))
    check(flat.includes('filipecarneirodasilva@gmail.com') && /linkedin\.com\/in\//.test(flat), 'contato público (e-mail e LinkedIn) presente')
    check(!PHONE.test(flat), 'nenhum telefone no PDF')
    const uiLeaks = [/Filipe\.ai/, /Perguntar ao agente/, /Ask the agent/, /\bConquistas\b/, /\bAchievements\b/, /agente online/, /agent online/, /\bXP\b/, /Copiloto/, /copilot/i]
    check(!uiLeaks.some(re => re.test(flat)), 'nenhum texto da interface vazou para o PDF', uiLeaks.filter(re => re.test(flat)).map(String).join(', '))
    check(!/�/.test(text), 'sem caracteres corrompidos (acentos legíveis)')
    await context.close()
  }

  // ---------- 2. interface ----------
  for (const [name, viewport] of [['desktop', { width: 1366, height: 900 }], ['celular', { width: 390, height: 844 }]]) {
    console.log(`\nInterface (${name})`)
    const { page, context, errors } = await open({ viewport })
    await page.screenshot({ path: `${OUT}/site-${name}.png` })
    check(!(await page.locator('[aria-modal="true"]').count()), 'nenhuma janela bloqueando a leitura na primeira visita')
    check(await page.locator('.intro-banner').isVisible(), 'faixa de boas-vindas visível e não bloqueante')
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    check(overflow <= 1, 'sem rolagem horizontal', `${overflow}px a mais`)
    check(await page.locator('#experiencia .role').count() > 0, 'experiências renderizadas')
    check((await page.title()) === 'Filipe Carneiro da Silva', 'título da aba é só o nome', await page.title())
    check(errors.length === 0, 'sem erros no console', errors.join(' | '))
    await context.close()
  }

  // ---------- 3. teclado e agente ----------
  console.log('\nTeclado e agente')
  {
    const { page, context } = await open()
    await page.keyboard.press('Tab')
    const first = await page.evaluate(() => document.activeElement?.className)
    check(first === 'skip', 'primeiro Tab vai para "Pular para o conteúdo"', String(first))
    let reachedFab = false
    for (let i = 0; i < 120 && !reachedFab; i++) {
      await page.keyboard.press('Tab')
      reachedFab = await page.evaluate(() => document.activeElement?.classList.contains('agent-fab') ?? false)
    }
    check(reachedFab, 'botão do agente alcançável pelo teclado')
    await page.locator('.agent-fab').focus()
    await page.keyboard.press('Enter')
    await page.waitForSelector('.agent-dock')
    await page.waitForTimeout(150)
    check(await page.evaluate(() => document.activeElement?.tagName === 'TEXTAREA'), 'ao abrir, o foco vai para o campo do agente')
    await page.keyboard.type('O que ele faz hoje?')
    await page.keyboard.press('Enter')
    await page.waitForSelector('.msg-agent:nth-of-type(3) .sources button', { timeout: 5000 }).catch(() => {})
    const answer = await page.locator('.msg-agent').last().innerText()
    const company = await page.locator('.company-head h3').first().innerText()
    check(answer.includes(company), 'agente responde com a empresa atual', answer.slice(0, 120))
    check(await page.locator('.msg-agent').last().locator('.sources button').count() > 0, 'resposta traz fonte clicável')
    await page.keyboard.press('Escape')
    check(!(await page.locator('.agent-dock').count()), 'Esc fecha o agente')
    check(await page.evaluate(() => document.activeElement?.classList.contains('agent-fab') ?? false), 'ao fechar, o foco volta para o botão do agente')
    await context.close()
  }

  // ---------- 4. acessibilidade (axe-core) ----------
  for (const theme of ['midnight', 'light', 'neon']) {
    console.log(`\nAcessibilidade — tema ${theme === 'light' ? 'claro' : theme === 'neon' ? 'neon' : 'escuro'}`)
    const { page, context } = await open({ theme, mode: 'agent' })
    await page.addScriptTag({ content: AXE })
    const result = await page.evaluate(async () => {
      // @ts-ignore axe injetado
      const r = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }, resultTypes: ['violations'] })
      return r.violations.map(v => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.length, sample: v.nodes.slice(0, 3).map(n => n.target.join(' ')) }))
    })
    writeFileSync(`${OUT}/axe-${theme}.json`, JSON.stringify(result, null, 2))
    const serious = result.filter(v => v.impact === 'serious' || v.impact === 'critical')
    check(serious.length === 0, 'nenhuma violação séria ou crítica (WCAG 2.1 AA)', serious.map(v => `${v.id} (${v.nodes}): ${v.sample.join(', ')}`).join(' | '))
    const minor = result.filter(v => !serious.includes(v))
    if (minor.length) console.log('    ℹ violações menores: ' + minor.map(v => `${v.id} (${v.nodes})`).join(', '))
    await context.close()
  }
} finally {
  await browser.close()
  stop()
}

console.log(`\n${failures.length ? '✗' : '✓'} e2e: ${passed} verificações ok, ${failures.length} falha(s). Artefatos em ${OUT}/`)
if (failures.length) process.exit(1)

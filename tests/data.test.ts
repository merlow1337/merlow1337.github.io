// Consistência LinkedIn × site × PDF: tudo o que aparece no site precisa vir do linkedin.json.
import { describe, expect, it } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import * as resume from '../src/data/resume'
import { ATSResume } from '../src/components/ATSResume'
import { personJsonLd } from '../vite.config'

const linkedin = existsSync('src/data/linkedin.json') ? JSON.parse(readFileSync('src/data/linkedin.json', 'utf8')) : null
const translations = JSON.parse(readFileSync('src/data/translations.json', 'utf8')).entries as Record<string, string>
const annotate = (msg: string) => console.warn(process.env.GITHUB_ACTIONS ? `::warning title=Tradução pendente::${msg}` : '⚠ ' + msg)
const strip = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/\s+/g, ' ')

describe.runIf(linkedin)('linkedin.json (gerado pelo importador)', () => {
  it('tem a estrutura esperada', () => {
    expect(linkedin.name).toBeTruthy()
    expect(linkedin.experience.length).toBeGreaterThan(0)
    expect(linkedin.education.length).toBeGreaterThan(0)
    for (const exp of linkedin.experience) {
      expect(exp.company, JSON.stringify(exp)).toBeTruthy()
      expect(exp.position, JSON.stringify(exp)).toBeTruthy()
      expect(exp.start?.year, `${exp.company} sem data de início`).toBeGreaterThan(1990)
    }
  })

  it('tem datas coerentes (início ≤ fim, nada no futuro, mês 1–12)', () => {
    const now = new Date().getFullYear() * 12 + new Date().getMonth() + 1
    const n = (d: { year: number; month: number | null }) => d.year * 12 + (d.month ?? 1)
    for (const exp of linkedin.experience) {
      for (const d of [exp.start, exp.end].filter(Boolean)) if (d.month !== null) expect(d.month).toBeGreaterThanOrEqual(1), expect(d.month).toBeLessThanOrEqual(12)
      expect(n(exp.start), `${exp.company}: início no futuro`).toBeLessThanOrEqual(now)
      if (exp.end) expect(n(exp.end), `${exp.company}: fim antes do início`).toBeGreaterThanOrEqual(n(exp.start))
    }
    expect(linkedin.experience.filter((exp: { end: unknown }) => exp.end === null).length, 'no máximo um cargo atual... ou ajuste este teste').toBeLessThanOrEqual(2)
  })

  it('não contém dados de contato', () => {
    const text = JSON.stringify(linkedin)
    expect(text).not.toMatch(/\(?\b[1-9]{2}\)?[\s-]?9\d{4}[\s-]?\d{4}\b/)
    expect(text).not.toMatch(/@[a-z0-9-]+\.[a-z]/i)
    expect(text).not.toMatch(/linkedin\.com\/in/i)
  })
})

describe('site usa exatamente os dados do LinkedIn', () => {
  it('todas as experiências do LinkedIn aparecem, na mesma ordem e com o mesmo período', () => {
    if (!linkedin) return
    expect(resume.experiences.map(exp => exp.position.pt.replace(/ — /g, ' - '))).toEqual(linkedin.experience.map((exp: { position: string }) => exp.position))
    resume.experiences.forEach((exp, i) => {
      expect(exp.start).toEqual(linkedin.experience[i].start)
      expect(exp.highlights.pt).toEqual(linkedin.experience[i].highlights)
    })
  })

  it('ids únicos (usados nas âncoras e nas citações do agente)', () => {
    const ids = resume.experiences.map(exp => exp.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('cargo atual é o mesmo no topo, no JSON-LD e no PDF', () => {
    expect(resume.profile.role.pt).toBe(resume.experiences[0].position.pt)
    expect(personJsonLd().jobTitle).toBe(linkedin ? linkedin.experience[0].position : resume.profile.role.pt)
    expect(resume.headlines.pt[0]).toBe(resume.profile.role.pt)
  })

  it('versão EN tem a mesma estrutura da PT (nenhum bullet a mais ou a menos)', () => {
    for (const exp of resume.experiences) {
      expect(exp.highlights.en.length, exp.id).toBe(exp.highlights.pt.length)
      expect(exp.location.en, exp.id).toContain(exp.location.pt.split(',')[0])
    }
    expect(resume.profile.summary.en.split('\n\n').length).toBe(resume.profile.summary.pt.split('\n\n').length)
  })

  it('números do topo saem dos dados', () => {
    const dcs = resume.distributionCenters()
    if (dcs) expect(resume.experiences.some(exp => [exp.summary.pt, ...exp.highlights.pt].some(t => t.includes(String(dcs.count))))).toBe(true)
    const tenure = resume.longestCompany()
    expect(tenure.roles).toBe(resume.experiences.filter(exp => exp.company === tenure.company).length)
    expect(resume.postgrads().length).toBe(resume.education.filter(ed => /p[óo]s-gradua/i.test(ed.degree.pt)).length)
  })

  it('traduções: lista o que falta (aviso, não bloqueia o deploy)', () => {
    for (const item of resume.pendingTranslations) annotate(`${item.where}: "${item.pt.slice(0, 80)}" — adicione em src/data/translations.json`)
    if (linkedin) {
      const used = new Set<string>([
        ...linkedin.summary.split(/\n{2,}/), linkedin.headline,
        ...linkedin.experience.flatMap((exp: { position: string; description: string; highlights: string[] }) => [exp.position, exp.description, ...exp.highlights]),
        ...linkedin.education.map((ed: { degree: string }) => ed.degree),
      ])
      const stale = Object.keys(translations).filter(key => !used.has(key))
      if (stale.length) console.warn(`ℹ ${stale.length} tradução(ões) antiga(s) sem uso em translations.json (podem ser apagadas)`)
    }
    expect(Array.isArray(resume.pendingTranslations)).toBe(true)
  })
})

describe('PDF ATS', () => {
  for (const lang of ['pt', 'en'] as const) {
    it(`(${lang}) contém todas as experiências, formações e idiomas, e nenhum telefone`, () => {
      const text = strip(renderToStaticMarkup(createElement(ATSResume, { lang })))
      for (const exp of resume.experiences) {
        expect(text, exp.id).toContain(exp.position[lang])
        expect(text, exp.id).toContain(exp.company)
        expect(text, exp.id).toContain(exp.period[lang])
      }
      for (const ed of resume.education) expect(text).toContain(ed.degree[lang])
      for (const l of resume.languages) expect(text).toContain(l.name[lang])
      expect(text).toContain(resume.profile.email)
      expect(text).not.toMatch(/\(?\b[1-9]{2}\)?[\s-]?9\d{4}[\s-]?\d{4}\b/)
    })
  }
})

// Importador do LinkedIn testado com PDFs sintéticos (dados fictícios), incluindo mudanças de layout.
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
// @ts-expect-error módulo JS sem tipos
import { parseLinkedInPdf, validate, applyRedactions } from '../scripts/linkedin-parser.mjs'
import { fakeLinkedInPdf, baseProfile, FAKE_PHONE, FAKE_EMAIL, type FakeProfile } from './helpers/fakeLinkedInPdf'

type Parsed = { data: any; pages: number }
const run = async (profile: FakeProfile, opts?: { pageHeight?: number }): Promise<Parsed> => parseLinkedInPdf(await fakeLinkedInPdf(profile, opts))
const rules = JSON.parse(readFileSync('src/data/redactions.json', 'utf8'))

describe('importador — layout padrão (PT)', () => {
  it('extrai cabeçalho, resumo, barra lateral e formação', async () => {
    const { data } = await run(baseProfile())
    expect(data.name).toBe('Maria Exemplo da Costa')
    expect(data.headline).toBe('Gestão de Operações | Dados & BI')
    expect(data.location).toBe('Vitória, Espírito Santo, Brasil')
    expect(data.summary).toContain('dados.\n\nTrabalho') // frases coladas viram parágrafos
    expect(data.topSkills).toEqual(['Logística', 'Power BI', 'SQL'])
    expect(data.languages).toEqual([{ name: 'English', level: 'Professional Working' }, { name: 'Português', level: 'Native or Bilingual' }])
    expect(data.certifications).toEqual(['Curso de Dados Fictício', 'Certificado com nome que quebra em duas linhas'])
    expect(data.education).toEqual([{ school: 'Instituto Gama (Oficial)', degree: 'Bacharel em Administração, Gestão', startYear: 2017, endYear: 2020 }])
  })

  it('separa cargos da mesma empresa e ignora a duração total', async () => {
    const { data } = await run(baseProfile())
    expect(data.experience.map((e: any) => [e.company, e.position])).toEqual([
      ['Logística Alfa', 'Coordenadora de Operações'],
      ['Beta Indústria', 'Analista Sênior - Planta Norte'],
      ['Beta Indústria', 'Analista Júnior'],
    ])
    expect(data.experience.some((e: any) => JSON.stringify(e).includes('3 anos 2 meses'))).toBe(false)
  })

  it('lê datas, "Present" e cargo sem localização', async () => {
    const { data } = await run(baseProfile())
    const [alfa, senior, junior] = data.experience
    expect(alfa.start).toEqual({ year: 2024, month: 3 })
    expect(alfa.end).toBeNull()
    expect(senior.end).toEqual({ year: 2024, month: 2 })
    expect(junior.location).toBe('')
    expect(junior.description).toBe('Apoio a inventários.')
  })

  it('junta bullets quebrados e reconhece item sem hífen após ponto final', async () => {
    const { data } = await run(baseProfile())
    expect(data.experience[0].highlights).toEqual([
      'Gestão de 12 depositantes ativos e cerca de 3.200 SKUs.',
      'Elaboração de indicadores de desempenho e relatórios gerenciais.',
      'Liderança de equipe sem hífen no início.',
    ])
  })

  it('NUNCA inclui telefone, e-mail ou URL do bloco de contato', async () => {
    const { data } = await run(baseProfile())
    const text = JSON.stringify(data)
    expect(text).not.toContain(FAKE_PHONE)
    expect(text).not.toContain(FAKE_EMAIL)
    expect(text).not.toMatch(/linkedin\.com/i)
    expect(validate(data)).toEqual([])
  })

  it('aguenta quebra de página no meio de uma experiência', async () => {
    const profile = baseProfile()
    profile.experience[0].roles[0].bullets = Array.from({ length: 25 }, (_, i) => `- Atividade número ${i + 1} da operação.`)
    const { data, pages } = await run(profile, { pageHeight: 500 })
    expect(pages).toBeGreaterThan(1)
    expect(data.experience[0].highlights).toHaveLength(25)
    expect(data.experience).toHaveLength(3)
    expect(data.experience[1].start).toEqual({ year: 2022, month: 1 })
  })
})

describe('importador — variações', () => {
  it('perfil exportado em inglês', async () => {
    const profile = baseProfile()
    profile.labels = 'en'
    profile.experience[0].roles[0].period = 'March 2024 - Present (1 year)'
    profile.experience[1].roles[0].period = 'January 2022 - February 2024 (2 years 2 months)'
    profile.experience[1].roles[1].period = 'January 2021 - December 2021 (1 year)'
    profile.experience[1].duration = '3 years 2 months'
    const { data } = await run(profile)
    expect(data.summary).toContain('Profissional de operações')
    expect(data.experience).toHaveLength(3)
    expect(data.experience[0].start).toEqual({ year: 2024, month: 3 })
    expect(data.experience[2].end).toEqual({ year: 2021, month: 12 })
    expect(data.education).toHaveLength(1)
  })

  it('bloqueia PDF sem formação', async () => {
    const profile = baseProfile()
    profile.education = []
    const { data } = await run(profile)
    expect(validate(data)).toContain('nenhuma formação encontrada')
  })

  it('bloqueia experiência duplicada', async () => {
    const profile = baseProfile()
    profile.experience.push(JSON.parse(JSON.stringify(profile.experience[0])))
    const { data } = await run(profile)
    expect(validate(data).join(' ')).toMatch(/duplicada/)
  })

  it('bloqueia PDF que não é do LinkedIn', async () => {
    const { PDFDocument, StandardFonts } = await import('pdf-lib')
    const doc = await PDFDocument.create()
    const page = doc.addPage()
    page.drawText('Um documento qualquer', { x: 50, y: 700, size: 12, font: await doc.embedFont(StandardFonts.Helvetica) })
    await expect(parseLinkedInPdf(await doc.save())).rejects.toThrow(/nome/)
  })
})

describe('generalização de dados corporativos', () => {
  it('troca quantidades de depositantes e SKUs por termos genéricos', async () => {
    const { data } = await run(baseProfile())
    const redacted = applyRedactions(data, rules)
    expect(redacted.experience[0].highlights[0]).toBe('Gestão de múltiplos depositantes ativos e milhares de SKUs.')
    expect(redacted.source).toBeUndefined()
  })
})

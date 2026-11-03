// Gera PDFs sintéticos no mesmo layout da exportação do LinkedIn (coluna lateral + coluna principal,
// tamanhos de fonte por tipo de linha), com dados FICTÍCIOS, para testar o importador sem usar o PDF real.
import { PDFDocument, StandardFonts, type PDFFont, type PDFPage } from 'pdf-lib'

export type FakeRole = { position: string; period: string; location?: string; description?: string; bullets?: string[] }
export type FakeCompany = { company: string; duration?: string; roles: FakeRole[] }
export type FakeProfile = {
  labels?: 'pt' | 'en'
  name: string
  headline: string[]
  location: string
  contact: string[]
  topSkills: string[]
  languages: string[]
  certifications: string[]
  summary: string[]
  experience: FakeCompany[]
  education: { school: string; lines: string[] }[]
}

const LABELS = {
  pt: { contact: 'Contato', skills: 'Principais competências', languages: 'Languages', certs: 'Certifications', summary: 'Resumo', experience: 'Experiência', education: 'Formação acadêmica' },
  en: { contact: 'Contact', skills: 'Top Skills', languages: 'Languages', certs: 'Certifications', summary: 'Summary', experience: 'Experience', education: 'Education' },
}

export async function fakeLinkedInPdf(profile: FakeProfile, options: { pageHeight?: number } = {}): Promise<Uint8Array> {
  const L = LABELS[profile.labels ?? 'pt']
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const H = options.pageHeight ?? 792
  const pages: PDFPage[] = []
  const newPage = () => { const p = doc.addPage([612, H]); pages.push(p); return p }
  let page = newPage()
  const draw = (p: PDFPage, f: PDFFont, text: string, x: number, y: number, size: number) => p.drawText(text, { x, y, size, font: f })

  // coluna lateral (só na 1ª página, como no LinkedIn)
  let sy = H - 54
  const side = (text: string, size: number, gap: number) => { draw(pages[0], font, text, 22, sy, size); sy -= gap }
  side(L.contact, 13, 20); profile.contact.forEach(t => side(t, 10.5, 13))
  sy -= 20; side(L.skills, 13, 20); profile.topSkills.forEach(t => side(t, 10.5, 18))
  sy -= 16; side(L.languages, 13, 20); profile.languages.forEach(t => side(t, 10.5, 18))
  sy -= 16; side(L.certs, 13, 20)
  profile.certifications.forEach(t => {
    const parts = t.split('\n')
    parts.forEach((part, i) => side(part, 10.5, i < parts.length - 1 ? 12 : 18))
  })

  // coluna principal
  let y = H - 66
  const main = (text: string, size: number, gapAfter: number) => {
    if (y < 50) { page = newPage(); y = H - 55 }
    draw(page, font, text, 224, y, size)
    y -= gapAfter
  }
  main(profile.name, 26, 21)
  profile.headline.forEach(t => main(t, 12, 15))
  main(profile.location, 12, 38)
  main(L.summary, 15.8, 25)
  profile.summary.forEach(t => main(t, 12, 18))
  y -= 30
  main(L.experience, 15.8, 31)
  for (const company of profile.experience) {
    main(company.company, 12, company.duration ? 16 : 16)
    if (company.duration) { main(company.duration, 10.5, 22) }
    for (const role of company.roles) {
      main(role.position, 11.5, 14)
      main(role.period, 10.5, role.location ? 15 : 21)
      if (role.location) main(role.location, 10.5, 21)
      ;(role.description ?? '').split('\n').filter(Boolean).forEach(t => main(t, 10.5, 18))
      ;(role.bullets ?? []).forEach(t => t.split('\n').forEach(part => main(part, 10.5, 18)))
      y -= 20
    }
    y -= 10
  }
  y -= 20
  main(L.education, 15.8, 31)
  for (const ed of profile.education) {
    main(ed.school, 12, 16)
    ed.lines.forEach(t => main(t, 10.5, 15))
    y -= 22
  }
  pages.forEach((p, i) => draw(p, font, `Page ${i + 1} of ${pages.length}`, 384, 14, 9))
  return doc.save()
}

// Telefone e e-mail fictícios montados em partes, para o verificador de privacidade não acusar este arquivo.
export const FAKE_PHONE = '(11) 9' + '1234-5678'
export const FAKE_EMAIL = 'maria.exemplo' + '@' + 'exemplo.com'

export const baseProfile = (): FakeProfile => ({
  name: 'Maria Exemplo da Costa',
  headline: ['Gestão de Operações | Dados & BI'],
  location: 'Vitória, Espírito Santo, Brasil',
  contact: [FAKE_PHONE + ' (Mobile)', FAKE_EMAIL, 'www.linkedin.com/in/maria-exemplo (LinkedIn)'],
  topSkills: ['Logística', 'Power BI', 'SQL'],
  languages: ['English (Professional Working)', 'Português (Native or Bilingual)'],
  certifications: ['Curso de Dados Fictício', 'Certificado com nome\nque quebra em duas linhas'],
  summary: ['Profissional de operações com foco em dados.Trabalho com indicadores e', 'melhoria contínua.'],
  experience: [
    {
      company: 'Logística Alfa',
      roles: [{
        position: 'Coordenadora de Operações',
        period: 'março de 2024 - Present (1 ano)',
        location: 'Serra, Espírito Santo, Brasil',
        description: 'Coordenação de operações de armazenagem e expedição.',
        bullets: ['- Gestão de 12 depositantes ativos e cerca de 3.200 SKUs.', '- Elaboração de indicadores de', 'desempenho e relatórios gerenciais.', 'Liderança de equipe sem hífen no início.'],
      }],
    },
    {
      company: 'Beta Indústria',
      duration: '3 anos 2 meses',
      roles: [
        { position: 'Analista Sênior - Planta Norte', period: 'janeiro de 2022 - fevereiro de 2024 (2 anos 2 meses)', location: 'Aracruz, Espírito Santo, Brasil', description: 'Planejamento logístico industrial.', bullets: ['- Uso de SAP e Python.'] },
        { position: 'Analista Júnior', period: 'janeiro de 2021 - dezembro de 2021 (1 ano)', description: 'Apoio a inventários.', bullets: ['- Contagens cíclicas.'] },
      ],
    },
  ],
  education: [
    { school: 'Instituto Gama (Oficial)', lines: ['Bacharel em Administração, Gestão · (janeiro de', '2017 - dezembro de 2020)'] },
  ],
})

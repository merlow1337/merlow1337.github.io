// Camada única de dados do site.
//
//   linkedin.json  (gerado pelo `npm run linkedin:import` a partir do PDF do LinkedIn) → fonte da verdade em PT
//   curriculum.ts  (escrito à mão) → traduções EN, tags, áreas, contato e textos curtos
//
// Se o linkedin.json não existir, o site usa apenas o curriculum.ts.
import * as base from './curriculum'
import type { Experience, Education, LocalText } from './curriculum'
import * as extra from './extra'

export type { Lang, Experience, Education, LocalText } from './curriculum'

type LinkedInDate = { year: number; month: number | null } | null
type LinkedIn = {
  source: { file: string; pages: number; importedAt: string }
  name: string
  headline: string
  location: string
  summary: string
  topSkills: string[]
  languages: { name: string; level: string }[]
  certifications: string[]
  experience: { company: string; position: string; start: LinkedInDate; end: LinkedInDate; location: string; description: string; highlights: string[] }[]
  education: { school: string; degree: string; startYear: number | null; endYear: number | null }[]
}

const found = import.meta.glob<{ default: LinkedIn }>('./linkedin.json', { eager: true })
const linkedin: LinkedIn | null = Object.values(found)[0]?.default ?? null

// ---------- helpers ----------
const norm = (text: string) => text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
const tokens = (text: string) => new Set(norm(text).split(' ').filter(token => token.length > 2))
function similarity(a: string, b: string) {
  const x = tokens(a), y = tokens(b)
  if (!x.size || !y.size) return 0
  let inter = 0
  x.forEach(token => { if (y.has(token)) inter++ })
  return inter / (x.size + y.size - inter)
}
const companyKey = (company: string) => norm(company.replace(/\(.*?\)/g, '')).split(' ').slice(0, 2).join(' ')
const cleanCompany = (company: string) => company.replace(/\s*\((oficial|official)\)\s*/i, '').replace(/\s+-\s+/g, ' — ').trim()
const slug = (text: string) => norm(text).replace(/ /g, '-').slice(0, 40)
const both = (text: string): LocalText => ({ pt: text, en: text })

const PT_MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const EN_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
function formatPeriod(start: LinkedInDate, end: LinkedInDate): LocalText {
  const fmt = (date: LinkedInDate, months: string[], present: string) => (date ? (date.month ? months[date.month - 1] + ' ' : '') + date.year : present)
  return { pt: `${fmt(start, PT_MONTHS, 'atual')} — ${fmt(end, PT_MONTHS, 'atual')}`, en: `${fmt(start, EN_MONTHS, 'Present')} — ${fmt(end, EN_MONTHS, 'Present')}` }
}
const STATES: Record<string, string> = { 'Espírito Santo': 'ES', 'São Paulo': 'SP', 'Rio de Janeiro': 'RJ', 'Minas Gerais': 'MG', Bahia: 'BA', Paraná: 'PR', 'Santa Catarina': 'SC', 'Rio Grande do Sul': 'RS' }
function shortLocation(location: string): LocalText {
  const parts = location.split(',').map(part => part.trim()).filter(part => !/^(brasil|brazil)$/i.test(part))
  if (parts.length >= 2 && STATES[parts[1]]) parts[1] = STATES[parts[1]]
  const pt = parts.join(', ')
  return { pt, en: parts.length === 1 ? pt + ', Brazil' : pt.replace(/, [A-Z]{2}$/, '') + ', Brazil' }
}

function inferFocus(text: string): Experience['focus'] {
  const t = norm(text)
  if (/pesquis|research|cientific/.test(t)) return 'research'
  if (/supervis|coorden|gerent|lider|gestao de equipe/.test(t)) return 'leadership'
  if (/dados|bi |power bi|kpi|indicador|sql|python|analytic/.test(t)) return 'data'
  return 'operations'
}
const TAG_HINTS = ['SAP', 'WMS', 'ALCIS', 'Power BI', 'Python', 'SQL', 'Excel', 'ETL', 'KPIs', 'Forecast', 'Curva ABC', 'Inventários', 'Auditorias', 'Gephi', 'OpenRefine', 'Treinamento', 'Qualidade', 'Faturamento']
const autoTags = (text: string) => TAG_HINTS.filter(tag => norm(text).includes(norm(tag).replace(/s$/, ''))).slice(0, 5)

// ---------- merge: experiências ----------
function mergeExperiences(): Experience[] {
  if (!linkedin) return base.experiences
  const used = new Set<string>()
  return linkedin.experience.map(item => {
    const candidates = base.experiences.filter(exp => !used.has(exp.id) && companyKey(exp.company) === companyKey(item.company))
    const match = candidates.length === 1 ? candidates[0] : candidates.map(exp => ({ exp, score: similarity(exp.position.pt, item.position) })).sort((a, b) => b.score - a.score)[0]?.exp
    if (match) used.add(match.id)
    const text = [item.position, item.description, ...item.highlights].join(' ')
    const location = shortLocation(item.location)
    return {
      id: match?.id ?? slug(item.company + ' ' + item.position),
      company: cleanCompany(item.company),
      position: { pt: item.position.replace(/\s+-\s+/g, ' — '), en: match?.position.en ?? item.position },
      period: formatPeriod(item.start, item.end),
      location: { pt: location.pt || match?.location.pt || '', en: match?.location.en ?? location.en },
      summary: { pt: item.description || match?.summary.pt || '', en: match?.summary.en ?? item.description },
      highlights: { pt: item.highlights, en: match?.highlights.en.length ? match.highlights.en : item.highlights },
      tags: match?.tags ?? autoTags(text),
      focus: match?.focus ?? inferFocus(text),
    }
  })
}

// ---------- merge: formação ----------
function mergeEducation(): Education[] {
  if (!linkedin) return base.education
  return linkedin.education.map(item => {
    const match = base.education
      .filter(ed => companyKey(ed.school) === companyKey(item.school))
      .map(ed => ({ ed, score: similarity(ed.degree.pt, item.degree) }))
      .sort((a, b) => b.score - a.score)[0]?.ed
    const period = item.startYear && item.endYear && item.startYear !== item.endYear ? `${item.startYear} — ${item.endYear}` : String(item.endYear ?? item.startYear ?? '')
    const degree = item.degree.replace(/^(Pós-graduação Lato Sensu), /i, 'Pós-graduação lato sensu — ').replace(/^(Bacharel(?:ado)? em [^,]+), .*/i, '$1')
    return { school: match?.school ?? cleanCompany(item.school), degree: { pt: degree, en: match?.degree.en ?? degree }, period, note: match?.note }
  })
}

// ---------- merge: idiomas, certificações, competências ----------
const LANG_NAMES: Record<string, LocalText> = {
  english: { pt: 'Inglês', en: 'English' }, ingles: { pt: 'Inglês', en: 'English' },
  portugues: { pt: 'Português', en: 'Portuguese' }, portuguese: { pt: 'Português', en: 'Portuguese' },
  spanish: { pt: 'Espanhol', en: 'Spanish' }, espanhol: { pt: 'Espanhol', en: 'Spanish' },
  french: { pt: 'Francês', en: 'French' }, frances: { pt: 'Francês', en: 'French' },
}
const LEVELS: Record<string, LocalText> = {
  'native or bilingual': { pt: 'Nativo ou bilíngue', en: 'Native or bilingual' },
  'full professional': { pt: 'Profissional completo', en: 'Full professional' },
  'professional working': { pt: 'Profissional', en: 'Professional working' },
  'limited working': { pt: 'Profissional limitado', en: 'Limited working' },
  elementary: { pt: 'Básico', en: 'Elementary' },
}
const languages: { name: LocalText; level: LocalText }[] = linkedin?.languages.length
  ? linkedin.languages.map(item => ({ name: LANG_NAMES[norm(item.name)] ?? both(item.name), level: LEVELS[norm(item.level)] ?? both(item.level) }))
  : extra.languages

export type Course = extra.Course
const courses: Course[] = [
  ...(linkedin?.certifications ?? []).map(name => ({ name, issuer: '', year: '' })),
  ...extra.courses,
]

const skills = base.skills.map((group, i) =>
  i === 0 && linkedin
    ? { ...group, items: [...group.items, ...linkedin.topSkills.filter(skill => !group.items.some(item => norm(item) === norm(skill)))] }
    : group,
)

// ---------- exports ----------
export const profile = {
  ...base.profile,
  name: linkedin?.name || base.profile.name,
  location: linkedin?.location || base.profile.location,
  headline: linkedin?.headline || base.profile.tagline.pt,
  summary: { pt: linkedin?.summary || base.profile.summary.pt, en: base.profile.summary.en },
  // cargo atual = primeira experiência do LinkedIn
  role: linkedin?.experience[0] ? { pt: linkedin.experience[0].position, en: mergeExperiences()[0].position.en } : base.profile.role,
}
export const experiences = mergeExperiences()
export const education = mergeEducation()
export const research = base.research
export { skills, languages, courses }
export const extraSkills = extra.extraSkills
// a primeira frase do efeito de digitação é sempre o cargo atual vindo do LinkedIn
export const headlines = { pt: [profile.role.pt, ...extra.headlines.pt.slice(1)], en: [profile.role.en, ...extra.headlines.en.slice(1)] }
export const allSkills = [...skills, ...extra.extraSkills]
export const dataSource = linkedin ? { from: 'linkedin' as const, importedAt: linkedin.source.importedAt } : { from: 'manual' as const, importedAt: null }

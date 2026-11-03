// Copiloto do recrutador: extrai requisitos de uma descrição de vaga e cruza com evidências do currículo.
import type { Lang } from '../data/resume'
import { chunks, type Chunk } from './knowledge'
import { conceptsIn, conceptById } from './text'

export type Evidence = { title: string; target: string; kind?: Chunk['kind'] }
/** proven = aparece em experiência/formação; declared = só na lista de competências ou no resumo */
export type MatchItem = { id: string; label: string; evidence: Evidence[]; strength?: 'proven' | 'declared' }
export type MatchResult = {
  score: number
  required: number
  matched: MatchItem[]
  missing: MatchItem[]
  verdict: string
}

const priority: Record<Chunk['kind'], number> = { experience: 0, education: 1, skills: 2, research: 3, course: 4, profile: 5 }

export function evidenceFor(conceptId: string, lang: Lang, limit = 3): Evidence[] {
  const all = chunks.filter(chunk => chunk.concepts.includes(conceptId)).sort((a, b) => priority[a.kind] - priority[b.kind])
  // o resumo cita quase tudo: só serve de evidência quando não há nada mais específico
  const specific = all.filter(chunk => chunk.id !== 'profile')
  return (specific.length ? specific : all).slice(0, limit).map(chunk => ({ title: chunk.title[lang], target: chunk.target, kind: chunk.kind }))
}
const PROVEN = new Set<Chunk['kind']>(['experience', 'education', 'research', 'course'])

export function matchJob(description: string, lang: Lang): MatchResult | null {
  // "dados" e "processos" são genéricos demais para contar como requisito sozinhos
  const generic = new Set(['data', 'process', 'planning'])
  let ids = conceptsIn(description)
  const specific = ids.filter(id => !generic.has(id))
  if (specific.length) ids = specific
  if (!ids.length) return null
  const matched: MatchItem[] = []
  const missing: MatchItem[] = []
  for (const id of ids) {
    const label = conceptById(id)!.label[lang]
    const evidence = evidenceFor(id, lang)
    const strength = evidence.some(ev => ev.kind && PROVEN.has(ev.kind)) ? 'proven' : 'declared'
    ;(evidence.length ? matched : missing).push({ id, label, evidence, strength })
  }
  matched.sort((a, b) => (a.strength === b.strength ? 0 : a.strength === 'proven' ? -1 : 1))
  // evidência só "declarada" (lista de skills/resumo) vale meio ponto
  const points = matched.reduce((sum, item) => sum + (item.strength === 'proven' ? 1 : 0.5), 0)
  const score = Math.round((points / ids.length) * 100)
  const verdicts = {
    pt: score >= 80 ? 'Aderência alta: a maior parte dos requisitos tem evidência direta na trajetória.'
      : score >= 55 ? 'Aderência boa: requisitos centrais atendidos, com alguns pontos a aprofundar em entrevista.'
      : 'Aderência parcial: há experiência relacionada, mas vários requisitos não aparecem no currículo.',
    en: score >= 80 ? 'Strong fit: most requirements are backed by direct evidence in the career history.'
      : score >= 55 ? 'Good fit: core requirements are covered, with a few points worth exploring in an interview.'
      : 'Partial fit: there is related experience, but several requirements do not appear in the resume.',
  }
  return { score, required: ids.length, matched, missing, verdict: verdicts[lang] }
}

// Exemplos genéricos de vagas para testar o copiloto com um clique.
export const sampleJobs: { label: { pt: string; en: string }; text: string }[] = [
  {
    label: { pt: 'Analista de dados', en: 'Data analyst' },
    text: 'Analista de Dados. Requisitos: SQL, Python, Power BI, construção de dashboards e KPIs, ETL e integração de dados. Desejável: Machine Learning e inglês.',
  },
  {
    label: { pt: 'Coordenador de logística', en: 'Logistics coordinator' },
    text: 'Coordenador de Logística. Gestão de equipes, inventários e acuracidade de estoque, WMS e SAP, forecast e planejamento de capacidade, indicadores de SLA, melhoria contínua e Lean.',
  },
  {
    label: { pt: 'Automação com IA', en: 'AI automation' },
    text: 'Especialista em Automação com IA. Experiência com agentes de IA e LLMs, Python, APIs REST, integrações, automação de processos, Git e noções de segurança da informação e LGPD.',
  },
]

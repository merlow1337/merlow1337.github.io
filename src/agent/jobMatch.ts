// Copiloto do recrutador: extrai requisitos de uma descrição de vaga e cruza com evidências do currículo.
import type { Lang } from '../data/resume'
import { chunks, type Chunk } from './knowledge'
import { conceptsIn, conceptById, concepts } from './text'

export type Evidence = { title: string; target: string; kind?: Chunk['kind'] }
/** proven = aparece em experiência/formação; declared = só na lista de competências ou no resumo */
export type MatchItem = { id: string; label: string; evidence: Evidence[]; strength?: 'proven' | 'declared' }
export type MatchResult = {
  score: number
  required: number
  matched: MatchItem[]
  missing: MatchItem[]
  verdict: string
  /** trechos da vaga que o dicionário não reconheceu e que, portanto, NÃO entraram no cálculo */
  unrecognized: string[]
  /** tamanho do dicionário de conceitos usado */
  vocabulary: number
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
  // "Power BI" também casa com o conceito genérico "BI": conta uma vez só
  if (ids.includes('powerbi') && !/business intelligence|dashboards?|pain[eé]is/i.test(description)) ids = ids.filter(id => id !== 'bi')
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
  const unrecognized = findUnrecognized(description)
  const proven = matched.filter(item => item.strength === 'proven').length
  const declared = matched.length - proven
  // texto descritivo, sem rótulos como "alta"/"forte": o número só vale para os requisitos que o dicionário reconheceu
  const verdicts = {
    pt: `Dos ${ids.length} requisitos reconhecidos, ${proven} têm evidência em experiência ou formação, ${declared} aparecem só como competência declarada e ${missing.length} não aparecem no currículo.` +
      (unrecognized.length ? ` ${unrecognized.length} trecho(s) da vaga não foram reconhecidos e ficaram fora do cálculo.` : ''),
    en: `Of the ${ids.length} recognized requirements, ${proven} are backed by work or education, ${declared} are only listed as declared skills and ${missing.length} do not appear in the resume.` +
      (unrecognized.length ? ` ${unrecognized.length} part(s) of the job were not recognized and were left out of the score.` : ''),
  }
  return { score, required: ids.length, matched, missing, verdict: verdicts[lang], unrecognized, vocabulary: concepts.length }
}

const FILLER = /^(requisitos?|requirements?|desej[aá]vel|diferencia(l|is)|nice to have|responsabilidades|responsibilities|atividades|experi[eê]ncia( com| em)?|conhecimentos?( em| de)?|no[cç][oõ]es( de)?|dom[ií]nio( de)?|vaga|cargo|e|ou|and|or|with|com|de|em)\b\s*/i
/** Trechos curtos da vaga (itens de lista) sem nenhum conceito conhecido. */
function findUnrecognized(description: string): string[] {
  const out: string[] = []
  for (const raw of description.split(/[,;\n•·|]|\.\s|\s-\s|\s\+\s|\be\b(?=\s+[A-ZÀ-Ú])/)) {
    let part = raw.replace(/^[^:]{0,40}:\s*/, '').trim().replace(/\.$/, '')
    for (let i = 0; i < 4; i++) part = part.replace(FILLER, '').trim()
    const words = part.split(/\s+/).filter(Boolean)
    if (!part || words.length > 6 || part.length < 2) continue
    if (conceptsIn(part).length) continue
    if (!out.some(item => item.toLowerCase() === part.toLowerCase())) out.push(part)
  }
  return out.slice(0, 10)
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

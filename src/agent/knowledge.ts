// Base de conhecimento do agente: o currículo é dividido em "chunks" e indexado com BM25,
// o mesmo algoritmo de ranqueamento usado como baseline em sistemas de RAG (retrieval-augmented generation).
import { profile, experiences, education, allSkills as skills, research, courses, languages, type Lang } from '../data/resume'
import { tokenize, expandQuery, conceptsIn } from './text'

export type ChunkKind = 'profile' | 'experience' | 'education' | 'skills' | 'research' | 'course'

export type Chunk = {
  id: string
  kind: ChunkKind
  title: { pt: string; en: string }
  /** id do elemento HTML para onde a citação leva */
  target: string
  text: { pt: string; en: string }
  /** trecho curto exibido nas respostas */
  snippet?: { pt: string; en: string }
  concepts: string[]
}

const both = (pt: string, en: string) => ({ pt, en })

function buildChunks(): Chunk[] {
  const chunks: Chunk[] = []
  chunks.push({
    id: 'profile',
    kind: 'profile',
    title: both('Perfil profissional', 'Professional profile'),
    target: 'perfil',
    text: profile.summary,
    concepts: [],
  })
  for (const exp of experiences) {
    const text = (lang: Lang) =>
      [exp.company, exp.position[lang], exp.period[lang], exp.location[lang], exp.summary[lang], ...exp.highlights[lang], ...exp.tags].join('. ')
    chunks.push({
      id: exp.id,
      kind: 'experience',
      title: both(exp.position.pt + ' · ' + exp.company, exp.position.en + ' · ' + exp.company),
      target: 'exp-' + exp.id,
      text: both(text('pt'), text('en')),
      snippet: exp.summary,
      concepts: [],
    })
  }
  education.forEach((ed, i) => {
    chunks.push({
      id: 'edu-' + i,
      kind: 'education',
      title: both(ed.degree.pt, ed.degree.en),
      target: 'formacao',
      text: both([ed.degree.pt, ed.school, ed.period, ed.note?.pt ?? ''].join('. '), [ed.degree.en, ed.school, ed.period, ed.note?.en ?? ''].join('. ')),
      concepts: [],
    })
  })
  skills.forEach((group, i) => {
    chunks.push({
      id: 'skills-' + i,
      kind: 'skills',
      title: group.name,
      target: 'competencias',
      text: both(group.name.pt + ': ' + group.items.join(', '), group.name.en + ': ' + group.items.join(', ')),
      concepts: [],
    })
  })
  chunks.push({
    id: 'research',
    kind: 'research',
    title: both(research.name, research.name),
    target: 'pesquisa',
    text: both(research.name + '. ' + research.description.pt, research.name + '. ' + research.description.en),
    concepts: [],
  })
  chunks.push({
    id: 'languages',
    kind: 'profile',
    title: both('Idiomas', 'Languages'),
    target: 'perfil',
    text: both('Idiomas: ' + languages.map(l => l.name.pt + ' (' + l.level.pt + ')').join(', '), 'Languages: ' + languages.map(l => l.name.en + ' (' + l.level.en + ')').join(', ')),
    concepts: [],
  })
  courses.forEach((course, i) => {
    const line = [course.name, course.issuer, course.year].join('. ')
    chunks.push({ id: 'course-' + i, kind: 'course', title: both(course.name, course.name), target: 'cursos', text: both(line, line), concepts: [] })
  })
  for (const chunk of chunks) chunk.concepts = conceptsIn(chunk.text.pt + ' ' + chunk.text.en)
  return chunks
}

export const chunks = buildChunks()

// ---------- BM25 ----------
const K1 = 1.4
const B = 0.75

type IndexedDoc = { chunk: Chunk; tf: Map<string, number>; length: number }

const docs: IndexedDoc[] = chunks.map(chunk => {
  const tokens = tokenize(chunk.title.pt + ' ' + chunk.title.en + ' ' + chunk.text.pt + ' ' + chunk.text.en)
  const tf = new Map<string, number>()
  tokens.forEach(token => tf.set(token, (tf.get(token) ?? 0) + 1))
  return { chunk, tf, length: tokens.length }
})
const avgLength = docs.reduce((sum, doc) => sum + doc.length, 0) / docs.length
const docFreq = new Map<string, number>()
docs.forEach(doc => doc.tf.forEach((_, token) => docFreq.set(token, (docFreq.get(token) ?? 0) + 1)))

function idf(token: string) {
  const n = docFreq.get(token) ?? 0
  return Math.log(1 + (docs.length - n + 0.5) / (n + 0.5))
}

export type SearchHit = { chunk: Chunk; score: number; matched: string[] }

export function search(query: string, options: { limit?: number; kinds?: ChunkKind[] } = {}): SearchHit[] {
  const terms = [...new Set(expandQuery(query))]
  if (!terms.length) return []
  const hits: SearchHit[] = []
  for (const doc of docs) {
    if (options.kinds && !options.kinds.includes(doc.chunk.kind)) continue
    let score = 0
    const matched: string[] = []
    for (const term of terms) {
      const freq = doc.tf.get(term)
      if (!freq) continue
      matched.push(term)
      score += idf(term) * ((freq * (K1 + 1)) / (freq + K1 * (1 - B + (B * doc.length) / avgLength)))
    }
    if (score > 0) hits.push({ chunk: doc.chunk, score, matched })
  }
  hits.sort((a, b) => b.score - a.score)
  return hits.slice(0, options.limit ?? 3)
}

export const indexStats = {
  chunks: chunks.length,
  vocabulary: docFreq.size,
  tokens: docs.reduce((sum, doc) => sum + doc.length, 0),
}

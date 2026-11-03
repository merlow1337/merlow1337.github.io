// O agente só pode citar o que existe no currículo, e as citações precisam levar a algum lugar.
import { describe, expect, it } from 'vitest'
import { runAgent } from '../src/agent/agent'
import { matchJob, sampleJobs } from '../src/agent/jobMatch'
import { experiences } from '../src/data/resume'

const SECTIONS = ['inicio', 'perfil', 'agente', 'experiencia', 'competencias', 'formacao', 'cursos', 'pesquisa', 'conquistas', 'contato']
const validTarget = (target: string) => SECTIONS.includes(target) || experiences.some(exp => 'exp-' + exp.id === target)

const cases: [string, string, RegExp?][] = [
  ['O que ele faz hoje?', 'current', new RegExp(experiences[0].company)],
  ['Ele sabe Power BI e SQL?', 'skillcheck', /Power BI/],
  ['experiência com WMS e auditoria', 'skillcheck', /WMS/],
  ['Qual a experiência com IA?', 'ai', /Inteligência Artificial/],
  ['Como você funciona?', 'agent', /BM25/],
  ['quantos anos de experiência?', 'years', /anos de experiência/],
  ['tem inglês?', 'languages'],
  ['me manda o contato', 'contact'],
  ['tema claro', 'theme'],
  ['What does he do now?', 'current'],
]

describe('roteamento e respostas', () => {
  for (const [question, intent, contains] of cases) {
    it(`"${question}" → ${intent}`, () => {
      const lang = /^[A-Z][a-z]+ does|What/.test(question) ? 'en' : 'pt'
      const reply = runAgent(question, lang)
      expect(reply.trace[0].label).toContain(`intent = ${intent}`)
      expect(reply.text.length).toBeGreaterThan(10)
      if (contains) expect(reply.text).toMatch(contains)
      for (const cite of reply.citations) expect(validTarget(cite.target), cite.target).toBe(true)
      for (const action of reply.actions) if (action.type === 'scroll') expect(validTarget(action.target), action.target).toBe(true)
    })
  }

  it('nunca expõe telefone', () => {
    for (const q of ['qual o telefone?', 'whatsapp', 'contato', 'phone number']) {
      expect(runAgent(q, 'pt').text).not.toMatch(/\(?\b[1-9]{2}\)?[\s-]?9\d{4}[\s-]?\d{4}\b/)
    }
  })

  it('pergunta fora do currículo não inventa resposta', () => {
    expect(runAgent('xyzabc qualquer coisa', 'pt').text).toMatch(/Não encontrei/)
  })
})

describe('copiloto de vagas', () => {
  it('vagas de exemplo geram pontuação entre 0 e 100 com evidências válidas', () => {
    for (const job of sampleJobs) {
      const result = matchJob(job.text, 'pt')!
      expect(result.score).toBeGreaterThanOrEqual(0)
      expect(result.score).toBeLessThanOrEqual(100)
      expect(result.matched.length + result.missing.length).toBe(result.required)
      for (const item of result.matched) for (const ev of item.evidence) expect(validTarget(ev.target), ev.target).toBe(true)
    }
  })

  it('requisito ausente do currículo aparece como ausente', () => {
    const result = matchJob('Requisitos: espanhol fluente e SAP', 'pt')!
    expect(result.missing.map(item => item.id)).toContain('spanish')
    expect(result.matched.map(item => item.id)).toContain('sap')
  })
})

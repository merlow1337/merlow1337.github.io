import type { LocalText } from './curriculum'

// Dados complementares. Preencha com as suas informações reais — as seções
// "Cursos e certificações" e "Idiomas" só aparecem quando há itens aqui.

export type Course = { name: string; issuer: string; year: string; url?: string }

export const courses: Course[] = [
  // { name: 'Nome do curso', issuer: 'Instituição', year: '2025', url: 'https://...' },
]

export const languages: { name: LocalText; level: LocalText }[] = [
  { name: { pt: 'Português', en: 'Portuguese' }, level: { pt: 'Nativo', en: 'Native' } },
  // { name: { pt: 'Inglês', en: 'English' }, level: { pt: 'Intermediário', en: 'Intermediate' } },
]

// Frases que se alternam no topo (efeito de digitação).
export const headlines: { pt: string[]; en: string[] } = {
  pt: [
    'Supervisor de Processos e Inventário',
    'Dados e BI aplicados à logística',
    'Pós-graduação em Inteligência Artificial',
    'Automação de processos com IA',
  ],
  en: [
    'Process & Inventory Supervisor',
    'Data & BI applied to logistics',
    'Postgraduate studies in Artificial Intelligence',
    'AI-driven process automation',
  ],
}

// Grupo extra de competências ligado às pós-graduações em IA e Segurança da Informação.
// Revise e ajuste para refletir exatamente o que você domina.
export const extraSkills = [
  {
    name: { pt: 'IA & segurança', en: 'AI & security' },
    items: ['Inteligência Artificial', 'Agentes de IA', 'Automação de processos', 'Segurança da Informação'],
  },
]

// Quantos bullets de cada experiência entram no PDF ATS (o site sempre mostra todos).
// Cargo atual: todos. Experiências desde `recentSince`: `recent`. Mais antigas: `older`.
export const atsHighlights = { current: Infinity, recentSince: 2022, recent: 3, older: 2 }
// Resumo no PDF: 1º parágrafo + os 2 últimos (foco e áreas de atuação). O site mostra o resumo completo.
export const atsSummary = { first: 1, last: 2 }

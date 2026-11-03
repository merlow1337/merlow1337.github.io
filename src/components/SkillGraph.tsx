import { useMemo, useState } from 'react'
import { experiences, education, allSkills, type Lang } from '../data/resume'
import { conceptsIn, normalize } from '../agent/text'
import { copy } from '../i18n'

type Entity = { id: string; label: string; roles: number; kind: 'company' | 'edu'; text: string; concepts: string[]; target: string }
type SkillNode = { id: string; label: string; group: number; concepts: string[] }

const GENERIC = new Set(['data', 'process', 'planning'])
const W = 860
const H = 700
const CX = W / 2
const CY = H / 2

function buildGraph(lang: Lang) {
  const entities: Entity[] = []
  for (const exp of experiences) {
    const text = [exp.company, exp.position.pt, exp.summary.pt, ...exp.highlights.pt, ...exp.tags].join(' ')
    const existing = entities.find(entity => entity.label === shortName(exp.company))
    if (existing) { existing.text += ' ' + text; existing.roles++; continue }
    entities.push({ id: 'c-' + exp.id, label: shortName(exp.company), roles: 1, kind: 'company', text, concepts: [], target: 'exp-' + exp.id })
  }
  education.forEach((ed, i) => {
    entities.push({ id: 'e-' + i, label: eduName(ed.degree.pt, lang), roles: 1, kind: 'edu', text: ed.degree.pt + ' ' + (ed.note?.pt ?? ''), concepts: [], target: 'formacao' })
  })
  entities.forEach(entity => { entity.concepts = conceptsIn(entity.text) })

  const groups = allSkills
  const skillNodes: SkillNode[] = groups.flatMap((group, g) => group.items.map(item => ({ id: 's-' + normalize(item).replace(/ /g, '-'), label: item, group: g, concepts: conceptsIn(item).filter(c => !GENERIC.has(c) || conceptsIn(item).length === 1) })))

  const edges: [string, string][] = []
  for (const skill of skillNodes) {
    const phrase = ' ' + normalize(skill.label) + ' '
    for (const entity of entities) {
      const direct = (' ' + normalize(entity.text) + ' ').includes(phrase)
      const shared = skill.concepts.some(c => entity.concepts.includes(c))
      if (direct || shared) edges.push([skill.id, entity.id])
    }
  }

  // Layout radial: experiências no anel interno, competências no anel externo (agrupadas por cor).
  const pos = new Map<string, { x: number; y: number; angle: number }>()
  entities.forEach((entity, i) => {
    const angle = (i / entities.length) * Math.PI * 2 - Math.PI / 2
    pos.set(entity.id, { x: CX + Math.cos(angle) * 128, y: CY + Math.sin(angle) * 118, angle })
  })
  skillNodes.forEach((skill, i) => {
    const angle = (i / skillNodes.length) * Math.PI * 2 - Math.PI / 2 + 0.06
    pos.set(skill.id, { x: CX + Math.cos(angle) * 210, y: CY + Math.sin(angle) * 196, angle })
  })
  return { entities, skillNodes, edges, pos, groupNames: groups.map(group => group.name[lang]) }
}

function shortName(company: string) {
  return company.split(' — ')[0].replace('Universidade Federal do Espírito Santo', 'UFES')
}
function eduName(degree: string, lang: Lang) {
  if (/Intelig/.test(degree)) return lang === 'pt' ? 'Pós IA' : 'AI postgrad'
  if (/Segur/.test(degree)) return lang === 'pt' ? 'Pós Segurança' : 'Security postgrad'
  return lang === 'pt' ? 'Arquivologia' : 'Archival Sci.'
}

export function SkillGraph({ lang, onExplore, onGo }: { lang: Lang; onExplore: (count: number) => void; onGo: (target: string) => void }) {
  const t = copy[lang]
  const graph = useMemo(() => buildGraph(lang), [lang])
  const [selected, setSelected] = useState<string | null>(null)
  const [hover, setHover] = useState<string | null>(null)
  const [explored, setExplored] = useState<Set<string>>(new Set())
  const active = hover ?? selected

  const neighbors = useMemo(() => {
    if (!active) return new Set<string>()
    return new Set(graph.edges.filter(edge => edge.includes(active)).map(edge => (edge[0] === active ? edge[1] : edge[0])))
  }, [active, graph])

  const pick = (id: string) => {
    setSelected(previous => (previous === id ? null : id))
    setExplored(previous => {
      const next = new Set(previous).add(id)
      onExplore(next.size)
      return next
    })
  }

  const selectedSkill = graph.skillNodes.find(node => node.id === selected)
  const selectedEntity = graph.entities.find(node => node.id === selected)
  const selectedNeighbors = selected ? graph.edges.filter(edge => edge.includes(selected)).map(edge => (edge[0] === selected ? edge[1] : edge[0])) : []

  return (
    <div className="graph-wrap">
      <div className="graph-canvas">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t.graphTitle}>
          <defs>
            <radialGradient id="graph-core"><stop offset="0%" stopColor="var(--accent)" stopOpacity=".22" /><stop offset="100%" stopColor="var(--accent)" stopOpacity="0" /></radialGradient>
          </defs>
          <circle cx={CX} cy={CY} r="150" fill="url(#graph-core)" />
          <ellipse cx={CX} cy={CY} rx="128" ry="118" className="graph-ring" />
          <ellipse cx={CX} cy={CY} rx="210" ry="196" className="graph-ring" />
          <g>
            {graph.edges.map(([a, b]) => {
              const p = graph.pos.get(a)!
              const q = graph.pos.get(b)!
              const on = active && (a === active || b === active)
              return <path key={a + b} d={`M${p.x},${p.y} Q${CX},${CY} ${q.x},${q.y}`} className={'graph-edge' + (on ? ' on' : active ? ' dim' : '')} />
            })}
          </g>
          {graph.entities.map(entity => {
            const p = graph.pos.get(entity.id)!
            const state = active === entity.id ? ' on' : neighbors.has(entity.id) ? ' near' : active ? ' dim' : ''
            return (
              <g key={entity.id} className={'graph-node entity ' + entity.kind + state} transform={`translate(${p.x},${p.y})`}
                onClick={() => pick(entity.id)} onMouseEnter={() => setHover(entity.id)} onMouseLeave={() => setHover(null)}
                tabIndex={0} role="button" aria-label={entity.label} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); pick(entity.id) } }}>
                <circle r={16} className="hit" />
                <circle r={entity.kind === 'company' ? 9 : 7} />
                <text y={-15} textAnchor="middle">{entity.label}{entity.roles > 1 ? ' ×' + entity.roles : ''}</text>
              </g>
            )
          })}
          {graph.skillNodes.map(skill => {
            const p = graph.pos.get(skill.id)!
            const deg = (p.angle * 180) / Math.PI
            const flip = Math.cos(p.angle) < 0
            const linked = graph.edges.some(edge => edge[0] === skill.id)
            const state = active === skill.id ? ' on' : neighbors.has(skill.id) ? ' near' : active ? ' dim' : ''
            return (
              <g key={skill.id} className={`graph-node skill g${skill.group}${state}${linked ? '' : ' unlinked'}`} transform={`translate(${p.x},${p.y})`}
                onClick={() => pick(skill.id)} onMouseEnter={() => setHover(skill.id)} onMouseLeave={() => setHover(null)}
                tabIndex={0} role="button" aria-label={skill.label} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); pick(skill.id) } }}>
                <circle r={14} className="hit" />
                <circle r={5.5} />
                <text transform={`rotate(${flip ? deg + 180 : deg})`} x={flip ? -11 : 11} y={4} textAnchor={flip ? 'end' : 'start'}>{skill.label.length > 24 ? skill.label.slice(0, 22) + '…' : skill.label}</text>
              </g>
            )
          })}
        </svg>
      </div>
      <aside className="graph-panel">
        <div className="graph-legend">
          {graph.groupNames.map((name, i) => <span key={name}><i className={'dot g' + i} />{name}</span>)}
          <span><i className="dot entity" />{lang === 'pt' ? 'Experiência / formação' : 'Role / education'}</span>
        </div>
        {!selected && <p className="muted">{t.graphPick}</p>}
        {(selectedSkill || selectedEntity) && (
          <div className="graph-detail">
            <span className="kicker">{selectedNeighbors.length} {t.graphConnections}</span>
            <h3>{selectedSkill?.label ?? selectedEntity?.label}</h3>
            {selectedNeighbors.length === 0 && <p className="muted">{t.graphNoLink}</p>}
            <div className="chips">
              {selectedNeighbors.map(id => {
                const entity = graph.entities.find(node => node.id === id)
                const skill = graph.skillNodes.find(node => node.id === id)
                return <button key={id} onClick={() => (entity ? onGo(entity.target) : pick(id))}>{entity?.label ?? skill?.label}{entity && ' ↗'}</button>
              })}
            </div>
          </div>
        )}
        <p className="graph-meta">{graph.skillNodes.length} skills · {graph.entities.length} {lang === 'pt' ? 'entidades' : 'entities'} · {graph.edges.length} {lang === 'pt' ? 'arestas' : 'edges'}</p>
      </aside>
    </div>
  )
}

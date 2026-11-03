import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { profile, experiences, education, type Lang } from '../data/resume'
import { runAgent, type AgentAction } from '../agent/agent'
import { matchJob } from '../agent/jobMatch'
import { indexStats } from '../agent/knowledge'

const HELP = {
  pt: `comandos disponíveis:
  help            lista os comandos
  whoami          quem é o Filipe
  exp | edu       experiências | formação
  skills          competências
  ask <pergunta>  pergunta ao agente Filipe.ai
  match <vaga>    calcula aderência a uma vaga
  agent           abre o agente
  stats           estatísticas do índice do agente
  copy email      copia o e-mail
  theme [nome]    midnight | light | neon
  pdf | json      exporta o currículo
  clear | exit`,
  en: `available commands:
  help            list commands
  whoami          who is Filipe
  exp | edu       experience | education
  skills          skills
  ask <question>  ask the Filipe.ai agent
  match <job>     compute job fit
  agent           open the agent
  stats           agent index statistics
  copy email      copy the email
  theme [name]    midnight | light | neon
  pdf | json      export the resume
  clear | exit`,
}

const strip = (text: string) => text.replace(/\*\*/g, '')

export function Terminal({ lang, onClose, onAction, onOpenAgent, onUse }: { lang: Lang; onClose: () => void; onAction: (action: AgentAction) => void; onOpenAgent: () => void; onUse: () => void }) {
  const [lines, setLines] = useState<string[]>([lang === 'pt' ? 'filipe.ai shell v2.0 — digite help' : 'filipe.ai shell v2.0 — type help'])
  const [cmd, setCmd] = useState('')
  const [history, setHistory] = useState<string[]>([])
  const [cursor, setCursor] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])
  useEffect(() => { logRef.current?.scrollTo({ top: logRef.current.scrollHeight }) }, [lines])
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const out = (...items: string[]) => setLines(previous => [...previous, ...items])

  const run = (event: FormEvent) => {
    event.preventDefault()
    const raw = cmd.trim()
    if (!raw) return
    onUse()
    setCmd('')
    setHistory(previous => [raw, ...previous].slice(0, 30))
    setCursor(-1)
    const [head, ...rest] = raw.split(/\s+/)
    const arg = rest.join(' ')
    const name = head.toLowerCase()
    out('$ ' + raw)
    switch (name) {
      case 'help': out(HELP[lang]); break
      case 'clear': setLines([]); break
      case 'exit': onClose(); break
      case 'whoami': out(profile.name + ' — ' + profile.role[lang], strip(profile.summary[lang])); break
      case 'exp': case 'experience': out(experiences.map(exp => `${exp.period[lang].padEnd(22)} ${exp.company} — ${exp.position[lang]}`).join('\n')); break
      case 'edu': case 'education': out(education.map(ed => `${ed.period.padEnd(12)} ${ed.degree[lang]}`).join('\n')); break
      case 'skills': out(strip(runAgent('skills', lang).text)); break
      case 'stats': out(`chunks=${indexStats.chunks}  vocab=${indexStats.vocabulary}  tokens=${indexStats.tokens}  retriever=BM25(k1=1.4,b=0.75)`); break
      case 'agent': onOpenAgent(); onClose(); break
      case 'ask': {
        if (!arg) { out('usage: ask <pergunta>'); break }
        const reply = runAgent(arg, lang)
        out(...reply.trace.map(step => `  [${step.kind}] ${step.label}`), strip(reply.text))
        reply.actions.filter(action => action.type !== 'scroll').forEach(onAction)
        break
      }
      case 'match': {
        const result = arg ? matchJob(arg, lang) : null
        if (!result) { out('usage: match <descrição da vaga>'); break }
        const bar = '█'.repeat(Math.round(result.score / 5)).padEnd(20, '░')
        out(`fit [${bar}] ${result.score}% (${result.required} requisitos reconhecidos${result.unrecognized.length ? `, ${result.unrecognized.length} fora do dicionário` : ""})`, ...result.matched.map(item => '  ✓ ' + item.label), ...result.missing.map(item => '  ○ ' + item.label))
        break
      }
      case 'copy': onAction({ type: 'copy', value: profile.email }); out('✓ ' + profile.email); break
      case 'theme': {
        const theme = (['midnight', 'light', 'neon'] as const).find(item => item === arg) ?? 'neon'
        onAction({ type: 'theme', theme }); out('theme → ' + theme); break
      }
      case 'pdf': case 'print': onAction({ type: 'pdf' }); out('opening print dialog…'); break
      case 'json': onAction({ type: 'json' }); out('downloading resume.json…'); break
      case 'sudo': out(lang === 'pt' ? 'permissão negada: este terminal é somente leitura 🔒' : 'permission denied: this terminal is read-only 🔒'); break
      default: {
        // Comando desconhecido? Encaminha para o agente como linguagem natural.
        const reply = runAgent(raw, lang)
        out(`  [router] '${head}' ${lang === 'pt' ? 'não é comando → enviado ao agente' : 'is not a command → sent to agent'}`, strip(reply.text))
      }
    }
  }

  const onKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowUp' && history.length) { event.preventDefault(); const next = Math.min(cursor + 1, history.length - 1); setCursor(next); setCmd(history[next]) }
    if (event.key === 'ArrowDown') { event.preventDefault(); const next = Math.max(cursor - 1, -1); setCursor(next); setCmd(next === -1 ? '' : history[next]) }
  }

  return (
    <div className="overlay" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
      <section className="terminal" role="dialog" aria-modal="true" aria-label="Terminal">
        <div className="terminal-bar"><span><i /><i /><i /></span><code>filipe@curriculum:~</code><button className="icon-btn" onClick={onClose} aria-label="Fechar">×</button></div>
        <div className="terminal-log" ref={logRef} role="log" aria-live="polite">{lines.map((line, i) => <pre key={i} className={line.startsWith('$') ? 'in' : ''}>{line}</pre>)}</div>
        <form className="terminal-form" onSubmit={run}><span>$</span><input ref={inputRef} value={cmd} onChange={event => setCmd(event.target.value)} onKeyDown={onKeyDown} spellCheck={false} autoComplete="off" aria-label="Comando" placeholder="help" /></form>
      </section>
    </div>
  )
}

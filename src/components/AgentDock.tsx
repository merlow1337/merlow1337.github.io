import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import type { Lang } from '../data/resume'
import { runAgent, agentSuggestions, type AgentAction, type AgentReply } from '../agent/agent'
import { copy } from '../i18n'
import { MatchView } from './JobCopilot'

type Message = { id: number; role: 'user' | 'agent'; text: string; reply?: AgentReply; visibleSteps?: number; done?: boolean }

const reduceMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export function RichText({ text }: { text: string }) {
  const inline = (line: string): ReactNode[] =>
    line.split(/(\*\*[^*]+\*\*)/g).map((part, i) => (part.startsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : part))
  const blocks = text.split('\n\n')
  return (
    <>
      {blocks.map((block, i) => {
        const lines = block.split('\n')
        if (lines.every(line => /^[•✓○] /.test(line))) {
          return <ul key={i}>{lines.map((line, j) => <li key={j} data-mark={line[0]}>{inline(line.slice(2))}</li>)}</ul>
        }
        const head = lines.filter(line => !/^[•✓○] /.test(line))
        const items = lines.filter(line => /^[•✓○] /.test(line))
        return (
          <div key={i}>
            {head.map((line, j) => <p key={j}>{inline(line)}</p>)}
            {items.length > 0 && <ul>{items.map((line, j) => <li key={j} data-mark={line[0]}>{inline(line.slice(2))}</li>)}</ul>}
          </div>
        )
      })}
    </>
  )
}

type Props = {
  lang: Lang
  open: boolean
  onClose: () => void
  onAction: (action: AgentAction) => void
  onAsked: (count: number) => void
  onMatch: () => void
  question: { text: string; nonce: number } | null
}

export function AgentDock({ lang, open, onClose, onAction, onAsked, onMatch, question }: Props) {
  const t = copy[lang]
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const asked = useRef(0)
  const nextId = useRef(1)
  const logRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const timers = useRef<number[]>([])

  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  useEffect(() => {
    if (open && messages.length === 0) {
      const reply = runAgent('oi', lang)
      setMessages([{ id: nextId.current++, role: 'agent', text: reply.text, reply: { ...reply, trace: [] }, done: true }])
    }
    if (open) setTimeout(() => inputRef.current?.focus(), 60)
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: reduceMotion() ? 'auto' : 'smooth' })
  }, [messages])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const ask = (text: string) => {
    const clean = text.trim()
    if (!clean || busy) return
    setInput('')
    setBusy(true)
    asked.current += 1
    onAsked(asked.current)
    const reply = runAgent(clean, lang)
    if (reply.match) onMatch()
    const agentId = nextId.current++
    setMessages(previous => [...previous, { id: nextId.current++, role: 'user', text: clean }, { id: agentId, role: 'agent', text: '', reply, visibleSteps: 0 }])

    const update = (patch: Partial<Message>) => setMessages(previous => previous.map(msg => (msg.id === agentId ? { ...msg, ...patch } : msg)))
    const finish = () => {
      update({ text: reply.text, done: true, visibleSteps: reply.trace.length })
      reply.actions.forEach(onAction)
      setBusy(false)
    }
    if (reduceMotion()) { finish(); return }

    // 1) revela os passos da execução  2) "digita" a resposta
    reply.trace.forEach((_, i) => timers.current.push(window.setTimeout(() => update({ visibleSteps: i + 1 }), 180 * (i + 1))))
    const start = 180 * (reply.trace.length + 1)
    const words = reply.text.split(/(\s+)/)
    const chunk = Math.max(2, Math.ceil(words.length / 40))
    for (let i = chunk, step = 0; i < words.length + chunk; i += chunk, step++) {
      const slice = words.slice(0, i).join('')
      timers.current.push(window.setTimeout(() => update({ text: slice }), start + step * 28))
    }
    timers.current.push(window.setTimeout(finish, start + Math.ceil(words.length / chunk) * 28 + 40))
  }

  useEffect(() => {
    if (question && open) ask(question.text)
  }, [question?.nonce]) // eslint-disable-line react-hooks/exhaustive-deps

  const submit = (event: FormEvent) => { event.preventDefault(); ask(input) }

  const goTo = (target: string) => {
    onAction({ type: 'scroll', target })
    if (window.matchMedia('(max-width: 720px)').matches) onClose()
  }

  if (!open) return null
  const last = messages[messages.length - 1]

  return (
    <section className="agent-dock" role="dialog" aria-modal="false" aria-label="Filipe.ai">
      <header className="agent-head">
        <div className="agent-id">
          <span className="agent-avatar" aria-hidden="true"><i /></span>
          <div><strong>Filipe.ai</strong><small><b className="live-dot" /> {t.agentLocal}</small></div>
        </div>
        <button className="icon-btn" onClick={onClose} aria-label={t.close}>×</button>
      </header>

      <div className="agent-log" ref={logRef} role="log" aria-live="polite">
        {messages.map(msg => (
          <article key={msg.id} className={'msg msg-' + msg.role}>
            {msg.role === 'user' ? <p>{msg.text}</p> : (
              <>
                {msg.reply && msg.reply.trace.length > 0 && (
                  <details className="trace" open={!msg.done}>
                    <summary>{msg.done ? '⚙ ' + t.agentTrace + ' · ' + msg.reply.trace.length + ' steps' : '⚙ ' + t.agentThinking + '…'}</summary>
                    <ol>
                      {msg.reply.trace.slice(0, msg.visibleSteps ?? msg.reply.trace.length).map((step, i) => (
                        <li key={i} className={'step-' + step.kind}><span>{step.kind}</span><code>{step.label}</code></li>
                      ))}
                    </ol>
                  </details>
                )}
                {msg.text && <div className="msg-body"><RichText text={msg.text} />{!msg.done && <span className="cursor" aria-hidden="true">▍</span>}</div>}
                {msg.done && msg.reply?.match && <MatchView result={msg.reply.match} lang={lang} compact onGo={goTo} />}
                {msg.done && msg.reply && msg.reply.citations.length > 0 && (
                  <div className="sources">
                    <span>{t.agentSources}</span>
                    {msg.reply.citations.map((cite, i) => <button key={i} onClick={() => goTo(cite.target)}><sup>{i + 1}</sup>{cite.title}</button>)}
                  </div>
                )}
              </>
            )}
          </article>
        ))}
      </div>

      {!busy && last?.role === 'agent' && (
        <div className="agent-suggestions">
          {agentSuggestions(lang).map(item => <button key={item} onClick={() => ask(item)}>{item}</button>)}
        </div>
      )}

      <form className="agent-form" onSubmit={submit}>
        <textarea
          ref={inputRef}
          rows={1}
          value={input}
          placeholder={t.agentPlaceholder}
          onChange={event => setInput(event.target.value)}
          onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); ask(input) } }}
          aria-label={t.agentPlaceholder}
        />
        <button type="submit" disabled={busy || !input.trim()} aria-label={t.agentSend}>↑</button>
      </form>
    </section>
  )
}

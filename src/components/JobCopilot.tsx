import { useState } from 'react'
import type { Lang } from '../data/resume'
import { matchJob, sampleJobs, type MatchResult } from '../agent/jobMatch'
import { copy } from '../i18n'

export function Gauge({ value, size = 120 }: { value: number; size?: number }) {
  const r = 46
  const c = 2 * Math.PI * r
  return (
    <svg className="gauge" viewBox="0 0 120 120" width={size} height={size} role="img" aria-label={value + '%'}>
      <circle cx="60" cy="60" r={r} className="gauge-track" />
      <circle cx="60" cy="60" r={r} className="gauge-value" strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} transform="rotate(-90 60 60)" />
      <text x="60" y="66" textAnchor="middle">{value}%</text>
    </svg>
  )
}

export function MatchView({ result, lang, compact, onGo }: { result: MatchResult; lang: Lang; compact?: boolean; onGo: (target: string) => void }) {
  const t = copy[lang]
  return (
    <div className={'match' + (compact ? ' match-compact' : '')}>
      <div className="match-head">
        <Gauge value={result.score} size={compact ? 76 : 120} />
        <div>
          <span className="kicker">{t.fitLabel}</span>
          <p>{result.verdict}</p>
        </div>
      </div>
      <div className="match-cols">
        <div>
          <h4>✓ {t.matched}</h4>
          <ul>
            {result.matched.map(item => (
              <li key={item.id} className={item.strength === 'declared' ? 'is-declared' : ''}>
                <strong>{item.label}{item.strength === 'declared' && <em>{lang === 'pt' ? 'declarada' : 'declared'}</em>}</strong>
                {!compact && <span>{item.evidence.map(ev => <button key={ev.title} onClick={() => onGo(ev.target)}>{ev.title}</button>)}</span>}
              </li>
            ))}
          </ul>
        </div>
        {result.missing.length > 0 && (
          <div>
            <h4>○ {t.missing}</h4>
            <ul>{result.missing.map(item => <li key={item.id} className="is-missing"><strong>{item.label}</strong></li>)}</ul>
          </div>
        )}
        {result.unrecognized.length > 0 && (
          <div>
            <h4>? {t.unrecognized}</h4>
            <p className="match-note">{result.unrecognized.join(' · ')}</p>
          </div>
        )}
      </div>
      {!compact && <p className="match-method">{t.method(result.vocabulary)}</p>}
    </div>
  )
}

export function JobCopilot({ lang, onUse, onGo }: { lang: Lang; onUse: () => void; onGo: (target: string) => void }) {
  const t = copy[lang]
  const [text, setText] = useState('')
  const [result, setResult] = useState<MatchResult | null | undefined>(undefined)

  const run = (value = text) => {
    setText(value)
    setResult(matchJob(value, lang))
    onUse()
  }

  return (
    <div className="copilot">
      <div className="copilot-input">
        <div className="copilot-title"><span className="badge">◎</span><div><h3>{t.copilotTitle}</h3><p>{t.copilotLead}</p></div></div>
        <textarea value={text} onChange={event => setText(event.target.value)} placeholder={t.copilotPlaceholder} rows={6} aria-label={t.copilotTitle} />
        <div className="copilot-actions">
          <button className="btn btn-primary" onClick={() => run()} disabled={!text.trim()}>{t.copilotRun} →</button>
          <div className="samples"><span>{t.copilotTry}</span>{sampleJobs.map(job => <button key={job.label.pt} onClick={() => run(job.text)}>{job.label[lang]}</button>)}</div>
        </div>
      </div>
      <div className="copilot-output" aria-live="polite">
        {result === undefined && (
          <div className="copilot-idle">
            <div className="scan" aria-hidden="true"><i /><i /><i /></div>
            <p>{lang === 'pt' ? 'O resultado aparece aqui: pontuação, requisitos atendidos e onde cada um foi aplicado.' : 'Results show up here: score, matched requirements and where each was applied.'}</p>
          </div>
        )}
        {result === null && <p className="copilot-idle">{t.copilotEmpty}</p>}
        {result && <MatchView result={result} lang={lang} onGo={onGo} />}
      </div>
    </div>
  )
}

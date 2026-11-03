import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { profile, experiences, education, allSkills, research, courses, languages, headlines, dataSource, firstYear, longestCompany, distributionCenters, postgrads, type Lang, type Experience } from './data/resume'
import { copy } from './i18n'
import type { AgentAction } from './agent/agent'
import { AgentDock } from './components/AgentDock'
import { JobCopilot } from './components/JobCopilot'
import { SkillGraph } from './components/SkillGraph'
import { Terminal } from './components/Terminal'
import { ATSResume } from './components/ATSResume'
import { useAchievements, achievementList, maxXp, type AchievementId } from './hooks/useAchievements'

type Theme = 'midnight' | 'light' | 'neon'
type Mode = 'recruiter' | 'agent'
const themes: Theme[] = ['midnight', 'light', 'neon']
const startYear = (exp: Experience) => exp.start?.year ?? Number(/\d{4}/.exec(exp.period.pt)?.[0] ?? 0)
const tenure = longestCompany()
const dcs = distributionCenters()
const researchExp = experiences.find(exp => exp.focus === 'research')

const read = (key: string) => { try { return localStorage.getItem(key) } catch { return null } }
const write = (key: string, value: string) => { try { localStorage.setItem(key, value) } catch { /* opcional */ } }
const reduceMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

function useTyped(lines: readonly string[]) {
  const [text, setText] = useState(lines[0])
  useEffect(() => {
    if (reduceMotion()) { setText(lines[0]); return }
    let line = 0, char = lines[0].length, deleting = true, timer = 0
    const tick = () => {
      const current = lines[line]
      if (deleting) {
        char--
        if (char <= 0) { deleting = false; line = (line + 1) % lines.length }
      } else {
        char++
        if (char >= lines[line].length) { deleting = true; setText(lines[line]); timer = window.setTimeout(tick, 2300); return }
      }
      setText((deleting ? current : lines[line]).slice(0, Math.max(0, char)))
      timer = window.setTimeout(tick, deleting ? 28 : 55)
    }
    timer = window.setTimeout(tick, 2600)
    return () => clearTimeout(timer)
  }, [lines])
  return text
}

export default function App() {
  const [lang, setLang] = useState<Lang>(() => (read('fc-cv-lang') === 'en' ? 'en' : 'pt'))
  const [theme, setTheme] = useState<Theme>(() => (themes.find(item => item === read('fc-cv-theme')) ?? 'midnight'))
  const [mode, setMode] = useState<Mode | null>(() => (read('fc-cv-mode') as Mode | null))
  const [agentOpen, setAgentOpen] = useState(false)
  const fabRef = useRef<HTMLButtonElement>(null)
  const wasOpen = useRef(false)
  // acessibilidade: ao fechar o agente, o foco volta para o botão que o abriu
  useEffect(() => {
    if (wasOpen.current && !agentOpen) fabRef.current?.focus()
    wasOpen.current = agentOpen
  }, [agentOpen])
  const [question, setQuestion] = useState<{ text: string; nonce: number } | null>(null)
  const [terminalOpen, setTerminalOpen] = useState(false)
  const [toasts, setToasts] = useState<{ id: number; title: string; body: string; icon: string }[]>([])
  const [focus, setFocus] = useState('all')
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState<string[]>([])
  const [showEarlier, setShowEarlier] = useState(false)
  const [activeSection, setActiveSection] = useState('inicio')
  const [showFullSummary, setShowFullSummary] = useState(false)
  const t = copy[lang]
  const typed = useTyped(headlines[lang])
  const summaryParagraphs = profile.summary[lang].split(/\n{2,}/)

  const toast = useCallback((title: string, body: string, icon = '✓') => {
    const id = Date.now() + Math.random()
    setToasts(previous => [...previous.slice(-2), { id, title, body, icon }])
    window.setTimeout(() => setToasts(previous => previous.filter(item => item.id !== id)), 3400)
  }, [])

  const onUnlock = useCallback((id: AchievementId) => {
    const item = achievementList.find(entry => entry.id === id)!
    toast(copy[lang].unlocked + ' · +' + item.xp + ' XP', item[lang][0], item.icon)
  }, [lang, toast])
  const { unlocked, unlock, reset, xp } = useAchievements(onUnlock)
  // padrão = leitura direta; a gamificação só liga quando o visitante escolhe o modo agente
  const gamified = mode === 'agent'
  const award = (id: AchievementId) => { if (gamified) unlock(id) }

  useEffect(() => {
    document.documentElement.lang = lang === 'pt' ? 'pt-BR' : 'en'
    document.documentElement.dataset.theme = theme
    write('fc-cv-theme', theme)
    write('fc-cv-lang', lang)
  }, [lang, theme])

  useEffect(() => {
    if (!('IntersectionObserver' in window)) return
    const observer = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
      if (visible) setActiveSection(visible.target.id)
    }, { rootMargin: '-90px 0px -50% 0px', threshold: [0, 0.2] })
    document.querySelectorAll('[data-nav]').forEach(section => observer.observe(section))
    return () => observer.disconnect()
  }, [])

  const chooseMode = (next: Mode) => {
    setMode(next)
    write('fc-cv-mode', next)
    if (next === 'agent') window.setTimeout(() => openAgent(), 350)
  }

  const openAgent = (text?: string) => {
    setAgentOpen(true)
    award('agent')
    if (text) setQuestion({ text, nonce: Date.now() })
  }

  const copyText = (value: string) => {
    navigator.clipboard?.writeText(value).then(() => toast(t.copied, value), () => toast(t.copied, value))
  }

  const downloadJson = () => {
    const data = { profile, experiences, education, skills: allSkills, research, courses, languages, generatedAt: new Date().toISOString() }
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
    const link = Object.assign(document.createElement('a'), { href: url, download: 'filipe-carneiro-resume.json' })
    link.click()
    URL.revokeObjectURL(url)
    award('archivist')
  }

  const printResume = () => { award('archivist'); window.print() }

  const goTo = (target: string) => {
    if (target.startsWith('exp-')) {
      const id = target.slice(4)
      const exp = experiences.find(item => item.id === id)
      setFocus('all'); setQuery('')
      if (exp && startYear(exp) <= 2021) setShowEarlier(true)
      setExpanded(previous => (previous.includes(id) ? previous : [...previous, id]))
    }
    window.setTimeout(() => document.getElementById(target)?.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' }), 60)
  }

  const onAction = (action: AgentAction) => {
    if (action.type === 'scroll') goTo(action.target)
    if (action.type === 'pdf') printResume()
    if (action.type === 'json') downloadJson()
    if (action.type === 'copy') copyText(action.value)
    if (action.type === 'theme') { setTheme(action.theme); award('stylist') }
  }

  const toggle = (id: string) => {
    setExpanded(previous => {
      const next = previous.includes(id) ? previous.filter(item => item !== id) : [...previous, id]
      if (next.length >= 3) award('deepdive')
      return next
    })
  }

  // ---------- trajetória: filtro + agrupamento por empresa ----------
  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase()
    return experiences.filter(exp => {
      if (focus !== 'all' && exp.focus !== focus) return false
      if (!q) return true
      return [exp.company, exp.position[lang], exp.summary[lang], exp.location[lang], ...exp.highlights[lang], ...exp.tags].join(' ').toLocaleLowerCase().includes(q)
    })
  }, [focus, query, lang])

  const grouped = useMemo(() => {
    const groups: { company: string; items: Experience[] }[] = []
    for (const exp of filtered) {
      const last = groups[groups.length - 1]
      if (last && last.company === exp.company) last.items.push(exp)
      else groups.push({ company: exp.company, items: [exp] })
    }
    return groups
  }, [filtered])
  const searching = focus !== 'all' || query.trim() !== ''
  const recent = searching ? grouped : grouped.filter(group => startYear(group.items[group.items.length - 1]) >= 2022)
  const earlier = searching ? [] : grouped.filter(group => startYear(group.items[group.items.length - 1]) < 2022)

  const nav = [
    { id: 'inicio', label: t.nav[0], short: t.navShort[0] },
    { id: 'agente', label: t.nav[1], short: t.navShort[1] },
    { id: 'experiencia', label: t.nav[2], short: t.navShort[2] },
    { id: 'competencias', label: t.nav[3], short: t.navShort[3] },
    { id: 'formacao', label: t.nav[4], short: t.navShort[4] },
  ]
  const filters = ['all', 'operations', 'data', 'leadership', 'research'].map((id, i) => ({ id, label: t.filters[i] }))
  // todos os números vêm dos dados (LinkedIn), nada escrito à mão
  const pad = (n: number) => String(n).padStart(2, '0')
  const stats = [
    [String(new Date().getFullYear() - firstYear), t.stats.years, t.stats.since + ' ' + firstYear],
    ...(dcs ? [[pad(dcs.count), t.stats.dcs, dcs.company]] : []),
    ...(tenure.roles > 1 ? [[pad(tenure.roles), t.stats.roles + ' ' + tenure.company, Math.floor(tenure.months / 12) + (lang === 'pt' ? ' anos de casa' : ' years tenure')]] : []),
    [pad(postgrads().length), t.stats.postgrads, postgrads().map(ed => ed.degree[lang].split('—').pop()!.replace(/\(.*\)|Premium/g, '').trim()).join(' · ')],
  ]
  const quickQuestions = lang === 'pt'
    ? ['O que ele faz hoje?', 'Qual a experiência com IA?', 'Ele sabe SQL e Python?']
    : ['What does he do now?', 'What is his AI background?', 'Does he know SQL and Python?']

  const renderRole = (exp: Experience, nested: boolean) => {
    const open = expanded.includes(exp.id)
    return (
      <div className={nested ? 'role' : 'role role-single'} id={'exp-' + exp.id} key={exp.id}>
        <div className="role-top">
          <div>
            <h3>{exp.position[lang]}</h3>
            <p className="role-meta">{exp.period[lang]} · {exp.location[lang]}</p>
          </div>
          <span className={'focus-pill f-' + exp.focus}>{t.filters[['all', 'operations', 'data', 'leadership', 'research'].indexOf(exp.focus)]}</span>
        </div>
        <p className="role-summary">{exp.summary[lang]}</p>
        <div className="tags">{exp.tags.map(tag => <span key={tag}>{tag}</span>)}</div>
        <button className="expand" onClick={() => toggle(exp.id)} aria-expanded={open}>{open ? t.hide : t.details} <span>{open ? '−' : '+'}</span></button>
        {open && <ul className="role-details">{exp.highlights[lang].map((line, i) => <li key={i}>{line}</li>)}</ul>}
      </div>
    )
  }

  const renderGroup = (group: { company: string; items: Experience[] }) => (
    <article className="company" key={group.company + group.items[0].id}>
      <div className="company-rail"><span className="company-dot" /></div>
      <div className="company-card">
        <header className="company-head">
          <span className="company-mark">{group.company.split(/\s|—/)[0].slice(0, 2).toUpperCase()}</span>
          <div>
            <h3>{group.company}</h3>
            <p>{group.items[group.items.length - 1].period[lang].split('—')[0].trim()} → {group.items[0].period[lang].split('—')[1]?.trim()}{group.items.length > 1 && ` · ${group.items.length} ${t.roles}`}</p>
          </div>
        </header>
        <div className={group.items.length > 1 ? 'ladder' : ''}>{group.items.map(exp => renderRole(exp, group.items.length > 1))}</div>
      </div>
    </article>
  )

  return (
    <>
      <ATSResume lang={lang} />
      <a className="skip" href="#conteudo">{lang === 'pt' ? 'Pular para o conteúdo' : 'Skip to content'}</a>
      <div className="site">
        <header className="topbar">
          <a href="#inicio" className="logo" aria-label={profile.name}>
            <span className="logo-mark">fc<i /></span>
            <span className="logo-text">Filipe Carneiro<small>{gamified ? `XP ${xp}/${maxXp}` : 'CURRICULUM / 2026'}</small></span>
          </a>
          <nav className="nav-desktop" aria-label="Navegação">
            {nav.map(item => <a key={item.id} href={'#' + item.id} className={activeSection === item.id ? 'current' : ''}>{item.label}</a>)}
          </nav>
          <div className="top-actions">
            <button className="icon-btn" title={t.theme + ': ' + t.themeNames[theme]} aria-label={t.theme + ': ' + t.themeNames[theme]} onClick={() => { setTheme(themes[(themes.indexOf(theme) + 1) % 3]); award('stylist') }}>{theme === 'light' ? '☀' : theme === 'neon' ? '✺' : '☾'}</button>
            <button className="icon-btn hide-sm" title={t.terminal} aria-label={t.terminal} onClick={() => setTerminalOpen(true)}>&gt;_</button>
            <button className="lang-btn" onClick={() => { setLang(lang === 'pt' ? 'en' : 'pt'); award('polyglot') }} aria-label={t.lang}>{lang === 'pt' ? 'PT' : 'EN'}<span>⇄</span>{lang === 'pt' ? 'EN' : 'PT'}</button>
            <button className="btn btn-primary btn-sm" onClick={printResume}>↓ <span className="hide-sm">{t.cv}</span></button>
          </div>
        </header>

        <main id="conteudo">
          {mode === null && (
            <aside className="intro-banner" aria-label={t.onboardingTitle}>
              <span className="agent-avatar" aria-hidden="true"><i /></span>
              <p><strong>{t.bannerTitle}</strong> {t.bannerText}</p>
              <button className="btn btn-primary btn-sm" onClick={() => chooseMode('agent')}>✦ {t.onboardingPlay}</button>
              <button className="icon-btn" onClick={() => chooseMode('recruiter')} aria-label={t.close}>×</button>
            </aside>
          )}
          {/* ---------- HERO ---------- */}
          <section className="hero" id="inicio" data-nav>
            <div className="hero-grid" aria-hidden="true" />
            <div className="hero-inner">
              <div className="hero-copy">
                <p className="status"><b className="live-dot" /> {t.agentOnline} · Serra, ES</p>
                <h1>Filipe<br /><span>Carneiro da Silva</span></h1>
                <p className="typed"><span className="sr-only">{headlines[lang].join(' · ')}</span><span aria-hidden="true">{typed}</span><i aria-hidden="true">▍</i></p>
                <p className="statement">{t.statement}</p>
                <p className="intro">{t.intro}</p>
                <div className="hero-cta">
                  <button className="btn btn-primary btn-lg" onClick={() => openAgent()}>✦ {t.askAgent}</button>
                  <a className="btn btn-ghost btn-lg" href="#experiencia">{t.explore} ↓</a>
                </div>
                <div className="quick-asks">
                  {quickQuestions.map(item => <button key={item} onClick={() => openAgent(item)}><span>›</span> {item}</button>)}
                </div>
              </div>
              <div className="hero-visual">
                <div className="photo-card">
                  <div className="photo-scan" aria-hidden="true" />
                  <img src="/portrait.webp" alt={profile.name} width="600" height="840" />
                  <div className="photo-tags" aria-hidden="true">
                    <span className="tag-a">operations</span>
                    <span className="tag-b">data · BI</span>
                    <span className="tag-c">applied AI</span>
                  </div>
                </div>
                <div className="photo-caption"><code>agent.status = "online"</code><span>{profile.role[lang]}</span></div>
              </div>
            </div>
            <div className="stats">
              {stats.map(([value, label, sub]) => <div key={label}><b>{value}</b><span>{label}</span><small>{sub}</small></div>)}
            </div>
          </section>

          {/* ---------- PERFIL + CONTATO ---------- */}
          <section className="section" id="perfil">
            <div className="profile-grid">
              <div className="card">
                <span className="kicker">01 · {t.profileTitle}</span>
                <div className="lead">{summaryParagraphs.slice(0, showFullSummary ? undefined : 2).map((paragraph, i) => <p key={i}>{paragraph}</p>)}</div>
                {summaryParagraphs.length > 2 && <button className="lead-more" onClick={() => setShowFullSummary(!showFullSummary)} aria-expanded={showFullSummary}>{showFullSummary ? (lang === 'pt' ? 'Mostrar menos −' : 'Show less −') : (lang === 'pt' ? 'Ler resumo completo +' : 'Read full summary +')}</button>}
              </div>
              <div className="card contact-card">
                <span className="kicker">{t.contactCard}</span>
                <button className="contact-row" onClick={() => copyText(profile.email)}><span>E-mail</span><strong>{profile.email}</strong><em>{t.copyEmail}</em></button>
                <a className="contact-row" href={profile.linkedin} target="_blank" rel="noreferrer"><span>LinkedIn</span><strong>/in/filipecarneirodasilva</strong><em>↗</em></a>
                <a className="contact-row" href={profile.github} target="_blank" rel="noreferrer"><span>GitHub</span><strong>@srcarneiro1</strong><em>↗</em></a>
                <div className="contact-row static"><span>{t.location}</span><strong>{profile.location}</strong></div>
                <div className="contact-row static"><span>{t.languages}</span><strong>{languages.map(item => item.name[lang] + ' (' + item.level[lang] + ')').join(' · ')}</strong></div>
                <div className="mini-actions"><button onClick={printResume}>↓ PDF ATS</button><button onClick={downloadJson}>{'{ }'} {t.json}</button></div>
              </div>
            </div>
          </section>

          {/* ---------- AGENTE / IA APLICADA ---------- */}
          <section className="section agent-section" id="agente" data-nav>
            <div className="section-head">
              <span className="kicker">02 · {t.agentKicker}</span>
              <h2>{t.agentTitle}</h2>
              <p>{t.agentLead}</p>
            </div>
            <ol className="pipeline">
              {t.pipeline.map(([title, desc], i) => <li key={title}><span>{String(i + 1).padStart(2, '0')}</span><strong>{title}</strong><small>{desc}</small></li>)}
            </ol>
            <div className="agent-cta card">
              <div className="agent-orb" aria-hidden="true"><i /><i /><i /></div>
              <div>
                <h3>Filipe.ai</h3>
                <p>{lang === 'pt' ? 'Pergunte sobre experiências, ferramentas, formação — ou peça para ele navegar, exportar o PDF ou trocar o tema.' : 'Ask about experience, tools, education — or ask it to navigate, export the PDF or switch themes.'}</p>
              </div>
              <button className="btn btn-primary" onClick={() => openAgent()}>{lang === 'pt' ? 'Abrir agente' : 'Open agent'} →</button>
            </div>
            <JobCopilot lang={lang} onUse={() => award('recruiter')} onGo={goTo} />
          </section>

          {/* ---------- TRAJETÓRIA ---------- */}
          <section className="section" id="experiencia" data-nav>
            <div className="section-head">
              <span className="kicker">03 · {t.careerTitle}</span>
              <h2>{t.careerTitle}</h2>
              <p>{t.careerLead}</p>
            </div>
            <div className="toolbar">
              <label className="search">
                <span aria-hidden="true">⌕</span>
                <input type="search" placeholder={t.query} value={query} onChange={event => setQuery(event.target.value)} aria-label={t.query} />
              </label>
              <div className="filters" role="group">
                {filters.map(item => <button key={item.id} aria-pressed={focus === item.id} onClick={() => setFocus(item.id)}>{item.label}</button>)}
              </div>
            </div>
            <p className="count">{String(filtered.length).padStart(2, '0')} {t.results}</p>
            <div className="timeline">
              {recent.map(renderGroup)}
              {filtered.length === 0 && <p className="muted">{t.notFound}</p>}
              {earlier.length > 0 && (
                <div className="earlier">
                  <button className="earlier-toggle" onClick={() => setShowEarlier(!showEarlier)} aria-expanded={showEarlier}>
                    {t.earlier} · {earlier.reduce((sum, group) => sum + group.items.length, 0)} <span>{showEarlier ? '−' : '+'}</span>
                  </button>
                  {showEarlier && earlier.map(renderGroup)}
                </div>
              )}
            </div>
          </section>

          {/* ---------- GRAFO ---------- */}
          <section className="section" id="competencias" data-nav>
            <div className="section-head">
              <span className="kicker">04 · {t.graphTitle}</span>
              <h2>{t.graphTitle}</h2>
              <p>{t.graphLead}</p>
            </div>
            <SkillGraph lang={lang} onGo={goTo} onExplore={count => { if (count >= 5) award('graph') }} />
            <div className="skill-groups">
              {allSkills.map((group, i) => (
                <div className="card" key={i}>
                  <span className={'kicker k' + i}>0{i + 1}</span>
                  <h3>{group.name[lang]}</h3>
                  <div className="tags">{group.items.map(item => <span key={item}>{item}</span>)}</div>
                </div>
              ))}
            </div>
          </section>

          {/* ---------- FORMAÇÃO ---------- */}
          <section className="section" id="formacao" data-nav>
            <div className="section-head"><span className="kicker">05 · {t.eduTitle}</span><h2>{t.eduTitle}</h2></div>
            <div className="edu-grid">
              {education.map((ed, i) => (
                <article className={'card edu' + (/Intelig/.test(ed.degree.pt) ? ' edu-ai' : '')} key={i}>
                  <span className="edu-year">{ed.period}</span>
                  <h3>{ed.degree[lang]}</h3>
                  <p className="muted">{ed.school}</p>
                  {ed.note && <p>{ed.note[lang]}</p>}
                </article>
              ))}
            </div>
            {courses.length > 0 && (
              <div id="cursos">
                <h3 className="sub-title">{t.coursesTitle}</h3>
                <div className="course-list">
                  {courses.map((course, i) => { const meta = [course.issuer, course.year].filter(Boolean).join(' · '); const body = <><strong>{course.name}</strong>{meta && <span>{meta}</span>}</>; return course.url ? <a key={i} className="card course" href={course.url} target="_blank" rel="noreferrer">{body}</a> : <div key={i} className="card course">{body}</div> })}
                </div>
              </div>
            )}
            <div className="card research" id="pesquisa">
              <span className="kicker">{researchExp ? researchExp.company.replace(/.*—\s*/, '').replace('Universidade Federal do Espírito Santo', 'UFES') + ' · ' + researchExp.period[lang] + ' · ' : ''}{t.researchTitle}</span>
              <h3>{research.name}</h3>
              <p>{research.description[lang]}</p>
              <a className="btn btn-ghost" href={profile.research} target="_blank" rel="noreferrer">{t.researchBtn} ↗</a>
            </div>
          </section>

          {/* ---------- CONQUISTAS ---------- */}
          {gamified && (
            <section className="section" id="conquistas">
              <div className="section-head row">
                <div><span className="kicker">06 · {t.achTitle}</span><h2>{t.achTitle}</h2><p>{t.achLead}</p></div>
                <button className="btn btn-ghost btn-sm" onClick={reset}>{t.reset}</button>
              </div>
              <div className="xp"><div className="xp-bar"><i style={{ width: (xp / maxXp) * 100 + '%' }} /></div><span>{xp}/{maxXp} XP · {unlocked.length}/{achievementList.length}</span></div>
              <div className="ach-grid">
                {achievementList.map(item => {
                  const done = unlocked.includes(item.id)
                  return (
                    <div key={item.id} className={'ach' + (done ? ' done' : '')}>
                      <span className="ach-icon">{done ? item.icon : '🔒'}</span>
                      <div><strong>{item[lang][0]}</strong><small>{item[lang][1]}</small></div>
                      <em>+{item.xp}</em>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* ---------- CONTATO ---------- */}
          <section className="contact" id="contato">
            <span className="kicker">{lang === 'pt' ? 'CONTATO' : 'CONTACT'}</span>
            <h2>{t.contactTitle}</h2>
            <p>{t.contactLead}</p>
            <div className="contact-actions">
              <button className="btn btn-primary" onClick={() => copyText(profile.email)}>✉ {profile.email}</button>
              <a className="btn btn-ghost" href={profile.linkedin} target="_blank" rel="noreferrer">LinkedIn ↗</a>
              <a className="btn btn-ghost" href={profile.github} target="_blank" rel="noreferrer">GitHub ↗</a>
            </div>
            <small>{t.privacy}</small>
          </section>
        </main>

        <footer className="footer">
          <span>© {new Date().getFullYear()} {profile.name}</span>
          <span>{t.footer}{dataSource.importedAt && ` · ${lang === 'pt' ? 'dados do LinkedIn de' : 'LinkedIn data from'} ${new Date(dataSource.importedAt).toLocaleDateString(lang === 'pt' ? 'pt-BR' : 'en-US')}`}</span>
          <span className="footer-actions">
            <button onClick={() => setTerminalOpen(true)}>&gt;_ {t.terminal}</button>
            <button onClick={() => chooseMode(gamified ? 'recruiter' : 'agent')}>{gamified ? t.onboardingRead : '✦ ' + t.onboardingPlay}</button>
          </span>
        </footer>

        <nav className="mobile-nav" aria-label="Navegação">
          {nav.map(item => <a key={item.id} href={'#' + item.id} className={activeSection === item.id ? 'current' : ''}>{item.short}</a>)}
        </nav>
      </div>

      {!agentOpen && (
        <button ref={fabRef} className="agent-fab" onClick={() => openAgent()} aria-label={t.askAgent}>
          <span className="agent-avatar" aria-hidden="true"><i /></span><span className="fab-label">{t.askAgent}</span>
        </button>
      )}
      <AgentDock
        lang={lang}
        open={agentOpen}
        onClose={() => setAgentOpen(false)}
        onAction={onAction}
        onAsked={count => { if (count >= 3) award('curious') }}
        onMatch={() => award('recruiter')}
        question={question}
      />
      {terminalOpen && <Terminal lang={lang} onClose={() => setTerminalOpen(false)} onAction={onAction} onOpenAgent={() => openAgent()} onUse={() => award('terminal')} />}

      <div className="toasts" aria-live="polite">
        {toasts.map(item => <div className="toast" key={item.id}><span>{item.icon}</span><div><strong>{item.title}</strong><small>{item.body}</small></div></div>)}
      </div>
    </>
  )
}

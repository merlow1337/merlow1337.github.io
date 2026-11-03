import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { profile, experiences, education, skills, research, type Lang } from './data/curriculum'

type Theme = 'midnight' | 'light' | 'neon'
type SectionName = 'overview' | 'experience' | 'education' | 'skills' | 'research'
const copy = {
  pt: {
    nav: ['Início', 'Trajetória', 'Formação', 'Competências', 'Pesquisa'],
    top: 'CURRICULUM / 2026',
    eyebrow: 'CURRÍCULO INTERATIVO',
    subline: 'Uma trajetória conectando processos, dados e tecnologia.',
    intro: 'Minha atuação combina visão operacional, análise de informações e construção de soluções para problemas reais de negócio.',
    cv: 'Exportar currículo ATS',
    printHint: 'Para obter o PDF, escolha “Salvar como PDF” na janela de impressão.',
    explore: 'Explorar trajetória',
    info: 'Visão geral',
    summary: 'Perfil profissional',
    milestones: 'Destaques da trajetória',
    milestoneLabels: ['Centros de Distribuição acompanhados', 'Etapas profissionais na Suzano', 'Pós-graduações lato sensu'],
    career: 'Experiência profissional',
    careerDesc: 'Responsabilidades, contexto e entregas. Selecione uma área ou pesquise por tecnologia, empresa ou atividade.',
    query: 'Buscar por empresa, ferramenta ou atividade...',
    filters: ['Tudo', 'Operações', 'Dados', 'Gestão', 'Pesquisa'],
    details: 'Ver contribuições', hide: 'Ocultar contribuições',
    academic: 'Formação acadêmica',
    expertise: 'Competências',
    expertiseDesc: 'Explore cada área para visualizar conhecimentos e exemplos de aplicação.',
    evidence: 'Aplicação profissional',
    examples: [
      'Inventários, planejamento de capacidade, logística portuária e gestão de processos em operações multiclientes e industriais.',
      'KPIs, análise e consolidação de informações, Power BI, SQL, Python e ferramentas de BI.',
      'Aplicações, integrações e automação de processos com JavaScript, TypeScript e tecnologias web.',
    ],
    research: 'Pesquisa científica',
    researchBtn: 'Consultar pesquisa pública',
    reach: 'Contato profissional',
    footer: 'Currículo digital • Informações organizadas a partir do histórico profissional',
    theme: 'Tema', themeNames: { midnight: 'Escuro', light: 'Claro', neon: 'Neon' },
    terminal: 'Terminal', terminalTip: 'Digite help para consultar os comandos disponíveis.',
    terminalPrompt: 'Digite um comando...', close: 'Fechar',
    welcome: 'Currículo interativo de Filipe Carneiro. Digite help para começar.',
    commands: 'Comandos: help, about, experience, education, skills, research, contact, pdf, clear, exit',
    unknown: 'Comando não reconhecido. Digite help.',
    pdfHelp: 'A janela de impressão permite salvar um PDF com estrutura ATS.',
    notFound: 'Nenhuma experiência encontrada para esse filtro.',
    privacy: 'O PDF de candidatura não inclui foto, temas visuais ou componentes interativos.',
    lang: 'Alterar idioma para inglês',
    resume: 'Resumo profissional',
    work: 'Experiência profissional',
    school: 'Formação acadêmica',
    talent: 'Competências profissionais e técnicas',
    searchLabel: 'Busca de experiências',
    detailTitle: 'Principais atividades',
    year: '2026',
    photoPending: 'FOTO EM PREPARAÇÃO',
    openMenu: 'Abrir navegação',
    clear: 'Limpar busca',
  },
  en: {
    nav: ['Home', 'Career', 'Education', 'Skills', 'Research'],
    top: 'CURRICULUM / 2026',
    eyebrow: 'INTERACTIVE RESUME',
    subline: 'A career connecting processes, data and technology.',
    intro: 'I bring together operational insight, information analysis and the development of solutions to real business problems.',
    cv: 'Export ATS resume',
    printHint: 'Select “Save as PDF” in the print dialog.',
    explore: 'Explore experience',
    info: 'Overview',
    summary: 'Professional profile',
    milestones: 'Career highlights',
    milestoneLabels: ['Distribution centers monitored', 'Positions held at Suzano', 'Postgraduate specializations'],
    career: 'Professional experience',
    careerDesc: 'Responsibilities, context and contributions. Filter by area or search for tools, employers or activities.',
    query: 'Search employer, tool or activity...',
    filters: ['All', 'Operations', 'Data', 'Leadership', 'Research'],
    details: 'View contributions', hide: 'Hide contributions',
    academic: 'Education',
    expertise: 'Skills',
    expertiseDesc: 'Select an area to explore skills and related work examples.',
    evidence: 'Professional application',
    examples: [
      'Inventory, capacity planning, port logistics and process management in industrial and multi-client operations.',
      'KPIs, data consolidation, Power BI, SQL, Python and business intelligence tools.',
      'Applications, integrations and process automation using JavaScript, TypeScript and web technologies.',
    ],
    research: 'Scientific research',
    researchBtn: 'View public research',
    reach: 'Professional contact',
    footer: 'Digital resume • Information organized from professional employment history',
    theme: 'Theme', themeNames: { midnight: 'Dark', light: 'Light', neon: 'Neon' },
    terminal: 'Terminal', terminalTip: 'Type help to see the available commands.',
    terminalPrompt: 'Enter a command...', close: 'Close',
    welcome: "Filipe Carneiro's interactive resume. Type help to get started.",
    commands: 'Commands: help, about, experience, education, skills, research, contact, pdf, clear, exit',
    unknown: 'Unknown command. Type help.',
    pdfHelp: 'The print dialog lets you save an ATS-readable PDF.',
    notFound: 'No experience matched this filter.',
    privacy: 'The application PDF does not include photos, visual themes or interactive elements.',
    lang: 'Mudar idioma para português',
    resume: 'Professional summary',
    work: 'Work experience',
    school: 'Education',
    talent: 'Professional and technical skills',
    searchLabel: 'Search experience',
    detailTitle: 'Key responsibilities',
    year: '2026',
    photoPending: 'PHOTO TO BE ADDED',
    openMenu: 'Open navigation',
    clear: 'Clear search',
  },
} as const

const icons = {
  arrow: '↗',
  down: '↓',
  command: '>_',
}

function ATSResume({ lang }: { lang: Lang }) {
  const t = copy[lang]
  const local = (value: { pt: string; en: string }) => value[lang]
  return (
    <article className="ats-document" aria-label={t.cv}>
      <header className="ats-heading">
        <h1>{profile.name}</h1>
        <p>{profile.location} | {profile.email}</p>
        <p>{profile.linkedin}</p>
      </header>
      <section className="ats-section">
        <h2>{t.resume}</h2>
        <p>{local(profile.summary)}</p>
      </section>
      <section className="ats-section">
        <h2>{t.work}</h2>
        {experiences.map((exp, index) => (
          <div className="ats-job" key={exp.id}>
            <h3>{local(exp.position)} - {exp.company}</h3>
            <p className="ats-dates">{local(exp.period)} | {local(exp.location)}</p>
            <p>{local(exp.summary)}</p>
            <ul>{exp.highlights[lang].slice(0, index < 5 ? 3 : index === 6 ? 2 : 1).map((line, i) => <li key={i}>{line}</li>)}</ul>
          </div>
        ))}
      </section>
      <section className="ats-section">
        <h2>{t.school}</h2>
        {education.map((ed, i) => (
          <p className="ats-education" key={i}><strong>{local(ed.degree)}</strong> - {ed.school} ({ed.period})</p>
        ))}
      </section>
      <section className="ats-section">
        <h2>{t.talent}</h2>
        {skills.map((group, i) => (
          <p className="ats-skill" key={i}><strong>{local(group.name)}:</strong> {group.items.join(', ')}</p>
        ))}
      </section>
    </article>
  )
}

function App() {
  const [lang, setLang] = useState<Lang>(() => {
    try { return localStorage.getItem('fc-cv-lang') === 'en' ? 'en' : 'pt' } catch { return 'pt' }
  })
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const item = localStorage.getItem('fc-cv-theme')
      return item === 'light' || item === 'neon' ? item : 'midnight'
    } catch { return 'midnight' }
  })
  const [focus, setFocus] = useState('all')
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState<string[]>(['unilog', 'suzano-imigrantes'])
  const [skillTab, setSkillTab] = useState(0)
  const [terminalOpen, setTerminalOpen] = useState(false)
  const [command, setCommand] = useState('')
  const [lines, setLines] = useState<string[]>([])
  const [activeSection, setActiveSection] = useState<SectionName>('overview')
  const inputRef = useRef<HTMLInputElement>(null)
  const t = copy[lang]
  const local = (text: { pt: string; en: string }) => text[lang]

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase()
    return experiences.filter(exp => {
      if (focus !== 'all' && exp.focus !== focus) return false
      if (!q) return true
      return [exp.company, local(exp.position), local(exp.summary), local(exp.location),
        ...exp.highlights[lang], ...exp.tags].join(' ').toLocaleLowerCase().includes(q)
    })
  }, [focus, query, lang])

  useEffect(() => {
    document.title = 'Filipe Carneiro da Silva'
    document.documentElement.lang = lang === 'pt' ? 'pt-BR' : 'en'
    document.documentElement.dataset.theme = theme
    try {
      localStorage.setItem('fc-cv-theme', theme)
      localStorage.setItem('fc-cv-lang', lang)
    } catch { /* Local preferences are optional. */ }
  }, [lang, theme])

  useEffect(() => {
    if (!terminalOpen) return
    inputRef.current?.focus()
    const onKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setTerminalOpen(false)
    }
    window.addEventListener('keydown', onKeydown)
    return () => window.removeEventListener('keydown', onKeydown)
  }, [terminalOpen])

  useEffect(() => {
    if (!('IntersectionObserver' in window)) return
    const sections = document.querySelectorAll<HTMLElement>('[data-navsection]')
    const observer = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)
      const current = visible[0]?.target.getAttribute('data-navsection')
      if (current) setActiveSection(current as SectionName)
    }, { rootMargin: '-100px 0px -48% 0px', threshold: [0, .15, .35] })
    sections.forEach(section => observer.observe(section))
    return () => observer.disconnect()
  }, [])

  const toggle = (id: string) => setExpanded(previous => previous.includes(id) ? previous.filter(item => item !== id) : [...previous, id])
  const printResume = () => window.print()
  const openTerminal = () => {
    setLines([t.welcome])
    setCommand('')
    setTerminalOpen(true)
  }
  const submitTerminal = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const cmd = command.trim().toLowerCase()
    if (!cmd) return
    setCommand('')
    if (cmd === 'exit') { setTerminalOpen(false); return }
    if (cmd === 'clear') { setLines([]); return }
    if (cmd === 'pdf' || cmd === 'print') {
      setLines(previous => [...previous, '$ ' + cmd, t.pdfHelp])
      printResume()
      return
    }
    const responses: Record<string, string> = {
      help: t.commands,
      about: local(profile.summary),
      experience: experiences.map(exp => exp.company + ' — ' + local(exp.position)).join('\n'),
      exp: experiences.map(exp => exp.company + ' — ' + local(exp.position)).join('\n'),
      education: education.map(ed => local(ed.degree)).join('\n'),
      edu: education.map(ed => local(ed.degree)).join('\n'),
      skills: skills.map(group => group.items.join(' · ')).join('\n'),
      research: local(research.description),
      contact: profile.email + ' | ' + profile.linkedin,
    }
    setLines(previous => [...previous, '$ ' + cmd, responses[cmd] || t.unknown])
  }

  const navigation: { section: SectionName; label: string; target: string }[] = [
    { section: 'overview', label: t.nav[0], target: 'inicio' },
    { section: 'experience', label: t.nav[1], target: 'experiencia' },
    { section: 'education', label: t.nav[2], target: 'formacao' },
    { section: 'skills', label: t.nav[3], target: 'competencias' },
    { section: 'research', label: t.nav[4], target: 'pesquisa' },
  ]
  const filters = [
    { id: 'all', label: t.filters[0] },
    { id: 'operations', label: t.filters[1] },
    { id: 'data', label: t.filters[2] },
    { id: 'leadership', label: t.filters[3] },
    { id: 'research', label: t.filters[4] },
  ]

  return (
    <>
      <ATSResume lang={lang} />
      <div className="site">
        <header className="topbar">
          <a href="#inicio" className="logo" aria-label="Filipe Carneiro da Silva">
            <span className="logo-mark">fc<span>.</span></span>
            <span className="logo-title">Filipe Carneiro<small>{t.top}</small></span>
          </a>
          <nav className="nav-desktop" aria-label="Navigation">
            {navigation.map(item => <a key={item.section} href={'#' + item.target} className={activeSection === item.section ? 'current' : ''}>{item.label}</a>)}
          </nav>
          <div className="top-controls">
            <button className="language" onClick={() => setLang(lang === 'pt' ? 'en' : 'pt')} aria-label={t.lang}>{lang.toUpperCase()} <span>⇄</span> {lang === 'pt' ? 'EN' : 'PT'}</button>
            <button className="top-print" onClick={printResume}>{icons.down} <span>PDF ATS</span></button>
          </div>
        </header>
        <main>
          <section className="hero" id="inicio" data-navsection="overview">
            <div className="ambient ambient-a" aria-hidden="true"/>
            <div className="ambient ambient-b" aria-hidden="true"/>
            <div className="hero-inner">
              <div className="hero-content">
                <div className="signal"><i/> {t.eyebrow}<span className="signal-line"/></div>
                <p className="hero-code">portfolio://filipe-carneiro / curriculum</p>
                <h1>Filipe<br/><span>Carneiro da Silva</span></h1>
                <p className="hero-statement">{t.subline}</p>
                <p className="hero-intro">{t.intro}</p>
                <div className="hero-cta">
                  <a className="action-primary" href="#experiencia">{t.explore} <b>↗</b></a>
                  <button className="action-secondary" onClick={printResume}>↓ {t.cv}</button>
                </div>
                <div className="hero-foot"><span>⌖ {profile.location}</span><span>✉ <a href={'mailto:' + profile.email}>{profile.email}</a></span></div>
              </div>
              <div className="hero-visual">
                <div className="orbit orbit-a"/><div className="orbit orbit-b"/>
                <div className="portrait-frame">
                  <div className="portrait-top"><span>PROFILE // 001</span><span>●</span></div>
                  <div className="portrait-placeholder" aria-label={t.photoPending}>
                    <span className="portrait-monogram">FC</span>
                    <span className="portrait-noise">01 — FCS</span>
                  </div>
                  <div className="portrait-bottom"><span>FILIPE CARNEIRO</span><span>BR • ES</span></div>
                </div>
                <div className="floating-label label-one">DATA <span>↗</span></div>
                <div className="floating-label label-two">OPERATIONS <span>↗</span></div>
              </div>
            </div>
            <div className="hero-rail">
              <span>{lang === 'pt' ? 'OPERAÇÕES / DADOS / TECNOLOGIA' : 'OPERATIONS / DATA / TECHNOLOGY'}</span><span>SCROLL TO EXPLORE ↓</span>
            </div>
          </section>

          <div className="theme-panel" aria-label={t.theme}>
            <div className="theme-caption"><span className="terminal-glyph">⌘</span> {t.theme}</div>
            <div className="theme-controls">
              {(['midnight', 'light', 'neon'] as Theme[]).map(item => <button key={item} className={theme === item ? 'theme-choice selected' : 'theme-choice'} onClick={() => setTheme(item)} aria-pressed={theme === item}><i className={'theme-dot theme-' + item}/>{t.themeNames[item]}</button>)}
            </div>
            <button className="theme-terminal" onClick={openTerminal}><span>&gt;_</span> {t.terminal}</button>
          </div>

          <section className="section summary-section" id="perfil">
            <div className="section-title"><span className="section-number">01 / 05</span><h2>{t.summary}</h2><span className="title-line"/></div>
            <div className="summary-grid">
              <div className="summary-body"><p>{local(profile.summary)}</p><a href={profile.linkedin} rel="noreferrer" target="_blank" className="text-link">LinkedIn ↗</a></div>
              <div className="milestones">
                <h3>{t.milestones}</h3>
                {[['23', t.milestoneLabels[0]], ['04', t.milestoneLabels[1]], ['02', t.milestoneLabels[2]]].map(([number, label]) => <div className="milestone" key={number}><b>{number}</b><span>{label}</span></div>)}
                <small>{lang === 'pt' ? 'Dados de escopo e trajetória, não índices de desempenho.' : 'Scope and career facts, not performance scores.'}</small>
              </div>
            </div>
          </section>

          <section className="section experience-section" id="experiencia" data-navsection="experience">
            <div className="section-title"><span className="section-number">02 / 05</span><h2>{t.career}</h2><span className="title-line"/></div>
            <p className="section-subtitle">{t.careerDesc}</p>
            <div className="experience-tools">
              <label className="search-box"><span className="search-icon">⌕</span><span className="sr-only">{t.searchLabel}</span><input type="search" placeholder={t.query} value={query} onChange={event => setQuery(event.target.value)}/>{query && <button onClick={() => setQuery('')} aria-label={t.clear}>×</button>}</label>
              <div className="filter-tabs" aria-label="Experience filters">{filters.map(item => <button key={item.id} onClick={() => setFocus(item.id)} aria-pressed={focus === item.id} className={focus === item.id ? 'is-selected' : ''}>{item.label}</button>)}</div>
            </div>
            <div className="experience-count"><span>RESULTS / {String(filtered.length).padStart(2, '0')}</span><span>{lang === 'pt' ? 'HISTÓRICO PROFISSIONAL' : 'PROFESSIONAL HISTORY'}</span></div>
            <div className="timeline">
              {filtered.map((exp, index) => <article className="career-entry" key={exp.id}>
                <div className="career-index"><span>{String(index + 1).padStart(2, '0')}</span><i/></div>
                <div className="career-content">
                  <div className="career-top"><div><span className="career-company">{exp.company}</span><h3>{local(exp.position)}</h3></div><span className="career-period">{local(exp.period)}</span></div>
                  <p className="career-location">⌖ {local(exp.location)}</p>
                  <p className="career-summary">{local(exp.summary)}</p>
                  <div className="career-tags">{exp.tags.map(tag => <span key={tag}>{tag}</span>)}</div>
                  <button className="career-expand" onClick={() => toggle(exp.id)} aria-expanded={expanded.includes(exp.id)}>{expanded.includes(exp.id) ? t.hide : t.details}<span>{expanded.includes(exp.id) ? '−' : '+'}</span></button>
                  {expanded.includes(exp.id) && <div className="career-detail"><h4>{t.detailTitle}</h4><ul>{exp.highlights[lang].map((text, i) => <li key={i}>{text}</li>)}</ul></div>}
                </div>
              </article>)}
              {filtered.length === 0 && <p className="no-results">{t.notFound}</p>}
            </div>
          </section>

          <section className="section education-section" id="formacao" data-navsection="education">
            <div className="section-title"><span className="section-number">03 / 05</span><h2>{t.academic}</h2><span className="title-line"/></div>
            <div className="education-grid">{education.map((ed, index) => <article className="education-tile" key={index}><span className="education-serial">0{index + 1} <span>↗</span></span><div><p className="education-school">{ed.school}</p><h3>{local(ed.degree)}</h3><span className="education-date">{ed.period}</span>{ed.note && <p>{local(ed.note)}</p>}</div></article>)}</div>
          </section>

          <section className="section skills-section" id="competencias" data-navsection="skills">
            <div className="section-title"><span className="section-number">04 / 05</span><h2>{t.expertise}</h2><span className="title-line"/></div>
            <p className="section-subtitle">{t.expertiseDesc}</p>
            <div className="skill-explorer">
              <div className="skill-selector" role="tablist" aria-label={t.expertise}>
                {skills.map((group, index) => <button key={index} id={'skill-tab-' + index} role="tab" aria-controls="skill-panel" aria-selected={skillTab === index} className={skillTab === index ? 'active' : ''} onClick={() => setSkillTab(index)}><span>0{index + 1}</span><strong>{local(group.name)}</strong><span>↗</span></button>)}
              </div>
              <div className="skill-detail" role="tabpanel" id="skill-panel" aria-labelledby={'skill-tab-' + skillTab}>
                <span className="section-number">CAPABILITIES / 0{skillTab + 1}</span>
                <h3>{local(skills[skillTab].name)}</h3>
                <div className="skill-pills">{skills[skillTab].items.map((skill, index) => <span key={skill} style={{ animationDelay: String(index * 40) + 'ms' }}>{skill}</span>)}</div>
                <div className="skill-evidence"><strong>{t.evidence}</strong><p>{t.examples[skillTab]}</p></div>
              </div>
            </div>
          </section>

          <section className="section research-section" id="pesquisa" data-navsection="research">
            <div className="section-title"><span className="section-number">05 / 05</span><h2>{t.research}</h2><span className="title-line"/></div>
            <div className="research-panel">
              <div className="research-pattern" aria-hidden="true"><i/><i/><i/><i/><i/><i/></div>
              <div className="research-data"><span>UFES / CNPq / 2023—2024</span><h3>{research.name}</h3><p>{local(research.description)}</p><a href={profile.research} target="_blank" rel="noreferrer">{t.researchBtn} ↗</a></div>
            </div>
          </section>
          <section className="contact-section" id="contato">
            <span className="section-number">CONTACT / CONEXÕES</span>
            <h2>{t.reach}</h2>
            <div className="contact-actions"><a href={'mailto:' + profile.email}>✉ {profile.email} ↗</a><a href={profile.linkedin} target="_blank" rel="noreferrer">LinkedIn ↗</a><a href={profile.github} target="_blank" rel="noreferrer">GitHub ↗</a></div>
            <p>{t.privacy}</p>
          </section>
        </main>
        <footer className="footer"><span>© {new Date().getFullYear()} Filipe Carneiro da Silva</span><span>{t.footer}</span><a href="#inicio">↑ TOP</a></footer>
        <div className="mobile-nav">{navigation.map((item, index) => <a key={item.section} href={'#' + item.target} aria-label={item.label} className={activeSection === item.section ? 'active' : ''}><span>{String(index + 1).padStart(2, '0')}</span>{item.label}</a>)}</div>
      </div>

      {terminalOpen && <div className="terminal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setTerminalOpen(false) }}>
        <section className="terminal-window" role="dialog" aria-modal="true" aria-label={t.terminal}>
          <div className="terminal-heading"><span><i/> filipe@curriculum:~</span><button onClick={() => setTerminalOpen(false)} aria-label={t.close}>×</button></div>
          <div className="terminal-lines" role="log" aria-live="polite">{lines.map((line, index) => <p key={index} className={line.startsWith('$') ? 'terminal-inputline' : ''}>{line}</p>)}</div>
          <form onSubmit={submitTerminal} className="terminal-form"><span>$</span><input ref={inputRef} value={command} onChange={event => setCommand(event.target.value)} placeholder={t.terminalPrompt} spellCheck={false} autoComplete="off"/><button type="submit" aria-label="Run command">↵</button></form>
          <p className="terminal-tip">{t.terminalTip}</p>
        </section>
      </div>}
    </>
  )
}
export default App

import { useEffect, useRef, useState, type FormEvent } from 'react'

type Lang = 'pt' | 'en'
type Repo = {
  name: string
  url: string
  label: { pt: string; en: string }
  text: { pt: string; en: string }
  tags: string[]
  type: { pt: string; en: string }
}
type PublicRepoStats = { stargazers_count?: number; updated_at?: string }

const github = 'https://github.com/srcarneiro1'
const linkedin = 'https://www.linkedin.com/in/filipecarneirodasilva/'

const projects: Repo[] = [
  {
    name: 'Archival Network Analysis — APEES',
    url: github + '/archival-network-analysis-apees',
    label: { pt: 'Pesquisa / Dados', en: 'Research / Data' },
    type: { pt: 'Pesquisa acadêmica', en: 'Academic research' },
    text: {
      pt: 'Análise de redes de informação no acervo histórico de inquéritos policiais do APEES. Materiais estruturados para Gephi, GML e OpenRefine.',
      en: 'Information-network analysis of historical police inquiry records from APEES, with materials for Gephi, GML and OpenRefine.',
    },
    tags: ['Data Analysis', 'Gephi', 'GML', 'Archival Science'],
  },
  {
    name: 'Os 7 Hábitos — Guia de Leitura',
    url: github + '/resumo-7-habitos',
    label: { pt: 'Web / Educação', en: 'Web / Education' },
    type: { pt: 'Projeto independente', en: 'Independent project' },
    text: {
      pt: 'Guia educacional responsivo desenvolvido com HTML e CSS, com conteúdo organizado e exemplos práticos.',
      en: 'Responsive educational reading guide built with HTML and CSS, featuring structured explanations and practical examples.',
    },
    tags: ['HTML', 'CSS', 'Responsive Web'],
  },
]

const copy = {
  pt: {
    navAbout: 'Sobre',
    navProjects: 'Projetos',
    navResearch: 'Pesquisa',
    navContact: 'Contato',
    available: 'PORTFÓLIO / ONLINE',
    eyebrow: 'DESENVOLVIMENTO · DADOS · AUTOMAÇÃO',
    headlineA: 'Transformando',
    headlineB: 'complexidade em',
    headlineC: 'soluções confiáveis.',
    intro: 'Conecto processos de negócio ao desenvolvimento de software, criando ferramentas analíticas, fluxos automatizados e aplicações orientadas a resultados.',
    projectCta: 'Explorar projetos',
    terminalCta: 'Abrir terminal',
    focusLabel: 'ÁREAS DE ATUAÇÃO',
    focus: ['Software e aplicações', 'Dados e indicadores', 'Automação de processos', 'Inventários e operações'],
    sectionIndex: '01 / APRESENTAÇÃO',
    aboutTitle: 'Tecnologia aplicada a problemas reais.',
    aboutBody: 'Desenvolvo soluções para análise de dados, eficiência operacional e gestão da informação. Tenho interesse especial em engenharia de software, inteligência artificial aplicada, governança de dados e sistemas seguros, confiáveis e sustentáveis.',
    stackLabel: 'TECNOLOGIAS E PRÁTICAS',
    projectIndex: '02 / TRABALHOS SELECIONADOS',
    projectTitle: 'Projetos & pesquisa',
    projectSubtitle: 'Trabalhos públicos selecionados. Projetos corporativos não são apresentados sem autorização.',
    viewRepo: 'Ver repositório',
    statsLabel: 'INTERAÇÃO PÚBLICA',
    stars: 'estrelas',
    researchIndex: '03 / PESQUISA E INFORMAÇÃO',
    researchTitle: 'Ciência, dados e rastreabilidade.',
    researchBody: 'Pesquiso conexões entre arquivologia, redes de informação e governança. O repositório APEES documenta materiais de pesquisa sem antecipar referências de publicações ainda não lançadas.',
    researchLink: 'Explorar materiais acadêmicos',
    contactIndex: '04 / CONEXÕES',
    contactTitle: 'Vamos conversar sobre tecnologia e processos?',
    contactBody: 'Encontre minha trajetória profissional no LinkedIn e meus projetos públicos no GitHub.',
    footer: 'Construído com React + TypeScript. Hospedado no GitHub Pages.',
    terminalTitle: 'terminal / filipe',
    terminalHint: 'Digite help para ver os comandos disponíveis.',
    terminalPlaceholder: 'Digite um comando...',
    terminalClose: 'Fechar terminal',
    terminalWelcome: 'Bem-vindo ao portfólio interativo de Filipe Carneiro.',
    terminalHelp: 'Comandos: help, about, skills, projects, research, contact, clear, exit',
    terminalUnknown: 'Comando não reconhecido. Digite help.',
    terminalAbout: 'Desenvolvimento de software · Dados · Automação · Governança da informação',
    terminalSkills: 'Python · JavaScript · TypeScript · SQL · PostgreSQL · Power BI · Power Query · GitHub Actions · Google Apps Script',
    terminalProjects: 'Projetos selecionados: archival-network-analysis-apees | resumo-7-habitos',
    terminalResearch: 'Pesquisa em arquivologia, vínculos informacionais e análise de redes; consulte o repositório APEES.',
    terminalContact: 'GitHub: github.com/srcarneiro1 | LinkedIn: linkedin.com/in/filipecarneirodasilva/',
    skip: 'Ir ao conteúdo principal',
    switchLang: 'Change language to English',
    noBackend: 'Este terminal consulta somente dados públicos e textos aprovados; não executa comandos no servidor.',
  },
  en: {
    navAbout: 'About',
    navProjects: 'Projects',
    navResearch: 'Research',
    navContact: 'Contact',
    available: 'PORTFOLIO / ONLINE',
    eyebrow: 'SOFTWARE · DATA · AUTOMATION',
    headlineA: 'Turning',
    headlineB: 'complexity into',
    headlineC: 'reliable solutions.',
    intro: 'I connect business processes with software development, building analytical tools, automated workflows and applications designed for practical outcomes.',
    projectCta: 'Explore projects',
    terminalCta: 'Open terminal',
    focusLabel: 'FOCUS AREAS',
    focus: ['Software & applications', 'Data & analytics', 'Process automation', 'Inventory & operations'],
    sectionIndex: '01 / INTRODUCTION',
    aboutTitle: 'Technology for real-world problems.',
    aboutBody: 'I develop solutions for data analytics, operational efficiency and information management. My interests include software engineering, applied artificial intelligence, data governance and building secure, reliable and maintainable systems.',
    stackLabel: 'TECHNOLOGIES & PRACTICES',
    projectIndex: '02 / SELECTED WORK',
    projectTitle: 'Projects & research',
    projectSubtitle: 'A selection of public work. Corporate projects are not featured without authorization.',
    viewRepo: 'View repository',
    statsLabel: 'PUBLIC ENGAGEMENT',
    stars: 'stars',
    researchIndex: '03 / RESEARCH & INFORMATION',
    researchTitle: 'Research, data and traceability.',
    researchBody: 'I study connections between archival science, information networks and governance. The APEES repository documents research materials without citing unpublished articles.',
    researchLink: 'Explore academic materials',
    contactIndex: '04 / CONNECT',
    contactTitle: 'Let’s discuss technology and processes.',
    contactBody: 'Explore my professional background on LinkedIn and public projects on GitHub.',
    footer: 'Built with React + TypeScript. Hosted on GitHub Pages.',
    terminalTitle: 'terminal / filipe',
    terminalHint: 'Type help for available commands.',
    terminalPlaceholder: 'Enter a command...',
    terminalClose: 'Close terminal',
    terminalWelcome: 'Welcome to Filipe Carneiro’s interactive portfolio.',
    terminalHelp: 'Commands: help, about, skills, projects, research, contact, clear, exit',
    terminalUnknown: 'Command not recognized. Type help.',
    terminalAbout: 'Software development · Data · Automation · Information governance',
    terminalSkills: 'Python · JavaScript · TypeScript · SQL · PostgreSQL · Power BI · Power Query · GitHub Actions · Google Apps Script',
    terminalProjects: 'Selected projects: archival-network-analysis-apees | resumo-7-habitos',
    terminalResearch: 'Research in archival science, information bonds and network analysis; see the APEES repository.',
    terminalContact: 'GitHub: github.com/srcarneiro1 | LinkedIn: linkedin.com/in/filipecarneirodasilva/',
    skip: 'Skip to main content',
    switchLang: 'Mudar idioma para português',
    noBackend: 'This terminal reads public data and approved content only; it does not execute server commands.',
  },
}

function Arrow({ small = false }: { small?: boolean }) {
  return <span aria-hidden="true" className={small ? 'arrow small' : 'arrow'}>↗</span>
}

function App() {
  const [lang, setLang] = useState<Lang>(() => {
    try { return localStorage.getItem('fc-portfolio-language') === 'en' ? 'en' : 'pt' } catch { return 'pt' }
  })
  const [terminalOpen, setTerminalOpen] = useState(false)
  const [command, setCommand] = useState('')
  const [lines, setLines] = useState<string[]>([])
  const [stats, setStats] = useState<Record<string, PublicRepoStats>>({})
  const inputRef = useRef<HTMLInputElement>(null)
  const terminalLog = useRef<HTMLDivElement>(null)
  const t = copy[lang]

  useEffect(() => {
    document.documentElement.lang = lang === 'pt' ? 'pt-BR' : 'en'
    try { localStorage.setItem('fc-portfolio-language', lang) } catch { /* optional preference */ }
  }, [lang])

  useEffect(() => {
    if (!terminalOpen) return
    inputRef.current?.focus()
    const onEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setTerminalOpen(false) }
    window.addEventListener('keydown', onEscape)
    return () => window.removeEventListener('keydown', onEscape)
  }, [terminalOpen])

  useEffect(() => {
    terminalLog.current?.scrollTo({ top: terminalLog.current.scrollHeight })
  }, [lines])

  useEffect(() => {
    const controller = new AbortController()
    Promise.all(projects.map(async p => {
      const name = p.url.split('/').pop()
      try {
        const response = await fetch('https://api.github.com/repos/srcarneiro1/' + name, {
          signal: controller.signal,
          headers: { Accept: 'application/vnd.github+json' },
        })
        if (!response.ok) return null
        const data: PublicRepoStats = await response.json()
        return { name: p.name, data }
      } catch { return null }
    })).then(results => {
      if (controller.signal.aborted) return
      const mapped: Record<string, PublicRepoStats> = {}
      results.forEach(result => { if (result) mapped[result.name] = result.data })
      setStats(mapped)
    })
    return () => controller.abort()
  }, [])

  function openTerminal() {
    setLines([t.terminalWelcome, t.terminalHint])
    setCommand('')
    setTerminalOpen(true)
  }

  function runCommand(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const raw = command.trim()
    if (!raw) return
    const cmd = raw.toLowerCase()
    setCommand('')
    if (cmd === 'exit') { setTerminalOpen(false); return }
    if (cmd === 'clear') { setLines([]); return }
    const out: Record<string, string> = {
      help: t.terminalHelp,
      about: t.terminalAbout,
      skills: t.terminalSkills,
      projects: t.terminalProjects,
      research: t.terminalResearch,
      contact: t.terminalContact,
    }
    setLines(old => [...old, '> ' + raw, out[cmd] ?? t.terminalUnknown])
  }

  return (
    <>
      <a className="skip-link" href="#main">{t.skip}</a>
      <div className="site-shell">
        <header className="site-header">
          <a className="brand" href="#top" aria-label="Filipe Carneiro — Top">
            <span className="brand-icon">FC<span className="brand-dot">.</span></span>
            <span className="brand-label">filipe<span className="brand-slash">/</span>carneiro</span>
          </a>
          <nav aria-label="Primary navigation" className="nav-links">
            <a href="#about">{t.navAbout}</a>
            <a href="#projects">{t.navProjects}</a>
            <a href="#research">{t.navResearch}</a>
            <a href="#contact">{t.navContact}</a>
          </nav>
          <div className="header-actions">
            <button type="button" className="lang-switch" onClick={() => setLang(lang === 'pt' ? 'en' : 'pt')} aria-label={t.switchLang}>
              <span className={lang === 'pt' ? 'active-lang' : ''}>PT</span><span className="lang-divider">/</span><span className={lang === 'en' ? 'active-lang' : ''}>EN</span>
            </button>
            <a className="header-github" href={github} target="_blank" rel="noopener noreferrer" aria-label="GitHub">GH <Arrow small /></a>
          </div>
        </header>

        <main id="main">
          <section className="hero" id="top" aria-labelledby="hero-title">
            <div className="hero-background" aria-hidden="true"><div className="orb orb-one" /><div className="orb orb-two" /></div>
            <div className="hero-copy">
              <span className="status-tag"><span className="status-dot" /> {t.available}</span>
              <p className="overline hero-overline">{t.eyebrow}</p>
              <h1 id="hero-title"><span>{t.headlineA}</span><span>{t.headlineB}</span><span className="gradient-text">{t.headlineC}</span></h1>
              <p className="hero-intro">{t.intro}</p>
              <div className="hero-actions">
                <a className="btn btn-primary" href="#projects">{t.projectCta} <Arrow /></a>
                <button type="button" className="btn btn-outline" onClick={openTerminal}><span className="prompt-glyph">&gt;_</span> {t.terminalCta}</button>
              </div>
            </div>
            <aside className="hero-aside" aria-label={t.focusLabel}>
              <div className="aside-top"><span className="panel-dots"><i/><i/><i/></span><span>profile.config</span></div>
              <div className="code-block"><div><span className="code-purple">const</span> filipe <span className="code-blue">=</span> <span>{'{'}</span></div>
                <div className="indent"><span className="code-blue">focus</span>: [</div>
                {t.focus.map((item, idx) => <div className="indent deep" key={idx}><span className="code-green">"{item}"</span>{idx < t.focus.length - 1 ? ',' : ''}</div>)}
                <div className="indent">],</div>
                <div className="indent"><span className="code-blue">principles</span>: <span className="code-green">"security · reliability · traceability"</span></div>
                <div>{'}'}</div>
              </div>
              <span className="aside-foot"><span className="status-dot"/> all systems operational <span className="aside-version">v1.0</span></span>
            </aside>
            <div className="hero-bottom" aria-hidden="true"><span>SCROLL TO EXPLORE</span><span className="down-arrow">↓</span></div>
          </section>

          <section className="section about-section" id="about">
            <div className="section-heading"><span className="section-index">{t.sectionIndex}</span><h2>{t.aboutTitle}</h2></div>
            <div className="about-grid">
              <p className="large-copy">{t.aboutBody}</p>
              <div className="stack-box"><p className="overline">{t.stackLabel}</p>
                <div className="tech-list">{['Python', 'JavaScript', 'TypeScript', 'SQL', 'PostgreSQL', 'Power BI', 'Power Query', 'GitHub Actions', 'Google Apps Script', 'REST APIs', 'Git'].map(tech => <span className="tech-chip" key={tech}>{tech}</span>)}</div>
              </div>
            </div>
          </section>

          <section className="section projects-section" id="projects">
            <div className="section-heading"><span className="section-index">{t.projectIndex}</span><h2>{t.projectTitle}</h2><p>{t.projectSubtitle}</p></div>
            <div className="projects-grid">
              {projects.map((p, index) => (
                <article className="project-card" key={p.name}>
                  <div className="project-top"><span className="project-id">0{index + 1} / {p.label[lang]}</span><span className="project-symbol" aria-hidden="true">{index === 0 ? '◈' : '⌘'}</span></div>
                  <div className="project-content"><p className="project-type">{p.type[lang]}</p><h3>{p.name}</h3><p className="project-description">{p.text[lang]}</p></div>
                  <div className="project-tags">{p.tags.map(tag => <span key={tag}>{tag}</span>)}</div>
                  <div className="project-bottom">
                    <a href={p.url} target="_blank" rel="noopener noreferrer">{t.viewRepo} <Arrow small /></a>
                    {typeof stats[p.name]?.stargazers_count === 'number' && <span className="project-stars" aria-label={t.statsLabel}>☆ {stats[p.name].stargazers_count} {t.stars}</span>}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="section research-section" id="research">
            <div className="research-content">
              <span className="section-index">{t.researchIndex}</span>
              <h2>{t.researchTitle}</h2>
              <p>{t.researchBody}</p>
              <a className="text-link" href={projects[0].url} target="_blank" rel="noopener noreferrer">{t.researchLink} <Arrow small /></a>
            </div>
            <div className="research-graphic" aria-hidden="true"><div className="research-grid" /><span className="research-node n1"/><span className="research-node n2"/><span className="research-node n3"/><span className="research-node n4"/><span className="research-node n5"/><span className="research-link l1"/><span className="research-link l2"/><span className="research-link l3"/><span className="research-link l4"/><span className="research-caption">NETWORK / INFORMATION / RESEARCH</span></div>
          </section>

          <section className="section contact-section" id="contact">
            <span className="section-index">{t.contactIndex}</span>
            <h2>{t.contactTitle}</h2>
            <p>{t.contactBody}</p>
            <div className="contact-links">
              <a href={linkedin} target="_blank" rel="noopener noreferrer">LinkedIn <Arrow /></a>
              <a href={github} target="_blank" rel="noopener noreferrer">GitHub <Arrow /></a>
              <button type="button" onClick={openTerminal}>Terminal <span aria-hidden="true">↗</span></button>
            </div>
          </section>
        </main>

        <footer className="footer"><span>© {new Date().getFullYear()} Filipe Carneiro</span><span>{t.footer}</span><a href="#top">↑ top</a></footer>
      </div>

      {terminalOpen && <div className="terminal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setTerminalOpen(false) }}>
        <section className="terminal-window" role="dialog" aria-modal="true" aria-label={t.terminalTitle}>
          <div className="terminal-bar"><span className="panel-dots"><i/><i/><i/></span><span>{t.terminalTitle}</span><button type="button" onClick={() => setTerminalOpen(false)} aria-label={t.terminalClose}>×</button></div>
          <div className="terminal-output" ref={terminalLog} role="log" aria-live="polite">{lines.map((line, i) => <p key={i} className={line.startsWith('> ') ? 'command-line' : ''}>{line}</p>)}</div>
          <form className="terminal-form" onSubmit={runCommand}><label htmlFor="terminal-command">$</label><input id="terminal-command" ref={inputRef} value={command} autoComplete="off" onChange={e => setCommand(e.target.value)} placeholder={t.terminalPlaceholder}/><button type="submit" aria-label="Run command">↵</button></form>
          <p className="terminal-disclaimer">{t.noBackend}</p>
        </section>
      </div>}
    </>
  )
}

export default App

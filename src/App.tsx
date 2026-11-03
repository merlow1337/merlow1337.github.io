import { useEffect, useMemo, useState } from 'react'
import { profile, experiences, education, skills, research, type Lang } from './data/curriculum'

const translations = {
  pt: {
    identity: 'CURRÍCULO DIGITAL', intro: 'Trajetória profissional', overview: 'Visão geral', history: 'Experiência', education: 'Formação', skills: 'Competências', study: 'Pesquisa', contact: 'Contato',
    label: 'Operações / Dados / Tecnologia', professional: 'Resumo profissional', experience: 'Experiência profissional', selected: 'Histórico completo de carreira, organizado por função e período.',
    highlight: 'Responsabilidades e entregas', academic: 'Formação acadêmica', abilities: 'Competências técnicas e profissionais', science: 'Pesquisa científica',
    print: 'Salvar currículo em PDF', printHint: 'Use “Salvar como PDF” na janela de impressão.', all: 'Todos', operations: 'Operações', data: 'Dados', leadership: 'Gestão', research: 'Pesquisa',
    open: 'Ver detalhes', close: 'Recolher', mail: 'E-mail', language: 'English', official: 'Vínculo profissional e períodos conforme o LinkedIn atualizado.',
    footer: 'Currículo digital. Dados organizados com base no histórico profissional exportado do LinkedIn.',
    printTitle: 'Currículo profissional', source: 'Ver materiais de pesquisa', connect: 'Links profissionais',
    noMetrics: 'As descrições não afirmam resultados quantitativos não verificados.',
  },
  en: {
    identity: 'DIGITAL RESUME', intro: 'Professional journey', overview: 'Overview', history: 'Experience', education: 'Education', skills: 'Skills', study: 'Research', contact: 'Contact',
    label: 'Operations / Data / Technology', professional: 'Professional summary', experience: 'Work experience', selected: 'Complete professional history, organized by role and period.',
    highlight: 'Responsibilities and contributions', academic: 'Education', abilities: 'Technical and professional skills', science: 'Scientific research',
    print: 'Save resume as PDF', printHint: 'Select “Save as PDF” in your browser’s print dialog.', all: 'All', operations: 'Operations', data: 'Data', leadership: 'Management', research: 'Research',
    open: 'View details', close: 'Collapse', mail: 'Email', language: 'Português', official: 'Roles and dates based on the updated LinkedIn export.',
    footer: 'Digital resume. Professional data based on a LinkedIn profile export.',
    printTitle: 'Professional resume', source: 'View research materials', connect: 'Professional links',
    noMetrics: 'Unverified performance metrics are not claimed in these descriptions.',
  },
}

function App() {
  const [lang, setLang] = useState<Lang>('pt')
  const [focus, setFocus] = useState('all')
  const [expanded, setExpanded] = useState<string[]>(['unilog','suzano-imigrantes'])
  const t = translations[lang]
  const localized = (text: { pt: string; en: string }) => text[lang]
  const filtered = useMemo(() => focus === 'all' ? experiences : experiences.filter(exp => exp.focus === focus), [focus])
  useEffect(() => {
    document.documentElement.lang = lang === 'pt' ? 'pt-BR' : 'en'
    document.title = 'Filipe Carneiro da Silva | ' + t.identity
  }, [lang, t.identity])
  const toggle = (id: string) => setExpanded(current => current.includes(id) ? current.filter(x => x !== id) : [...current,id])
  const filters = [{key:'all',name:t.all},{key:'operations',name:t.operations},{key:'data',name:t.data},{key:'leadership',name:t.leadership},{key:'research',name:t.research}]
  return <div className="layout">
    <a className="skip" href="#content">Skip to content</a>
    <aside className="sidebar">
      <a className="brand" href="#home"><span className="monogram">FC<span>.</span></span><span>filipe / carneiro<small>{t.identity}</small></span></a>
      <p className="menu-label">NAVEGAÇÃO / NAVIGATION</p>
      <nav className="side-nav" aria-label="Sections">
        {[['home',t.overview],['experience',t.history],['education',t.education],['skills',t.skills],['research',t.study],['contact',t.contact]].map(([id,label],index)=><a key={id} href={'#'+id}><span>0{index+1}</span>{label}</a>)}
      </nav>
      <div className="side-bottom">
        <div className="presence"><span className="live-dot"/> {t.label}</div>
        <a href={profile.linkedin} target="_blank" rel="noreferrer">LinkedIn ↗</a>
        <a href={profile.github} target="_blank" rel="noreferrer">GitHub ↗</a>
        <span className="side-note">{t.official}</span>
      </div>
    </aside>
    <div className="workspace">
      <header className="topbar">
        <span className="breadcrumb">FILIPE / <strong>{t.identity}</strong></span>
        <div className="top-actions"><button className="language-toggle" onClick={()=>setLang(lang==='pt'?'en':'pt')} aria-label="Change language">{lang.toUpperCase()} <span>⇄</span> {lang==='pt'?'EN':'PT'}</button><button className="pdf-button" onClick={()=>window.print()}>↧ <span>{t.print}</span></button></div>
      </header>
      <main id="content">
        <section className="intro-section" id="home">
          <div className="eyebrow"><span className="live-dot"/> {t.identity} <span className="separator">/</span> {t.label}</div>
          <h1>Filipe Carneiro <span>da Silva</span></h1>
          <p className="current-role">{localized(profile.role)}</p>
          <p className="motto">{localized(profile.tagline)}</p>
          <div className="contact-inline"><span>⌖ {profile.location}</span><a href={'mailto:'+profile.email}>✉ {profile.email}</a></div>
          <div className="hero-actions"><a href="#experience" className="primary-link">{t.experience} <span>↘</span></a><button onClick={()=>window.print()} className="subtle-link">↓ {t.print}</button></div>
          <div className="fact-strip"><div><span>01</span><strong>{t.operations}</strong><small>{lang==='pt'?'Inventários e logística':'Inventory & logistics'}</small></div><div><span>02</span><strong>{t.data}</strong><small>BI · KPIs · SQL · Python</small></div><div><span>03</span><strong>{lang==='pt'?'Tecnologia':'Technology'}</strong><small>{lang==='pt'?'Automação e aplicações':'Automation & applications'}</small></div></div>
        </section>
        <section className="content-section summary-section" id="about"><div className="section-kicker">01 / {t.professional.toUpperCase()}</div><h2>{t.professional}</h2><p className="summary-copy">{localized(profile.summary)}</p></section>
        <section className="content-section" id="experience">
          <div className="section-kicker">02 / {t.experience.toUpperCase()}</div>
          <h2>{t.intro}<span className="section-number">{experiences.length.toString().padStart(2,'0')} {lang==='pt'?'posições':'roles'}</span></h2>
          <p className="section-lead">{t.selected}</p>
          <div className="filter-bar no-print" aria-label="Filter experience">{filters.map(f=><button key={f.key} className={focus===f.key?'active':''} onClick={()=>setFocus(f.key)} aria-pressed={focus===f.key}>{f.name}</button>)}</div>
          <div className="experience-list">{filtered.map((exp)=> <article className="experience-item" key={exp.id}>
            <div className="timeline-marker" aria-hidden="true"/>
            <div className="experience-meta"><span>{localized(exp.period)}</span><small>{localized(exp.location)}</small></div>
            <div className="experience-main">
              <div className="experience-heading"><div><span className="company-name">{exp.company}</span><h3>{localized(exp.position)}</h3></div><button className="expand no-print" onClick={()=>toggle(exp.id)} aria-expanded={expanded.includes(exp.id)}>{expanded.includes(exp.id)?'−':'+'}<span>{expanded.includes(exp.id)?t.close:t.open}</span></button></div>
              <p>{localized(exp.summary)}</p>
              <div className={'details '+(expanded.includes(exp.id)?'visible':'')}><h4>{t.highlight}</h4><ul>{exp.highlights[lang].map((h,i)=><li key={i}>{h}</li>)}</ul></div>
              <div className="tags">{exp.tags.map(tag=><span key={tag}>{tag}</span>)}</div>
            </div>
          </article>)}</div>
        </section>
        <section className="content-section" id="education"><div className="section-kicker">03 / {t.academic.toUpperCase()}</div><h2>{t.academic}</h2><div className="education-list">{education.map((ed,i)=><article className="education-card" key={i}><span className="education-year">{ed.period}</span><h3>{localized(ed.degree)}</h3><p>{ed.school}</p>{ed.note&&<small>{localized(ed.note)}</small>}</article>)}</div></section>
        <section className="content-section" id="skills"><div className="section-kicker">04 / {t.abilities.toUpperCase()}</div><h2>{t.abilities}</h2><div className="skill-grid">{skills.map((group,i)=><div className="skill-card" key={i}><span className="skill-index">0{i+1} — /</span><h3>{localized(group.name)}</h3><div className="skill-tags">{group.items.map(item=><span key={item}>{item}</span>)}</div></div>)}</div></section>
        <section className="content-section research-section" id="research"><div className="section-kicker">05 / {t.science.toUpperCase()}</div><h2>{t.science}</h2><div className="research-card"><span>UFES · CNPq · 2023—2024</span><h3>{research.name}</h3><p>{localized(research.description)}</p><a href={profile.research} target="_blank" rel="noreferrer">{t.source} ↗</a></div></section>
        <section className="content-section contact-section" id="contact"><div className="section-kicker">06 / {t.contact.toUpperCase()}</div><h2>{t.connect}</h2><div className="contact-grid"><a href={'mailto:'+profile.email}><span>{t.mail}</span><strong>{profile.email}</strong> ↗</a><a href={profile.linkedin} target="_blank" rel="noreferrer"><span>LinkedIn</span><strong>filipecarneirodasilva</strong> ↗</a><a href={profile.github} target="_blank" rel="noreferrer"><span>GitHub</span><strong>srcarneiro1</strong> ↗</a></div></section>
      </main>
      <footer className="footer"><span>© {new Date().getFullYear()} Filipe Carneiro da Silva</span><span>{t.footer}</span></footer>
    </div>
    <div className="print-only print-banner"><h1>{profile.name}</h1><p>{localized(profile.role)} · {profile.location} · {profile.email}</p><p>{profile.linkedin}</p></div>
  </div>
}
export default App

import { profile, experiences, education, allSkills, courses, languages, type Lang, type Experience } from '../data/resume'
import { copy } from '../i18n'
import { atsHighlights, atsSummary } from '../data/extra'

const startYear = (exp: Experience) => exp.start?.year ?? Number(/\d{4}/.exec(exp.period.pt)?.[0] ?? 0)
/** Resumo enxuto para o PDF (ver atsSummary em src/data/extra.ts). */
export function atsSummaryText(summary: string) {
  const paragraphs = summary.split(/\n{2,}/)
  if (paragraphs.length <= atsSummary.first + atsSummary.last) return paragraphs.join(' ')
  return [...paragraphs.slice(0, atsSummary.first), ...paragraphs.slice(-atsSummary.last)].join(' ')
}

/** Bullets que entram no PDF: regra configurável em src/data/extra.ts (atsHighlights). */
export const atsLimit = (exp: Experience) =>
  exp.end === null && exp === experiences[0] ? atsHighlights.current : startYear(exp) >= atsHighlights.recentSince ? atsHighlights.recent : atsHighlights.older

/** Versão do currículo usada no PDF (impressão). Texto puro, sem foto, legível por ATS. */
export function ATSResume({ lang }: { lang: Lang }) {
  const t = copy[lang]
  return (
    <article className="ats-document" aria-hidden="true">
      <h1>{profile.name}</h1>
      <p>{profile.role[lang]} | {profile.location} | {profile.email} | {profile.linkedin}</p>
      <h2>{t.resume}</h2>
      <p>{atsSummaryText(profile.summary[lang])}</p>
      <h2>{t.work}</h2>
      {experiences.map(exp => (
        <div className="ats-job" key={exp.id}>
          <h3>{exp.position[lang]} - {exp.company}</h3>
          <p className="ats-dates">{exp.period[lang]} | {exp.location[lang]}</p>
          <p>{exp.summary[lang]}</p>
          <ul>{exp.highlights[lang].slice(0, atsLimit(exp)).map((line, i) => <li key={i}>{line}</li>)}</ul>
        </div>
      ))}
      <h2>{t.school}</h2>
      {education.map((ed, i) => <p key={i}><strong>{ed.degree[lang]}</strong> - {ed.school} ({ed.period})</p>)}
      {courses.length > 0 && <><h2>{t.coursesTitle}</h2><p>{courses.map(c => c.name + ([c.issuer, c.year].filter(Boolean).length ? ' (' + [c.issuer, c.year].filter(Boolean).join(', ') + ')' : '')).join('; ')}</p></>}
      <h2>{t.talent}</h2>
      {allSkills.map((group, i) => <p key={i}><strong>{group.name[lang]}:</strong> {group.items.join(', ')}</p>)}
      <h2>{t.languages}</h2>
      <p>{languages.map(item => item.name[lang] + ' (' + item.level[lang] + ')').join(', ')}</p>
    </article>
  )
}

import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { existsSync, readFileSync } from 'node:fs'
import { profile } from './src/data/curriculum'

/**
 * Gera o JSON-LD (dados estruturados para Google/LinkedIn) a partir dos MESMOS dados do site,
 * para que cargo, formação e links nunca fiquem diferentes entre a página e os metadados.
 */
export function personJsonLd(): Record<string, unknown> {
  const file = 'src/data/linkedin.json'
  const li = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null
  const schools: string[] = li
    ? [...new Set<string>(li.education.map((ed: { school: string }) => ed.school.replace(/\s*\((oficial|official)\)\s*/i, '').trim()))]
    : []
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: li?.name || profile.name,
    jobTitle: li?.experience?.[0]?.position || profile.role.pt,
    worksFor: li?.experience?.[0] ? { '@type': 'Organization', name: li.experience[0].company } : undefined,
    address: { '@type': 'PostalAddress', addressLocality: 'Serra', addressRegion: 'ES', addressCountry: 'BR' },
    url: 'https://srcarneiro1.github.io/',
    image: 'https://srcarneiro1.github.io/portrait.webp',
    sameAs: [profile.linkedin, profile.github],
    alumniOf: schools.map(name => ({ '@type': 'CollegeOrUniversity', name })),
    knowsAbout: ['Gestão de processos', 'Inventários', 'Logística', 'Business Intelligence', 'Power BI', 'SQL', 'Python', 'Inteligência Artificial', 'Segurança da Informação'],
  }
}

const jsonLd = (): Plugin => ({
  name: 'person-json-ld',
  transformIndexHtml: html =>
    html.replace('<!--JSON_LD-->', `<script type="application/ld+json">${JSON.stringify(personJsonLd())}</script>`),
})

export default defineConfig({
  plugins: [react(), jsonLd()],
  base: '/',
})

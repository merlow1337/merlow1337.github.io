import { useCallback, useEffect, useRef, useState } from 'react'

export type AchievementId =
  | 'agent' | 'curious' | 'recruiter' | 'graph' | 'terminal' | 'polyglot' | 'stylist' | 'archivist' | 'deepdive'

export const achievementList: { id: AchievementId; icon: string; xp: number; pt: [string, string]; en: [string, string] }[] = [
  { id: 'agent', icon: '✦', xp: 15, pt: ['Primeiro contato', 'Abriu o Filipe.ai'], en: ['First contact', 'Opened Filipe.ai'] },
  { id: 'curious', icon: '?', xp: 20, pt: ['Mente curiosa', 'Fez 3 perguntas ao agente'], en: ['Curious mind', 'Asked the agent 3 questions'] },
  { id: 'recruiter', icon: '◎', xp: 25, pt: ['Recrutador 2.0', 'Usou o copiloto de vagas'], en: ['Recruiter 2.0', 'Used the job copilot'] },
  { id: 'graph', icon: '⬡', xp: 15, pt: ['Explorador de grafos', 'Explorou 5 nós do grafo'], en: ['Graph explorer', 'Explored 5 graph nodes'] },
  { id: 'terminal', icon: '>_', xp: 10, pt: ['Root access', 'Usou o terminal'], en: ['Root access', 'Used the terminal'] },
  { id: 'deepdive', icon: '↧', xp: 10, pt: ['Mergulho profundo', 'Abriu 3 experiências'], en: ['Deep dive', 'Expanded 3 experiences'] },
  { id: 'polyglot', icon: '⇄', xp: 5, pt: ['Poliglota', 'Trocou o idioma'], en: ['Polyglot', 'Switched language'] },
  { id: 'stylist', icon: '◐', xp: 5, pt: ['Designer', 'Trocou o tema'], en: ['Designer', 'Changed the theme'] },
  { id: 'archivist', icon: '↓', xp: 10, pt: ['Arquivista', 'Exportou PDF ou JSON'], en: ['Archivist', 'Exported PDF or JSON'] },
]

export const maxXp = achievementList.reduce((sum, item) => sum + item.xp, 0)
const KEY = 'fc-cv-achievements'

function load(): AchievementId[] {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] }
}

export function useAchievements(onUnlock: (id: AchievementId) => void) {
  const [unlocked, setUnlocked] = useState<AchievementId[]>(load)
  const ref = useRef(unlocked)
  useEffect(() => {
    ref.current = unlocked
    try { localStorage.setItem(KEY, JSON.stringify(unlocked)) } catch { /* opcional */ }
  }, [unlocked])

  const unlock = useCallback((id: AchievementId) => {
    if (ref.current.includes(id)) return
    ref.current = [...ref.current, id]
    setUnlocked(ref.current)
    onUnlock(id)
  }, [onUnlock])

  const reset = useCallback(() => { ref.current = []; setUnlocked([]) }, [])
  const xp = achievementList.filter(item => unlocked.includes(item.id)).reduce((sum, item) => sum + item.xp, 0)
  return { unlocked, unlock, reset, xp }
}

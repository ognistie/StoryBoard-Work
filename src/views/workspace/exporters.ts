import { MOVE_LABEL, SHOT_LABEL } from '../../lib/context'
import type { ContextDoc, Frame, Project, Scene } from '../../lib/types'
import { parseDialogue } from './scene'

// Documents built from the project: the script (Markdown) and the shot list (CSV).
// The export menu downloads them; the project folder keeps versions of them.

export const slug = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'projeto'

export function download(name: string, data: Blob) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(data)
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 5000)
}

export function scriptMarkdown(project: Project, ordered: Frame[], briefing?: Pick<ContextDoc, 'text'>): Blob {
  const total = ordered.reduce((sum, f) => sum + f.duration, 0)
  const lines = [`# ${project.name}`, '', `${ordered.length} cenas · ${total}s · ${project.aspect}`, '']
  if (briefing) lines.push('## Briefing', '', briefing.text, '')
  ordered.forEach((f, i) => {
    const { speaker, line } = parseDialogue(f.dialogue)
    lines.push(`## Cena ${i + 1} · ${f.title} (${f.duration}s)`, '', `**Plano:** ${SHOT_LABEL[f.shot]} · **Câmera:** ${MOVE_LABEL[f.movement]} · **Formato:** ${f.aspect ?? project.aspect}`, '', f.description, '')
    if (line) lines.push(`> **${speaker ?? 'Fala'}:** ${line}`, '')
  })
  return new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' })
}

/** Semicolon-separated with a BOM, so Excel in PT-BR opens it with the right columns and accents. */
export function shotListCsv(ordered: Frame[], scenes: Scene[]): Blob {
  const rows = [['#', 'Cena', 'Título', 'Plano', 'Movimento', 'Ângulo', 'Duração (s)', 'Personagens', 'Locação', 'Luz', 'Ação', 'Diálogo', 'Status']]
  ordered.forEach((f, i) => {
    const s = scenes.find((x) => x.id === f.sceneId)
    rows.push([String(i + 1), s ? `${s.number}. ${s.heading}` : '', f.title, SHOT_LABEL[f.shot], MOVE_LABEL[f.movement], f.angle, String(f.duration), f.characters.join(', '), f.location, f.lighting, f.action, f.dialogue, f.status])
  })
  const csv = rows.map((r) => r.map((c) => `"${(c ?? '').replace(/"/g, '""')}"`).join(';')).join('\n')
  return new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
}

export const scriptFileName = (project: Project) => `roteiro-${slug(project.name)}.md`
export const shotListFileName = (project: Project) => `decupagem-${slug(project.name)}.csv`

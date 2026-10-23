import { FileDown, FileText, Printer, Table } from 'lucide-react'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { FrameImage } from '../../components/FrameImage'
import { Menu, MenuItem, toast } from '../../components/ui'
import { MOVE_LABEL, SHOT_LABEL } from '../../lib/context'
import { db } from '../../lib/db'
import { useWD } from './context'
import { parseDialogue } from './scene'

function download(name: string, data: Blob) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(data)
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 5000)
}

const slug = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .toLowerCase()

/** Exports the scene plan: PDF, Markdown script, CSV shot list, or the whole project as JSON. */
export function ExportMenu() {
  const { project, ordered, scenes, briefing } = useWD()
  const [printing, setPrinting] = useState(false)

  const markdown = () => {
    const total = ordered.reduce((sum, f) => sum + f.duration, 0)
    const lines = [`# ${project.name}`, '', `${ordered.length} cenas · ${total}s · ${project.aspect}`, '']
    if (briefing) lines.push('## Briefing', '', briefing.text, '')
    ordered.forEach((f, i) => {
      const { speaker, line } = parseDialogue(f.dialogue)
      lines.push(`## Cena ${i + 1} · ${f.title} (${f.duration}s)`, '', `**Plano:** ${SHOT_LABEL[f.shot]} · **Câmera:** ${MOVE_LABEL[f.movement]} · **Formato:** ${f.aspect ?? project.aspect}`, '', f.description, '')
      if (line) lines.push(`> **${speaker ?? 'Fala'}:** ${line}`, '')
    })
    download(`roteiro-${slug(project.name)}.md`, new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' }))
    toast('Roteiro exportado', { tone: 'ok' })
  }

  const shotList = () => {
    const rows = [['#', 'Cena', 'Título', 'Plano', 'Movimento', 'Ângulo', 'Duração (s)', 'Personagens', 'Locação', 'Luz', 'Ação', 'Diálogo', 'Status']]
    ordered.forEach((f, i) => {
      const s = scenes.find((x) => x.id === f.sceneId)
      rows.push([String(i + 1), s ? `${s.number}. ${s.heading}` : '', f.title, SHOT_LABEL[f.shot], MOVE_LABEL[f.movement], f.angle, String(f.duration), f.characters.join(', '), f.location, f.lighting, f.action, f.dialogue, f.status])
    })
    const csv = rows.map((r) => r.map((c) => `"${(c ?? '').replace(/"/g, '""')}"`).join(';')).join('\n')
    download(`shotlist-${slug(project.name)}.csv`, new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
    toast('Shot list exportada', { tone: 'ok' })
  }

  const backup = async () => {
    const toData = (b: Blob) => new Promise<string>((res) => {
      const r = new FileReader()
      r.onload = () => res(r.result as string)
      r.readAsDataURL(b)
    })
    const frames = await db.frames.where('projectId').equals(project.id).toArray()
    const revisions = await db.revisions.where('projectId').equals(project.id).toArray()
    const ids = new Set([...frames.map((f) => f.imageId), ...revisions.map((r) => r.snapshot.imageId)].filter(Boolean) as string[])
    const images = await Promise.all([...ids].map(async (id) => {
      const img = await db.images.get(id)
      return img ? { id, width: img.width, height: img.height, data: await toData(img.blob) } : null
    }))
    const payload = {
      format: 'frameline-project@1',
      exportedAt: new Date().toISOString(),
      project,
      scenes: await db.scenes.where('projectId').equals(project.id).toArray(),
      frames,
      revisions,
      docs: await db.docs.where('projectId').equals(project.id).toArray(),
      assets: await db.assets.where('projectId').equals(project.id).toArray(),
      comments: await db.comments.where('projectId').equals(project.id).toArray(),
      approvals: await db.approvals.where('projectId').equals(project.id).toArray(),
      notes: await db.notes.where('projectId').equals(project.id).toArray(),
      events: await db.events.where('projectId').equals(project.id).toArray(),
      images: images.filter(Boolean),
    }
    download(`${slug(project.name)}.frameline.json`, new Blob([JSON.stringify(payload)], { type: 'application/json' }))
    toast('Pacote do projeto exportado', { tone: 'ok' })
  }

  const print = () => {
    setPrinting(true)
    setTimeout(() => {
      window.print()
      setPrinting(false)
    }, 600)
  }

  return (
    <>
      <Menu
        align="right"
        trigger={(toggle) => (
          <button onClick={toggle} className="flex h-9 items-center rounded-full px-4 text-[14px] leading-[18px] font-medium text-[#18181B] transition-colors hover:bg-black/5">
            Exportar
          </button>
        )}
      >
        {(close) => (
          <>
            <MenuItem icon={<Printer />} onClick={() => (close(), print())}>
              PDF do storyboard
            </MenuItem>
            <MenuItem icon={<FileText />} onClick={() => (close(), markdown())}>
              Roteiro (Markdown)
            </MenuItem>
            <MenuItem icon={<Table />} onClick={() => (close(), shotList())}>
              Shot list (CSV)
            </MenuItem>
            <MenuItem icon={<FileDown />} onClick={() => (close(), backup())}>
              Pacote completo (JSON)
            </MenuItem>
          </>
        )}
      </Menu>
      {printing &&
        createPortal(
          <div className="print-root print-only bg-white p-6 text-black">
            <h1 className="text-xl font-semibold">{project.name}</h1>
            <p className="mb-4 text-[12px] text-neutral-600">
              {project.client} · {project.producer} · {new Date().toLocaleDateString('pt-BR')} · {ordered.length} cenas
            </p>
            <div className="grid grid-cols-3 gap-4">
              {ordered.map((f, i) => (
                <div key={f.id} className="break-inside-avoid">
                  <FrameImage imageId={f.imageId} alt="" aspect={(f.aspect ?? project.aspect).replace(':', ' / ')} className="border border-neutral-300" />
                  <div className="mt-1 text-[11px] font-semibold">
                    {String(i + 1).padStart(2, '0')} · {f.title}
                  </div>
                  <div className="text-[10px] text-neutral-600">
                    {SHOT_LABEL[f.shot]} · {MOVE_LABEL[f.movement]} · {f.duration}s
                  </div>
                  <div className="text-[10px]">{f.description}</div>
                  {f.dialogue && <div className="text-[10px] whitespace-pre-line italic">{f.dialogue}</div>}
                </div>
              ))}
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}

import { Download, FileDown, FileText, FolderInput, Printer, Table } from 'lucide-react'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { FrameImage } from '../../components/FrameImage'
import { Menu, MenuItem, toast, toastError } from '../../components/ui'
import { MOVE_LABEL, SHOT_LABEL } from '../../lib/context'
import { db } from '../../lib/db'
import { download, scriptFileName, scriptMarkdown, shotListCsv, shotListFileName, slug } from './exporters'
import { addFile } from '../../lib/repo'
import { can } from '../../lib/session'
import { useWD } from './context'
import { parseDialogue } from './scene'
import type { Project } from '../../lib/types'

// Vertical drawings need more columns to fit an A4 landscape page.
const PRINT_COLUMNS: Record<Project['aspect'], number> = { '9:16': 5, '1:1': 4, '16:9': 3, '2.39:1': 3 }

/**
 * Exports the scene plan: PDF, Markdown script, CSV shot list, or the whole project as JSON.
 * @param iconOnly A 36px icon instead of the word, for the tablet header where the project name needs the room.
 */
export function ExportMenu({ iconOnly = false }: { iconOnly?: boolean }) {
  const { project, ordered, scenes, briefing, userId, role } = useWD()
  const [printing, setPrinting] = useState(false)

  const markdown = () => {
    download(scriptFileName(project), scriptMarkdown(project, ordered, briefing))
    toast('Roteiro exportado', { tone: 'ok' })
  }

  const shotList = () => {
    download(shotListFileName(project), shotListCsv(ordered, scenes))
    toast('Decupagem exportada', { tone: 'ok' })
  }

  /** Keeps a dated copy of the script and the shot list in the project folder, as new versions. */
  const saveToFolder = async () => {
    try {
      await addFile(project.id, userId, { name: scriptFileName(project), blob: scriptMarkdown(project, ordered, briefing), source: 'export' })
      await addFile(project.id, userId, { name: shotListFileName(project), blob: shotListCsv(ordered, scenes), source: 'export' })
      toast('Roteiro e decupagem salvos na pasta do projeto', { tone: 'ok' })
    } catch (e) {
      toastError(e)
    }
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
      format: 'decupa-project@1',
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
    download(`${slug(project.name)}.decupa.json`, new Blob([JSON.stringify(payload)], { type: 'application/json' }))
    toast('Pacote do projeto exportado', { tone: 'ok' })
  }

  /** Prints once every drawing of the print layout has an image decoded, so no frame comes out blank. */
  const print = () => {
    setPrinting(true)
    const started = performance.now()
    const ready = () => {
      const root = document.querySelector('.print-root')
      const imgs = root ? [...root.querySelectorAll('img')] : []
      // Object URLs resolve from IndexedDB a moment after mounting; wait until each frame has one (at most 5 s).
      const waiting = root && imgs.length < ordered.filter((f) => f.imageId).length && performance.now() - started < 5000
      if (waiting) return void setTimeout(ready, 100)
      void Promise.all(imgs.map((img) => img.decode().catch(() => undefined))).then(() => {
        window.print()
        setPrinting(false)
      })
    }
    requestAnimationFrame(ready)
  }

  return (
    <>
      <Menu
        align="right"
        trigger={(toggle) =>
          iconOnly ? (
            <button onClick={toggle} aria-label="Exportar" title="Exportar" className="flex size-9 items-center justify-center rounded-full text-[#18181B] transition-colors hover:bg-black/5">
              <Download className="size-[18px]" strokeWidth={1.8} aria-hidden />
            </button>
          ) : (
            <button onClick={toggle} className="flex h-9 items-center rounded-full px-4 text-[14px] leading-[18px] font-medium text-[#18181B] transition-colors hover:bg-black/5">
              Exportar
            </button>
          )
        }
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
              Decupagem (CSV)
            </MenuItem>
            <MenuItem icon={<FileDown />} onClick={() => (close(), backup())}>
              Pacote completo (JSON)
            </MenuItem>
            {can(role, 'edit') && (
              <>
                <div className="mx-1 my-1 border-t border-line" />
                <MenuItem icon={<FolderInput />} onClick={() => (close(), void saveToFolder())}>
                  Salvar roteiro e decupagem na pasta
                </MenuItem>
              </>
            )}
          </>
        )}
      </Menu>
      {printing &&
        createPortal(
          <div className="print-root print-only bg-white font-sans text-[#18181B]">
            <header className="flex items-baseline justify-between border-b border-[#E4E4E7] pb-3">
              <span className="font-display text-[26px] leading-8">Decupa</span>
              <span className="text-[11px] text-[#71717B]">{new Date().toLocaleDateString('pt-BR')}</span>
            </header>
            <h1 className="mt-4 text-[22px] leading-7 font-medium tracking-[-0.02em]">{project.name}</h1>
            <p className="mt-0.5 text-[12px] text-[#71717B]">
              {ordered.length} cenas · {ordered.reduce((sum, f) => sum + f.duration, 0)}s · {project.aspect}
            </p>
            {briefing && <p className="mt-3 max-w-[70%] text-[11px] leading-4 text-[#3F3F46]">{briefing.text}</p>}
            <div className="mt-5 grid gap-4" style={{ gridTemplateColumns: `repeat(${PRINT_COLUMNS[project.aspect]}, minmax(0, 1fr))` }}>
              {ordered.map((f, i) => {
                const { speaker, line } = parseDialogue(f.dialogue)
                return (
                  <div key={f.id} className="break-inside-avoid">
                    <FrameImage imageId={f.imageId} alt="" aspect={(f.aspect ?? project.aspect).replace(':', ' / ')} className="rounded-[10px] border border-[#E4E4E7]" />
                    <div className="mt-2 flex items-baseline justify-between gap-2 text-[11px] leading-[14px] font-medium">
                      <span>
                        Cena {i + 1} · {f.title}
                      </span>
                      <span className="text-[#71717B]">{f.duration}s</span>
                    </div>
                    <div className="mt-0.5 text-[9px] leading-3 tracking-[0.04em] text-[#71717B] uppercase">
                      {SHOT_LABEL[f.shot]} · {MOVE_LABEL[f.movement]}
                    </div>
                    <p className="mt-1 text-[10px] leading-[14px] text-[#3F3F46]">{f.description}</p>
                    {line && (
                      <p className="mt-1 text-[10px] leading-[14px]">
                        {speaker && <span className="text-[#71717B]">{speaker}: </span>}“{line}”
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}

import { Download, FileDown, FileText, FolderInput, Printer, Table } from 'lucide-react'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { FrameImage } from '../../components/FrameImage'
import { Menu, MenuItem, toast, toastError } from '../../components/ui'
import { MOVE_LABEL, SHOT_LABEL } from '../../lib/context'
import { db } from '../../lib/db'
import { fetchBlob } from '../../lib/collab/sync'
import { download, scriptFileName, scriptMarkdown, shotListCsv, shotListFileName, slug } from './exporters'
import { addFile } from '../../lib/repo'
import { can } from '../../lib/session'
import { useWD } from './context'
import { parseDialogue } from './scene'


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
    const toData = (b: Blob) => new Promise<string>((res, reject) => {
      const r = new FileReader()
      r.onload = () => res(r.result as string)
      r.onerror = () => reject(new Error('Não foi possível ler um arquivo do projeto.'))
      r.readAsDataURL(b)
    })
    const frames = await db.frames.where('projectId').equals(project.id).toArray()
    const revisions = await db.revisions.where('projectId').equals(project.id).toArray()
    const assets = await db.assets.where('projectId').equals(project.id).toArray()
    const docs = await db.docs.where('projectId').equals(project.id).toArray()
    const fileVersions = await db.fileVersions.where('projectId').equals(project.id).toArray()
    const blobs = await Promise.all([...new Set(fileVersions.map((v) => v.blobId))].map(async (id) => {
      const blob = await fetchBlob(project.id, id)
      if (!blob) throw new Error('Um arquivo ainda não chegou do servidor. Aguarde a sincronização e tente de novo.')
      return { id, type: blob.type, data: await toData(blob) }
    }))
    const ids = new Set([...frames.map((f) => f.imageId), ...revisions.map((r) => r.snapshot.imageId), ...assets.map((a) => a.imageId)].filter(Boolean) as string[])
    const images = await Promise.all([...ids].map(async (id) => {
      const img = await db.images.get(id)
      if (!img) throw new Error('Uma imagem ainda não chegou. Aguarde a sincronização antes de exportar.')
      return { id, width: img.width, height: img.height, data: await toData(img.blob) }
    }))
    const payload = {
      format: 'decupa-project@1',
      exportedAt: new Date().toISOString(),
      project,
      scenes: await db.scenes.where('projectId').equals(project.id).toArray(),
      frames,
      revisions,
      docs,
      docVersions: docs.length ? await db.docVersions.where('docId').anyOf(docs.map((d) => d.id)).toArray() : [],
      assets,
      messages: await db.messages.where('projectId').equals(project.id).toArray(),
      files: await db.files.where('projectId').equals(project.id).toArray(),
      fileVersions,
      blobs,
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
      if (!root || imgs.length < ordered.filter((f) => f.imageId).length) {
        setPrinting(false)
        return toast('As imagens ainda não chegaram. Aguarde a sincronização e tente de novo.', { tone: 'danger' })
      }
      void Promise.all(imgs.map((img) => Promise.race([img.decode(), new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Uma imagem demorou para carregar. Tente novamente.')), 5000))]))).then(() => window.print()).catch(toastError).finally(() => setPrinting(false))
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
            <MenuItem icon={<FileDown />} onClick={() => (close(), void backup().catch(toastError))}>
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
            <div className="mt-5 grid gap-4" style={{ gridTemplateColumns: `repeat(2, minmax(0, 1fr))` }}>
              {ordered.map((f, i) => {
                const { speaker, line } = parseDialogue(f.dialogue)
                return (
                  <div key={f.id} className="break-inside-avoid">
                    <FrameImage imageId={f.imageId} alt={f.description || f.title} aspect="16 / 9" className="rounded-[10px] border border-[#E4E4E7] grayscale [&_img]:object-contain" />
                    <div className="mt-2 flex items-baseline justify-between gap-2 text-[11px] leading-[14px] font-medium">
                      <span>
                        PL {String(i + 1).padStart(3, '0')} · {f.title}
                      </span>
                      <span className="text-[#71717B]">{f.duration}s</span>
                    </div>
                    <div className="mt-0.5 text-[9px] leading-3 tracking-[0.04em] text-[#71717B] uppercase">
                      {SHOT_LABEL[f.shot]} · {MOVE_LABEL[f.movement]}
                    </div>
                    <p className="mt-1 text-[10px] leading-[14px] text-[#3F3F46]">{f.description}</p>
                    {f.action && <p className="mt-1 text-[10px] leading-[14px]"><strong>Ação: </strong>{f.action}</p>}
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

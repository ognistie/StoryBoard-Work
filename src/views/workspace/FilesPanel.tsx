import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronRight, Download, FileArchive, FileImage, FileSpreadsheet, FileText, FileType, RotateCcw, Trash2, Upload } from 'lucide-react'
import { useRef, useState, type DragEvent } from 'react'
import { Button, cx, Spinner, toast, toastError } from '../../components/ui'
import { MAX_BLOB_BYTES } from '../../lib/collab/contract'
import { fetchBlob } from '../../lib/collab/sync'
import { db } from '../../lib/db'
import { download, scriptFileName, scriptMarkdown, shotListCsv, shotListFileName, slug } from './exporters'
import { timeAgo } from '../../lib/hooks'
import { addFile, deleteFile, restoreFileVersion } from '../../lib/repo'
import { can, userById } from '../../lib/session'
import { zip } from '../../lib/zip'
import { useWD } from './context'
import { PanelHeader } from './PanelShell'

/**
 * The project's virtual folder. Everyone in a shared project sees the same files.
 * - Documents of the project: the briefing (every version), attached texts, and the script and
 *   shot list built live from the current scenes.
 * - Files: uploads and saved exports. Same name = new version; every version stays downloadable.
 */

interface Version {
  id: string
  number: number
  createdAt: number
  authorId?: string
  size?: number
  blob: () => Promise<Blob | undefined>
}

interface Item {
  id: string
  /** File name when downloaded. */
  name: string
  /** Shown instead of the name, for documents built live. */
  title?: string
  mime: string
  versions: Version[]
  /** Live documents have one version, built now. */
  live?: boolean
  /** Set for files of the folder (not generated): they can be restored and deleted. */
  fileId?: string
}

function sizeLabel(bytes?: number) {
  if (bytes === undefined) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`
}

function Icon({ mime, name }: { mime: string; name: string }) {
  const cls = 'size-[18px]'
  if (mime.startsWith('image/')) return <FileImage className={cls} />
  if (mime.includes('csv') || name.endsWith('.csv') || mime.includes('sheet')) return <FileSpreadsheet className={cls} />
  if (mime.includes('pdf')) return <FileType className={cls} />
  if (mime.includes('zip')) return <FileArchive className={cls} />
  return <FileText className={cls} />
}

const text = (s: string, mime = 'text/plain;charset=utf-8') => new Blob([s], { type: mime })

function useFolder(): Item[] {
  const { project, ordered, scenes, briefing } = useWD()
  const data = useLiveQuery(async () => {
    const [docs, files, versions] = await Promise.all([
      db.docs.where('projectId').equals(project.id).toArray(),
      db.files.where('projectId').equals(project.id).toArray(),
      db.fileVersions.where('projectId').equals(project.id).toArray(),
    ])
    const docVersions = docs.length ? await db.docVersions.where('docId').anyOf(docs.map((d) => d.id)).toArray() : []
    return { docs, files, versions, docVersions }
  }, [project.id])
  if (!data) return []

  const items: Item[] = []
  const updated = Math.max(project.updatedAt, ...ordered.map((f) => f.updatedAt))
  items.push(
    { id: 'live:script', name: scriptFileName(project), title: 'Roteiro das cenas atuais', mime: 'text/markdown', live: true, versions: [{ id: 'script', number: 1, createdAt: updated, blob: async () => scriptMarkdown(project, ordered, briefing) }] },
    { id: 'live:shots', name: shotListFileName(project), title: 'Decupagem das cenas atuais', mime: 'text/csv', live: true, versions: [{ id: 'shots', number: 1, createdAt: updated, blob: async () => shotListCsv(ordered, scenes) }] },
  )
  for (const doc of data.docs) {
    const own = data.docVersions.filter((v) => v.docId === doc.id).sort((a, b) => a.version - b.version)
    const name = doc.kind === 'brief' ? 'briefing.txt' : `${slug(doc.title.replace(/\.[^.]+$/, ''))}.txt`
    items.push({
      id: `doc:${doc.id}`,
      name,
      mime: 'text/plain',
      versions: (own.length ? own : [{ id: doc.id, version: doc.version, text: doc.text, createdAt: doc.updatedAt, authorId: doc.updatedBy }]).map((v) => ({
        id: v.id,
        number: v.version,
        createdAt: v.createdAt,
        authorId: v.authorId,
        size: new Blob([v.text]).size,
        blob: async () => text(v.text),
      })),
    })
  }
  for (const f of data.files.filter((f) => !f.deleted).sort((a, b) => b.updatedAt - a.updatedAt)) {
    items.push({
      id: f.id,
      fileId: f.id,
      name: f.name,
      mime: f.mime,
      versions: data.versions
        .filter((v) => v.fileId === f.id)
        .sort((a, b) => a.number - b.number)
        .map((v) => ({ id: v.id, number: v.number, createdAt: v.createdAt, authorId: v.authorId, size: v.size, blob: () => fetchBlob(project.id, v.blobId) })),
    })
  }
  return items
}

async function saveVersion(item: Item, v: Version) {
  const blob = await v.blob()
  if (!blob) throw new Error('Este arquivo ainda não chegou do servidor. Tente de novo em instantes.')
  const latest = item.versions.at(-1)?.id === v.id
  download(latest ? item.name : item.name.replace(/(\.[^.]*)?$/, (ext) => ` (v${v.number})${ext}`), blob)
}

function Row({ item }: { item: Item }) {
  const { userId, role } = useWD()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState<string>()
  const head = item.versions.at(-1)
  const editable = can(role, 'edit') && !!item.fileId

  const run = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key)
    try {
      await fn()
    } catch (e) {
      toastError(e)
    } finally {
      setBusy(undefined)
    }
  }

  if (!head) return null
  const meta = item.live
    ? `${item.name.endsWith('.csv') ? 'CSV' : 'Markdown'} · sempre atualizado`
    : [`v${head.number}`, sizeLabel(head.size), head.authorId && (head.authorId === userId ? 'você' : userById(head.authorId).name.split(' ')[0]), timeAgo(head.createdAt)].filter(Boolean).join(' · ')

  return (
    <li className="group rounded-[14px] transition-colors hover:bg-[#FAFAFA]">
      <div className="flex items-center gap-3 px-2.5 py-2">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-[#F4F4F5] text-muted">
          <Icon mime={item.mime} name={item.name} />
        </span>
        <button
          onClick={() => item.versions.length > 1 && setOpen((v) => !v)}
          className={cx('flex min-w-0 flex-1 flex-col text-left', item.versions.length > 1 ? 'cursor-pointer' : 'cursor-default')}
          aria-expanded={item.versions.length > 1 ? open : undefined}
        >
          <span className="flex items-center gap-1 truncate text-[14px] leading-[18px] font-medium text-fg">
            <span className="truncate">{item.title ?? item.name}</span>
            {item.versions.length > 1 && <ChevronRight className={cx('size-3.5 shrink-0 text-faint transition-transform', open && 'rotate-90')} />}
          </span>
          <span className="truncate text-[12px] leading-4 text-muted">
            {meta}
            {item.versions.length > 1 && ` · ${item.versions.length} versões`}
          </span>
        </button>
        <button
          aria-label={`Baixar ${item.name}`}
          title="Baixar versão atual"
          disabled={!!busy}
          onClick={() => void run('get', () => saveVersion(item, head))}
          className="flex size-8 shrink-0 items-center justify-center rounded-full text-fg transition-colors hover:bg-black/5"
        >
          {busy === 'get' ? <Spinner className="size-4" /> : <Download className="size-4" />}
        </button>
        {editable && (
          <button
            aria-label={`Remover ${item.name}`}
            title="Remover da pasta"
            disabled={!!busy}
            onClick={() => confirm(`Remover “${item.name}” da pasta? As versões continuam no histórico do projeto.`) && void run('del', () => deleteFile(item.fileId!, userId))}
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted opacity-0 transition-[opacity,color] group-hover:opacity-100 hover:bg-danger-soft hover:text-danger focus:opacity-100 max-md:opacity-100"
          >
            <Trash2 className="size-4" />
          </button>
        )}
      </div>
      {open && (
        <ol className="flex flex-col gap-0.5 pb-2 pl-[58px]">
          {[...item.versions].reverse().map((v, i) => (
            <li key={v.id} className="flex items-center gap-2 pr-2.5 text-[13px] leading-[18px]">
              <span className="w-7 font-medium text-fg">v{v.number}</span>
              <span className="min-w-0 flex-1 truncate text-muted">
                {[sizeLabel(v.size), v.authorId && (v.authorId === userId ? 'você' : userById(v.authorId).name.split(' ')[0]), timeAgo(v.createdAt)].filter(Boolean).join(' · ')}
                {i === 0 && <span className="text-accent"> · atual</span>}
              </span>
              {editable && i > 0 && (
                <button
                  title="Tornar esta a versão atual"
                  disabled={!!busy}
                  onClick={() => void run(`r${v.id}`, () => restoreFileVersion(v.id, userId).then(() => toast(`v${v.number} voltou a ser a atual`, { tone: 'ok' })))}
                  className="flex h-7 items-center gap-1 rounded-full px-2 text-[12px] font-semibold text-accent transition-colors hover:bg-[#0071E31A]"
                >
                  <RotateCcw className="size-3" />
                  Restaurar
                </button>
              )}
              <button
                aria-label={`Baixar versão ${v.number}`}
                disabled={!!busy}
                onClick={() => void run(`d${v.id}`, () => saveVersion(item, v))}
                className="flex size-7 items-center justify-center rounded-full text-fg transition-colors hover:bg-black/5"
              >
                {busy === `d${v.id}` ? <Spinner className="size-3.5" /> : <Download className="size-3.5" />}
              </button>
            </li>
          ))}
        </ol>
      )}
    </li>
  )
}

export function FilesPanel({ closable = true }: { closable?: boolean }) {
  const { project, userId, role } = useWD()
  const items = useFolder()
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState<'upload' | 'zip'>()
  const [dragging, setDragging] = useState(false)
  const editable = can(role, 'edit')

  const upload = async (files: FileList | File[]) => {
    const list = [...files]
    if (!list.length) return
    const tooBig = list.filter((f) => f.size > MAX_BLOB_BYTES)
    if (tooBig.length) toast(`${tooBig.map((f) => f.name).join(', ')}: passa de 3 MB e ficou de fora.`, { tone: 'danger', duration: 6000 })
    setBusy('upload')
    try {
      for (const f of list.filter((f) => f.size <= MAX_BLOB_BYTES)) await addFile(project.id, userId, { name: f.name, blob: f, source: 'upload' })
    } catch (e) {
      toastError(e)
    } finally {
      setBusy(undefined)
    }
  }

  const downloadAll = async () => {
    setBusy('zip')
    try {
      const entries = []
      for (const item of items) {
        const head = item.versions.at(-1)
        const blob = head && (await head.blob())
        if (blob) entries.push({ name: item.name, blob, date: new Date(head.createdAt) })
      }
      download(`${slug(project.name)}.zip`, await zip(entries))
    } catch (e) {
      toastError(e)
    } finally {
      setBusy(undefined)
    }
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    if (editable) void upload(e.dataTransfer.files)
  }

  const generated = items.filter((i) => !i.fileId)
  const files = items.filter((i) => i.fileId)

  return (
    <div
      className="relative flex min-h-0 flex-1 flex-col"
      onDragOver={(e) => {
        if (!editable) return
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={(e) => e.currentTarget === e.target && setDragging(false)}
      onDrop={onDrop}
    >
      <PanelHeader label={project.remote ? 'Pasta compartilhada' : 'Pasta deste navegador'} title="Arquivos" closable={closable}>
        <div className="flex gap-2">
          {editable && (
            <Button variant="primary" loading={busy === 'upload'} onClick={() => input.current?.click()} className="h-8 px-3.5 text-[13px]">
              {busy !== 'upload' && <Upload className="size-3.5" />}
              Enviar arquivo
            </Button>
          )}
          <Button loading={busy === 'zip'} onClick={() => void downloadAll()} className="h-8 px-3.5 text-[13px]">
            {busy !== 'zip' && <Download className="size-3.5" />}
            Baixar tudo
          </Button>
        </div>
        <input
          ref={input}
          type="file"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files) void upload(e.target.files)
            e.target.value = ''
          }}
        />
      </PanelHeader>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-3 pb-4">
        <section className="flex flex-col gap-1">
          <h3 className="px-2.5 text-[12px] leading-4 font-medium text-muted">Documentos do projeto</h3>
          <ul className="flex flex-col">
            {generated.map((i) => (
              <Row key={i.id} item={i} />
            ))}
          </ul>
        </section>
        <section className="flex flex-col gap-1">
          <h3 className="px-2.5 text-[12px] leading-4 font-medium text-muted">Arquivos do time</h3>
          {files.length ? (
            <ul className="flex flex-col">
              {files.map((i) => (
                <Row key={i.id} item={i} />
              ))}
            </ul>
          ) : (
            <p className="mx-2.5 rounded-[14px] border border-dashed border-[#D4D4D8] px-4 py-5 text-center text-[13px] leading-[18px] text-muted">
              {editable ? 'Arraste roteiros, referências, PDFs e imagens para cá (até 3 MB cada). Enviar um arquivo com o mesmo nome cria uma nova versão.' : 'Nenhum arquivo ainda.'}
            </p>
          )}
        </section>
      </div>

      {dragging && (
        <div className="pointer-events-none absolute inset-2 flex items-center justify-center rounded-[14px] border-2 border-dashed border-accent bg-[#0071E30D] text-[14px] font-medium text-accent">
          Solte para enviar à pasta
        </div>
      )}
    </div>
  )
}

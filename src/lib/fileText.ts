/** Extract plain text from uploaded documents (TXT, MD, PDF, DOCX). Heavy parsers load lazily. */

export const ACCEPT_DOCS = '.txt,.md,.markdown,.fountain,.pdf,.docx'
const MAX_BYTES = 15 * 1024 * 1024

export async function extractText(file: File): Promise<string> {
  if (file.size > MAX_BYTES) throw new Error('Arquivo maior que 15 MB.')
  const name = file.name.toLowerCase()
  if (name.endsWith('.pdf')) {
    const pdfjs = await import('pdfjs-dist')
    pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()
    const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise
    const pages: string[] = []
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const content = await page.getTextContent()
      let last = -1
      let line = ''
      const lines: string[] = []
      for (const item of content.items as { str: string; transform: number[]; hasEOL?: boolean }[]) {
        const y = Math.round(item.transform[5])
        if (last !== -1 && Math.abs(y - last) > 2) {
          lines.push(line)
          line = ''
        }
        line += item.str
        last = y
        if (item.hasEOL) {
          lines.push(line)
          line = ''
          last = -1
        }
      }
      if (line) lines.push(line)
      pages.push(lines.join('\n'))
    }
    return pages.join('\n\n')
  }
  if (name.endsWith('.docx')) {
    const mammoth = (await import('mammoth')).default ?? (await import('mammoth'))
    const res = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })
    return res.value
  }
  if (/\.(txt|md|markdown|fountain)$/.test(name) || file.type.startsWith('text/')) return file.text()
  throw new Error('Formato não suportado. Use TXT, MD, PDF ou DOCX.')
}

export async function fileToImage(file: File): Promise<{ blob: Blob; width: number; height: number }> {
  if (!file.type.startsWith('image/')) throw new Error('Envie um arquivo de imagem.')
  const bmp = await createImageBitmap(file)
  // Normalize to max 1600px JPEG to keep IndexedDB small.
  const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height))
  const c = document.createElement('canvas')
  c.width = Math.round(bmp.width * scale)
  c.height = Math.round(bmp.height * scale)
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height)
  const blob = await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Falha ao processar imagem'))), 'image/jpeg', 0.88))
  return { blob, width: c.width, height: c.height }
}

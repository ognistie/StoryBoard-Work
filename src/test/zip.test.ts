import { describe, expect, it } from 'vitest'
import { crc32, zip } from '../lib/zip'

/** Reads a stored (uncompressed) ZIP back: name and bytes of each entry, from the central directory. */
async function unzip(blob: Blob) {
  const buf = new Uint8Array(await blob.arrayBuffer())
  const view = new DataView(buf.buffer)
  const end = buf.length - 22
  expect(view.getUint32(end, true)).toBe(0x06054b50)
  const count = view.getUint16(end + 10, true)
  let at = view.getUint32(end + 16, true)
  const out: { name: string; text: string }[] = []
  for (let i = 0; i < count; i++) {
    expect(view.getUint32(at, true)).toBe(0x02014b50)
    const size = view.getUint32(at + 20, true)
    const nameLen = view.getUint16(at + 28, true)
    const local = view.getUint32(at + 42, true)
    const name = new TextDecoder().decode(buf.subarray(at + 46, at + 46 + nameLen))
    const data = buf.subarray(local + 30 + view.getUint16(local + 26, true), local + 30 + view.getUint16(local + 26, true) + size)
    expect(crc32(data)).toBe(view.getUint32(at + 16, true))
    out.push({ name, text: new TextDecoder().decode(data) })
    at += 46 + nameLen
  }
  return out
}

describe('zip', () => {
  it('computes the standard CRC-32', () => {
    expect(crc32(new TextEncoder().encode('hello'))).toBe(0x3610a686)
  })

  it('stores every file with its UTF-8 name and makes repeated names unique', async () => {
    const files = await unzip(
      await zip([
        { name: 'roteiro-ação.md', blob: new Blob(['# Cena 1']) },
        { name: 'roteiro-ação.md', blob: new Blob(['# Cena 2']) },
        { name: 'decupagem.csv', blob: new Blob(['"#";"Cena"']) },
      ]),
    )
    expect(files).toEqual([
      { name: 'roteiro-ação.md', text: '# Cena 1' },
      { name: 'roteiro-ação (2).md', text: '# Cena 2' },
      { name: 'decupagem.csv', text: '"#";"Cena"' },
    ])
  })
})

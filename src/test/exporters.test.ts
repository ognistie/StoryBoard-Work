import { describe, expect, it } from 'vitest'
import { scriptMarkdown, shotListCsv } from '../views/workspace/exporters'
import type { Frame, Project } from '../lib/types'

const frame = { title: '=HYPERLINK("https://evil.example")', description: 'Plano detalhe', action: 'Mão segura uma xícara.', dialogue: 'ANA: Bom dia.', duration: 3, shot: 'detalhe', movement: 'estatico', characters: [], angle: '', location: '', lighting: '', status: 'draft' } as unknown as Frame
const project = { name: 'Filme', aspect: '16:9' } as Project

describe('production exports', () => {
  it('includes action, framing, camera, dialogue and duration in the script', async () => {
    const text = await scriptMarkdown(project, [frame]).text()
    expect(text).toContain('**Ação:** Mão segura uma xícara.')
    expect(text).toContain('**Plano:**')
    expect(text).toContain('**Câmera:**')
    expect(text).toContain('**ANA:** Bom dia.')
    expect(text).toContain('(3s)')
  })
  it('neutralizes formula injection while preserving accents and quoted CSV fields', async () => {
    const csv = await shotListCsv([frame], []).text()
    expect(csv).toContain('"\'=HYPERLINK(""https://evil.example"')
    expect(csv).toContain('Mão segura uma xícara.')
    expect(csv).toContain('Duração (s)')
  })
})

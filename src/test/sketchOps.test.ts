import { describe, expect, it } from 'vitest'
import { lookFor, specFromDescription } from '../lib/sketchOps'

describe('specFromDescription', () => {
  it('reads what the scene shows, in the order the text mentions it', () => {
    const spec = specFromDescription('Close nas mãos moendo café no moedor sobre o balcão.', { shot: 'close' })
    expect(spec.subjects).toEqual(['hands', 'grinder', 'cup', 'desk'])
    expect(spec.people).toHaveLength(0)
  })

  it('treats a written formula as the paper itself', () => {
    expect(specFromDescription('Mão escreve a fórmula P = E/t num papel.').subjects).toEqual(['hands', 'formula'])
  })

  it('does not see a box inside "encaixam"', () => {
    expect(specFromDescription('Pílulas viram blocos que se encaixam.').subjects).toEqual(['blocks'])
  })

  it('puts three people in a team scene', () => {
    expect(specFromDescription('Ela leva o time para a estratégia diante do quadro de planejamento.').people).toHaveLength(3)
  })

  it('never leaves a frame empty', () => {
    const spec = specFromDescription('Um momento de silêncio.')
    expect(spec.people).toHaveLength(1)
    expect(spec.subjects).toContain('laptop')
  })

  it('takes the camera move from the caller, else from the text', () => {
    expect(specFromDescription('Câmera em push-in lento.').movement).toBe('push-in')
    expect(specFromDescription('Câmera em push-in lento.', { movement: 'pan' }).movement).toBe('pan')
    expect(specFromDescription('Ela sorri.').movement).toBeUndefined()
  })

  it('draws the same frame for the same text', () => {
    expect(specFromDescription('A xícara de café coado.').seed).toBe(specFromDescription('A xícara de café coado.').seed)
  })

  it('keeps the frame format', () => {
    expect(specFromDescription('Logo da marca.', { aspect: '1:1' }).aspect).toBe('1:1')
  })
})

describe('character looks', () => {
  it('reads wardrobe and hair from a description so looks stay consistent', () => {
    expect(lookFor('Mulher, 35 anos, cabelo cacheado, casaco amarelo')).toEqual({ hair: 'curly', outfit: 'jacket', beard: undefined })
    expect(lookFor('Homem, barba curta, camisa xadrez')).toMatchObject({ outfit: 'striped', beard: true })
  })
})

describe('legacy scene specs', () => {
  it('builds a setting, time and people from a description', () => {
    const spec = specFromDescription('Família na sala, sentada no sofá à noite')
    expect(spec.setting).toBe('living')
    expect(spec.time).toBe('night')
    expect(spec.people.length).toBe(3)
  })
})

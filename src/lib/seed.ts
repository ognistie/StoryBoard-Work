import { chunkText, parseScript } from './context'
import { db } from './db'
import { shortHash, uid } from './ids'
import { emptyContent } from './repo'
import { sketchToBlob } from './sketch'
import type { Asset, ContextDoc, DocKind, Frame, FrameContent, Project, Revision, SketchSpec } from './types'

/** Demo workspace so the product can be explored immediately. */

const SEED_FLAG = 'frameline.seeded.v1'

export const DEMO_SCRIPT = `COMERCIAL “CASA NOVA” — HORIZONTE IMÓVEIS (30”)

1. EXT. CASA NOVA — DIA

Uma rua tranquila de bairro. O carro da família estaciona em frente a uma casa branca com uma placa de vendido.

ANA (35) desce do carro, segurando as chaves. PEDRO (38) abre o porta-malas cheio de caixas.

LÉO (8) corre em direção à porta.

LÉO
É essa? É a nossa casa?

ANA
É a nossa casa.

Ana gira a chave na fechadura. A porta se abre.

2. INT. SALA DE ESTAR — DIA

A sala vazia, banhada de luz. Caixas de mudança pelo chão.

Pedro coloca a última caixa no chão e olha em volta.

PEDRO
Cabe tudo. Cabe a gente.

Léo se joga no único sofá já montado. Ana ri.

3. EXT. QUINTAL — PÔR DO SOL

A família no quintal, sob uma árvore. O céu alaranjado. Ana, Pedro e Léo sentados na grama. O cachorro Bidu corre até eles.

LOCUTOR (V.O.)
Horizonte Imóveis. O lugar onde a sua história começa.
`

const RULES = `# Regras de continuidade
- Ana sempre veste o casaco amarelo da marca nas cenas externas.
- Léo sempre usa o boné vermelho.
- A placa de vendido deve aparecer no primeiro quadro.
- Nunca mostrar casas vizinhas com placa de outra imobiliária.

# Identidade visual
- Luz natural quente, sem sombras duras.
- A campanha nunca deve mostrar a casa à noite: o conceito é luminosidade e acolhimento.
- Enquadramentos respiram: preferir planos abertos e médios.`

const BRIEF = `# Briefing — Horizonte Imóveis
Objetivo: lançar a campanha “Casa Nova”, reforçando a Horizonte como a imobiliária que acompanha famílias no começo de uma nova fase.

# Público
Famílias jovens, 28–40 anos, comprando o primeiro imóvel.

# Tom
Caloroso, otimista, cotidiano. Nada de luxo ostensivo.

# Entregáveis
Filme de 30” para TV e redes sociais, com cortes de 15” e 6”.`

const INTERNAL = `# Notas internas da produtora (confidencial)
Orçamento de pós-produção aprovado: R$ 48 mil.
O cliente costuma pedir alterações de última hora: priorizar a aprovação dos quadros da cena 1 até sexta.
Diária extra de locação ainda não negociada.`

const DAY = 86400_000

interface SeedFrame {
  scene: number
  c: Partial<FrameContent>
  sketch: SketchSpec
  status?: Frame['status']
  history?: { sketch: SketchSpec; message: string; author: string; daysAgo: number; description?: string }[]
}

const p = (x: number, name?: string, extra: Partial<SketchSpec['people'][number]> = {}) => ({
  x,
  name,
  kind: name === 'Léo' ? ('child' as const) : ('adult' as const),
  pose: 'stand' as const,
  facing: x > 0.5 ? ('left' as const) : ('right' as const),
  ...extra,
})

const FRAMES: SeedFrame[] = [
  {
    scene: 1,
    status: 'approved',
    c: {
      title: 'Chegada à casa nova',
      description: 'Plano geral da casa branca com placa de vendido. O carro da família estaciona em frente. Luz natural de manhã.',
      action: 'O carro da família estaciona em frente à casa.',
      shot: 'geral',
      movement: 'dolly',
      duration: 4,
      characters: [],
      location: 'Casa Nova — fachada',
      lighting: 'Natural, manhã',
      composition: 'Casa centralizada, carro no terço esquerdo.',
    },
    sketch: { setting: 'house', time: 'day', shot: 'geral', people: [], props: ['carro', 'placa'], seed: 11 },
  },
  {
    scene: 1,
    status: 'review',
    c: {
      title: 'Ana com as chaves',
      description: 'Plano americano de Ana ao lado do carro, segurando as chaves e olhando para a casa.',
      action: 'Ana desce do carro, segurando as chaves.',
      shot: 'americano',
      duration: 3,
      characters: ['Ana'],
      location: 'Casa Nova — calçada',
      lighting: 'Natural, manhã',
    },
    sketch: { setting: 'house', time: 'day', shot: 'americano', people: [p(0.42, 'Ana')], props: [], seed: 22 },
    history: [
      {
        sketch: { setting: 'house', time: 'day', shot: 'aberto', people: [p(0.42, 'Ana')], props: [], seed: 22 },
        message: 'Storyboard inicial',
        author: 'u_rafael',
        daysAgo: 3,
        description: 'Plano aberto de Ana ao lado do carro, segurando as chaves.',
      },
    ],
  },
  {
    scene: 1,
    status: 'review',
    c: {
      title: 'Família diante da casa',
      description: 'Plano aberto: Ana, Pedro e Léo diante da casa. Pedro segura caixas de mudança.',
      action: 'Pedro abre o porta-malas cheio de caixas.',
      shot: 'aberto',
      duration: 3,
      characters: ['Ana', 'Pedro', 'Léo'],
      location: 'Casa Nova — calçada',
      lighting: 'Natural, manhã',
    },
    sketch: { setting: 'house', time: 'day', shot: 'aberto', people: [p(0.3, 'Pedro'), p(0.45, 'Ana'), p(0.58, 'Léo')], props: ['caixas'], seed: 33 },
  },
  {
    scene: 1,
    status: 'draft',
    c: {
      title: 'Léo corre até a porta',
      description: 'Plano aberto de Léo correndo em direção à porta; Ana e Pedro ao fundo, à esquerda.',
      action: 'Léo corre em direção à porta.',
      dialogue: 'LÉO: É essa? É a nossa casa?\nANA: É a nossa casa.',
      shot: 'aberto',
      movement: 'tracking',
      duration: 3,
      characters: ['Léo', 'Ana', 'Pedro'],
      location: 'Casa Nova — entrada',
      lighting: 'Natural, manhã',
    },
    sketch: { setting: 'house', time: 'day', shot: 'aberto', people: [p(0.2, 'Pedro'), p(0.3, 'Ana'), p(0.55, 'Léo', { pose: 'walk', facing: 'right' })], props: [], seed: 44 },
  },
  {
    scene: 2,
    status: 'approved',
    c: {
      title: 'Sala vazia',
      description: 'Plano geral da sala vazia, banhada de luz, com caixas de mudança pelo chão.',
      shot: 'geral',
      movement: 'pan',
      duration: 3,
      location: 'Sala de estar',
      lighting: 'Luz de janela, difusa',
    },
    sketch: { setting: 'living', time: 'day', shot: 'geral', people: [], props: ['caixas'], seed: 55 },
  },
  {
    scene: 2,
    status: 'approved',
    c: {
      title: 'Pedro e a última caixa',
      description: 'Plano médio de Pedro colocando a última caixa no chão e olhando em volta.',
      action: 'Pedro coloca a última caixa no chão.',
      dialogue: 'PEDRO: Cabe tudo. Cabe a gente.',
      shot: 'medio',
      duration: 3,
      characters: ['Pedro'],
      location: 'Sala de estar',
      lighting: 'Luz de janela, difusa',
    },
    sketch: { setting: 'living', time: 'day', shot: 'medio', people: [p(0.5, 'Pedro')], props: [], seed: 66 },
  },
  {
    scene: 2,
    status: 'draft',
    c: {
      title: 'Léo no sofá',
      description: 'Plano aberto: Léo se joga no sofá; Ana, à direita, ri.',
      action: 'Léo se joga no único sofá já montado. Ana ri.',
      shot: 'aberto',
      duration: 3,
      characters: ['Léo', 'Ana'],
      location: 'Sala de estar',
      lighting: 'Luz de janela, difusa',
    },
    sketch: { setting: 'living', time: 'day', shot: 'aberto', people: [p(0.28, 'Léo', { pose: 'sit' }), p(0.66, 'Ana')], props: [], seed: 77 },
  },
  {
    scene: 3,
    status: 'draft',
    c: {
      title: 'Quintal ao pôr do sol',
      description: 'Plano geral da família sentada na grama sob a árvore; o cachorro Bidu corre até eles. Céu alaranjado.',
      action: 'Ana, Pedro e Léo sentados na grama. Bidu corre até eles.',
      shot: 'geral',
      movement: 'crane',
      duration: 4,
      characters: ['Ana', 'Pedro', 'Léo'],
      location: 'Quintal',
      lighting: 'Pôr do sol, contraluz quente',
    },
    sketch: {
      setting: 'garden',
      time: 'sunset',
      shot: 'geral',
      people: [p(0.42, 'Ana', { pose: 'sit' }), p(0.52, 'Pedro', { pose: 'sit' }), p(0.34, 'Léo', { pose: 'sit' })],
      props: ['cachorro'],
      seed: 88,
    },
  },
  {
    scene: 3,
    status: 'draft',
    c: {
      title: 'Assinatura',
      description: 'Plano detalhe das chaves da casa nova; entra a assinatura da Horizonte Imóveis.',
      dialogue: 'LOCUTOR (V.O.): Horizonte Imóveis. O lugar onde a sua história começa.',
      shot: 'detalhe',
      duration: 3,
      location: 'Quintal',
      lighting: 'Pôr do sol',
      notes: 'Logo animado entra no último segundo.',
    },
    sketch: { setting: 'empty', time: 'sunset', shot: 'detalhe', people: [], props: ['chaves'], seed: 99 },
  },
]

async function img(spec: SketchSpec) {
  const { blob, width, height } = await sketchToBlob(spec)
  const id = uid('img')
  await db.images.add({ id, blob, width, height, createdAt: Date.now() })
  return id
}

function makeDoc(projectId: string, kind: DocKind, title: string, text: string, confidential: boolean, at: number, fileName?: string): ContextDoc {
  return { id: uid('doc'), projectId, kind, title, fileName, version: 1, text, chunks: chunkText(text, kind), confidential, createdAt: at, updatedAt: at, updatedBy: 'u_marina' }
}

let seeding: Promise<void> | null = null

/** Idempotent (guards against React StrictMode double effects). */
export function seedDemo(force = false): Promise<void> {
  seeding ??= doSeed(force).finally(() => {
    seeding = null
  })
  return seeding
}

async function doSeed(force: boolean) {
  try {
    if (!force && localStorage.getItem(SEED_FLAG)) return
  } catch {
    /* ignore */
  }
  if (!force && (await db.projects.count()) > 0) return
  const now = Date.now()
  const projectId = uid('prj')
  const project: Project = {
    id: projectId,
    name: 'Casa Nova — Filme 30”',
    client: 'Horizonte Imóveis',
    producer: 'Lumen Filmes',
    ownerId: 'u_marina',
    status: 'review',
    style: 'pencil',
    styleNotes: 'Traço limpo, personagens identificados por nome acima da cabeça.',
    members: [
      { userId: 'u_marina', role: 'producer' },
      { userId: 'u_rafael', role: 'editor' },
      { userId: 'u_julia', role: 'client' },
    ],
    aspect: '16:9',
    createdAt: now - 6 * DAY,
    updatedAt: now - 2 * 3600_000,
  }

  const parsed = parseScript(DEMO_SCRIPT)
  const sceneIds: string[] = []
  for (const s of parsed) {
    const id = uid('scn')
    sceneIds.push(id)
    await db.scenes.add({
      id,
      projectId,
      number: s.number,
      heading: s.heading,
      sequence: s.number === 1 ? 'Sequência 1 — Chegada' : s.number === 2 ? 'Sequência 2 — Primeiro dia' : 'Sequência 3 — Lar',
      summary: s.summary,
      timeOfDay: s.timeOfDay,
      characters: s.characters.filter((c) => c !== 'Locutor'),
      scriptExcerpt: s.excerpt,
      order: s.number - 1,
    })
  }

  const assets: Asset[] = [
    { id: uid('ast'), projectId, type: 'character', name: 'Ana', description: 'Mulher, 35 anos, cabelo cacheado na altura dos ombros, casaco amarelo da marca.', createdAt: now },
    { id: uid('ast'), projectId, type: 'character', name: 'Pedro', description: 'Homem, 38 anos, barba curta, camisa xadrez azul.', createdAt: now },
    { id: uid('ast'), projectId, type: 'character', name: 'Léo', description: 'Menino, 8 anos, boné vermelho, mochila.', createdAt: now },
    { id: uid('ast'), projectId, type: 'character', name: 'Bia', description: 'Corretora da Horizonte, 30 anos, blazer verde, crachá da marca.', createdAt: now },
    { id: uid('ast'), projectId, type: 'location', name: 'Casa Nova', description: 'Casa branca térrea, telhado de duas águas, porta de madeira, jardim frontal.', createdAt: now },
    { id: uid('ast'), projectId, type: 'lighting', name: 'Luz Horizonte', description: 'Luz natural quente, sem sombras duras, céu limpo.', createdAt: now },
    { id: uid('ast'), projectId, type: 'prop', name: 'Bidu', description: 'Cachorro vira-lata caramelo, porte médio.', createdAt: now },
  ]
  for (const a of assets.filter((a) => a.type === 'character')) {
    a.imageId = await img({ setting: 'empty', time: 'day', shot: 'americano', people: [p(0.5, a.name, a.name === 'Léo' ? { kind: 'child' } : {})], props: [], seed: a.name.length * 13 })
  }
  await db.assets.bulkAdd(assets)

  await db.docs.bulkAdd([
    makeDoc(projectId, 'script', 'Roteiro — Casa Nova 30”', DEMO_SCRIPT, false, now - 6 * DAY, 'roteiro_casa_nova_v1.txt'),
    makeDoc(projectId, 'brief', 'Briefing do cliente', BRIEF, false, now - 6 * DAY, 'briefing_horizonte.md'),
    makeDoc(projectId, 'tech', 'Regras de continuidade e marca', RULES, false, now - 5 * DAY, 'continuidade.md'),
    makeDoc(projectId, 'other', 'Notas internas da produtora', INTERNAL, true, now - 5 * DAY, 'notas_internas.md'),
  ])

  let order = 0
  const frameIds: string[] = []
  for (const sf of FRAMES) {
    const frameId = uid('frm')
    frameIds.push(frameId)
    const revs: Revision[] = []
    let parent: string | undefined
    let n = 0
    for (const h of sf.history ?? []) {
      const imageId = await img(h.sketch)
      const r: Revision = {
        id: uid('rev'),
        short: shortHash(),
        projectId,
        frameId,
        parentId: parent,
        number: ++n,
        authorId: h.author,
        createdAt: now - h.daysAgo * DAY,
        message: h.message,
        kind: 'initial',
        snapshot: { ...emptyContent(sf.c), description: h.description ?? sf.c.description ?? '', imageId, sketch: h.sketch },
      }
      revs.push(r)
      parent = r.id
    }
    const imageId = await img(sf.sketch)
    const content = { ...emptyContent(sf.c), imageId, sketch: sf.sketch }
    const head: Revision = {
      id: uid('rev'),
      short: shortHash(),
      projectId,
      frameId,
      parentId: parent,
      number: ++n,
      authorId: n > 1 ? 'u_marina' : 'u_rafael',
      createdAt: now - (n > 1 ? 1 : 3) * DAY,
      message: n > 1 ? 'Plano fechado para americano, foco nas chaves' : 'Storyboard inicial',
      kind: n > 1 ? 'manual' : 'initial',
      snapshot: content,
    }
    revs.push(head)
    await db.revisions.bulkAdd(revs)
    const frame: Frame = {
      ...content,
      id: frameId,
      projectId,
      sceneId: sceneIds[sf.scene - 1],
      order: order++,
      status: sf.status ?? 'draft',
      headRevisionId: head.id,
      approvedRevisionId: sf.status === 'approved' ? head.id : undefined,
      dirty: false,
      updatedAt: head.createdAt,
      updatedBy: head.authorId,
    }
    await db.frames.add(frame)
    if (sf.status === 'approved') {
      await db.approvals.add({ id: uid('apv'), projectId, frameId, revisionId: head.id, userId: 'u_julia', decision: 'approved', createdAt: now - 2 * DAY })
    }
  }

  await db.comments.bulkAdd([
    {
      id: uid('cmt'),
      projectId,
      frameId: frameIds[2],
      authorId: 'u_julia',
      text: 'Gostei! Dá pra deixar o Léo mais perto da porta? Ele é o protagonista dessa cena.',
      pin: { x: 0.58, y: 0.62 },
      resolved: false,
      createdAt: now - 26 * 3600_000,
    },
    {
      id: uid('cmt'),
      projectId,
      frameId: frameIds[2],
      authorId: 'u_marina',
      text: '@Júlia ótimo ponto. Ajustamos na próxima rodada.',
      resolved: false,
      createdAt: now - 25 * 3600_000,
    },
    {
      id: uid('cmt'),
      projectId,
      frameId: frameIds[0],
      authorId: 'u_julia',
      text: 'Aprovado. A placa de vendido ficou ótima.',
      resolved: true,
      createdAt: now - 2 * DAY,
    },
  ])

  await db.events.bulkAdd([
    { id: uid('ev'), projectId, actorId: 'u_marina', type: 'project.created', message: 'Projeto “Casa Nova — Filme 30”” criado', createdAt: now - 6 * DAY },
    { id: uid('ev'), projectId, actorId: 'u_rafael', type: 'revision.committed', message: 'Storyboard inicial com 9 quadros', createdAt: now - 3 * DAY },
    { id: uid('ev'), projectId, actorId: 'u_julia', type: 'frame.approved', message: 'Aprovou 3 quadros', createdAt: now - 2 * DAY },
    { id: uid('ev'), projectId, actorId: 'u_marina', type: 'revision.committed', message: 'Plano fechado para americano em “Ana com as chaves”', createdAt: now - DAY, frameId: frameIds[1] },
    { id: uid('ev'), projectId, actorId: 'u_julia', type: 'comment.added', message: 'Comentou em “Família diante da casa”', createdAt: now - 26 * 3600_000, frameId: frameIds[2] },
  ])
  await db.projects.add(project)
  await db.snapshots.add({
    id: uid('snp'),
    projectId,
    name: 'Rodada 1 enviada ao cliente',
    authorId: 'u_marina',
    createdAt: now - 2 * DAY,
    frames: (await db.frames.where('projectId').equals(projectId).toArray()).map((f) => ({ frameId: f.id, revisionId: f.headRevisionId, order: f.order })),
  })

  await seedSecondary(now)
  try {
    localStorage.setItem(SEED_FLAG, '1')
  } catch {
    /* ignore */
  }
}

async function seedSecondary(now: number) {
  const projectId = uid('prj')
  const sceneId = uid('scn')
  await db.scenes.add({ id: sceneId, projectId, number: 1, heading: 'INT. ESCRITÓRIO — DIA', sequence: '', summary: '', timeOfDay: 'day', characters: ['Marta'], scriptExcerpt: '', order: 0 })
  const items: [string, string, SketchSpec][] = [
    ['Abertura', 'Plano geral do escritório com persianas, Marta entra.', { setting: 'office', time: 'day', shot: 'geral', people: [p(0.3, 'Marta', { pose: 'walk' })], props: [], seed: 5 }],
    ['Notificação', 'Close de Marta sorrindo ao ver o celular.', { setting: 'office', time: 'day', shot: 'close', people: [p(0.5, 'Marta')], props: [], seed: 6 }],
    ['Assinatura', 'Rua da cidade, assinatura do app Pulse.', { setting: 'street', time: 'sunset', shot: 'aberto', people: [], props: [], seed: 7 }],
  ]
  let i = 0
  for (const [title, description, sketch] of items) {
    const frameId = uid('frm')
    const imageId = await img(sketch)
    const content = { ...emptyContent({ title, description, shot: sketch.shot }), imageId, sketch }
    const rev: Revision = { id: uid('rev'), short: shortHash(), projectId, frameId, number: 1, authorId: 'u_rafael', createdAt: now - 12 * DAY, message: 'Storyboard inicial', kind: 'initial', snapshot: content }
    await db.revisions.add(rev)
    await db.frames.add({ ...content, id: frameId, projectId, sceneId, order: i++, status: 'approved', headRevisionId: rev.id, approvedRevisionId: rev.id, dirty: false, updatedAt: rev.createdAt, updatedBy: 'u_rafael' })
  }
  await db.projects.add({
    id: projectId,
    name: 'Pulse — Lançamento do app 15”',
    client: 'Pulse Bank',
    producer: 'Lumen Filmes',
    ownerId: 'u_marina',
    status: 'approved',
    style: 'sketch',
    styleNotes: '',
    members: [
      { userId: 'u_marina', role: 'producer' },
      { userId: 'u_rafael', role: 'editor' },
      { userId: 'u_caio', role: 'client' },
    ],
    aspect: '16:9',
    createdAt: now - 14 * DAY,
    updatedAt: now - 9 * DAY,
  })
}

export async function resetDemo() {
  await db.delete()
  try {
    localStorage.removeItem(SEED_FLAG)
  } catch {
    /* ignore */
  }
  location.reload()
}

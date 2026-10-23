import { chunkText } from './context'
import { db } from './db'
import { shortHash, uid } from './ids'
import { emptyContent, putImage } from './repo'
import { sketchToBlob } from './sketch'
import type { AIRecord, Frame, FrameContent, Project, Revision, RevisionKind, SketchSpec } from './types'

/** Demo workspace so the product can be explored immediately. */

// Bumping this key wipes the browser's data once and reseeds it.
const SEED_FLAG = 'decupa.seeded.v1'

const OWNER = 'u_marina'
const MIN = 60_000
const DAY = 86_400_000

interface SeedVersion {
  kind: RevisionKind
  message: string
  minutesAgo: number
  /** Fields that differed in this version, compared with the current frame. */
  patch?: Partial<FrameContent>
}

interface SeedFrame {
  content: Partial<FrameContent>
  /** File in public/demo/, or a spec for the local sketch renderer. */
  image: string | SketchSpec
  /** Earlier versions, oldest first. The current frame becomes the last one. */
  history?: SeedVersion[]
  head?: Omit<SeedVersion, 'patch'>
}

interface SeedProject {
  name: string
  client: string
  aspect: Project['aspect']
  minutesAgo: number
  /** Briefing versions, oldest first. */
  briefing: string[]
  frames: SeedFrame[]
}

const IUGU_BRIEFING_V1 =
  'Reels de 30s para a iugu recontando o manifesto “tecnologia que vira potência”. Para empresas que querem automatizar a gestão financeira. Tom confiante, sem números. Fechar com a assinatura.'
const IUGU_BRIEFING =
  'Reels de 30s para a iugu recontando o manifesto “tecnologia que vira potência”. Para gestores financeiros que perdem energia com conciliação e cobrança manual. Tom confiante, sem números. Fechar com a assinatura.'
const BRIEFING_CHANGE = 'Novo foco: gestores financeiros sem tempo.'

const PROJECTS: SeedProject[] = [
  {
    name: 'iugu · Energia que vira potência',
    client: 'iugu',
    aspect: '9:16',
    minutesAgo: 12,
    briefing: [IUGU_BRIEFING_V1, IUGU_BRIEFING],
    frames: [
      {
        image: 'iugu-1',
        content: {
          title: 'A fórmula',
          description: 'Mão escreve a fórmula; o traço vira uma pílula azul.',
          action: 'Mão escreve a fórmula de potência em papel branco. O traço vira uma pílula azul. Logo preto pequeno no canto desde o primeiro quadro.',
          dialogue: 'LOCUÇÃO: Potência é energia a cada unidade de tempo.',
          shot: 'detalhe',
          movement: 'dolly',
          duration: 4,
          notes: 'Push-in lento. Texto na tela: “potência = energia ÷ tempo”.',
        },
      },
      {
        image: 'iugu-2',
        content: {
          title: 'Energia escoa',
          description: 'Gestora entre planilhas, do dia até a noite.',
          action: 'Gestora financeira à mesa, entre planilhas; a luz da janela passa de dia para noite. Três pílulas surgem em volta dela.',
          dialogue: 'LOCUÇÃO: Sua energia se consome devagar.',
          shot: 'medio',
          movement: 'estatico',
          duration: 7,
          characters: ['Gestora'],
          notes: 'Time-lapse. Pílulas: “CONCILIAÇÃO que consome tempo”, “COBRANÇA que escapa”, “FLUXO que perde previsibilidade”.',
        },
        history: [
          {
            kind: 'initial',
            message: 'Primeira versão, gerada do briefing.',
            minutesAgo: 12,
            patch: { description: 'Empresário confere boletos no fim do expediente.', dialogue: 'LOCUÇÃO: Processos manuais roubam seu tempo.', duration: 6 },
          },
          { kind: 'briefing', message: BRIEFING_CHANGE, minutesAgo: 2, patch: { notes: '' } },
        ],
        head: { kind: 'ai-edit', message: '“Time-lapse do dia até a noite.”', minutesAgo: 2 },
      },
      {
        image: 'iugu-3',
        content: {
          title: 'Encaixe',
          description: 'Pílulas viram blocos azuis e se encaixam.',
          action: 'As pílulas se soltam, viram blocos arredondados e se encaixam num mosaico com quatro blocos azuis: Cobrança, Recorrência, Split, BaaS.',
          dialogue: 'LOCUÇÃO: Quatro produtos. Um ecossistema.',
          shot: 'geral',
          movement: 'zoom',
          duration: 6,
          notes: 'Motion graphics. Som de clique seco em cada encaixe.',
        },
        history: [
          {
            kind: 'initial',
            message: 'Primeira versão, gerada do briefing.',
            minutesAgo: 12,
            patch: { dialogue: 'LOCUÇÃO: Automatize sua gestão financeira.', movement: 'estatico', duration: 8, notes: 'Motion graphics.' },
          },
          {
            kind: 'ai-edit',
            message: '“Corta para 6 segundos. Zoom out no final.”',
            minutesAgo: 9,
            patch: { dialogue: 'LOCUÇÃO: Automatize sua gestão financeira.', notes: 'Motion graphics.' },
          },
          { kind: 'briefing', message: BRIEFING_CHANGE, minutesAgo: 2, patch: { notes: 'Motion graphics.' } },
        ],
        head: { kind: 'ai-edit', message: '“Deixa o encaixe mais seco, com som de clique.”', minutesAgo: 1 },
      },
      {
        image: 'iugu-4',
        content: {
          title: 'Energia volta',
          description: 'De manhã, ela leva o time para a estratégia.',
          action: 'A mesma gestora, de manhã e com luz natural, entra numa sala clara e conduz o time diante de um quadro de planejamento.',
          dialogue: 'LOCUÇÃO: Isso é transformar energia em potência.',
          shot: 'aberto',
          movement: 'tracking',
          duration: 7,
          characters: ['Gestora'],
          notes: 'Formato 1:1. Texto na tela: “foco em estratégia, não em tarefas operacionais”.',
        },
        history: [
          {
            kind: 'initial',
            message: 'Primeira versão, gerada do briefing.',
            minutesAgo: 12,
            patch: { description: 'A equipe comemora em volta da mesa.', dialogue: 'LOCUÇÃO: Mais tempo para o que importa.', characters: [] },
          },
        ],
        head: { kind: 'briefing', message: BRIEFING_CHANGE, minutesAgo: 2 },
      },
      {
        image: 'iugu-5',
        content: {
          title: 'Assinatura',
          description: 'Blocos formam o símbolo e o botão de contato.',
          action: 'Os blocos do mosaico se juntam e formam o símbolo da iugu; entra a assinatura preta e, abaixo, uma pílula azul de CTA.',
          dialogue: 'LOCUÇÃO: iugu. Tecnologia que vira potência.',
          shot: 'geral',
          movement: 'estatico',
          duration: 6,
          notes: 'CTA: “Falar com um especialista”.',
        },
      },
    ],
  },
  {
    name: 'Café Moinho · Tutorial',
    client: 'Café Moinho',
    aspect: '9:16',
    minutesAgo: 24 * 60,
    briefing: [
      'Tutorial de 60s para o Café Moinho ensinando a moer e coar café em casa. Público: quem está começando no café especial. Tom calmo e próximo. Fechar com o pacote da marca.',
    ],
    frames: [
      {
        image: 'cafe-1',
        content: {
          title: 'A moagem',
          description: 'Mãos giram o moedor manual; grãos espalhados na mesa.',
          action: 'Mãos giram a manivela do moedor manual sobre a mesa de madeira.',
          dialogue: 'NARRAÇÃO: Tudo começa no grão. Moa na hora, em moagem média.',
          shot: 'detalhe',
          movement: 'estatico',
          duration: 10,
        },
      },
      {
        image: 'cafe-2',
        content: {
          title: 'A água',
          description: 'A chaleira de bico fino despeja água sobre o coador.',
          action: 'Água quente cai em círculos sobre o pó no coador de cerâmica.',
          dialogue: 'NARRAÇÃO: Água a 92 graus, em círculos, sem pressa.',
          shot: 'medio',
          movement: 'tilt',
          duration: 12,
        },
      },
      {
        image: 'cafe-3',
        content: {
          title: 'A xícara',
          description: 'Xícara servida ao lado do pacote Café Moinho.',
          action: 'A xícara cheia descansa ao lado do pacote, perto da janela.',
          dialogue: 'NARRAÇÃO: Pronto. Agora é só aproveitar.',
          shot: 'detalhe',
          movement: 'dolly',
          duration: 10,
        },
      },
      {
        image: { setting: 'kitchen', time: 'day', shot: 'close', people: [{ x: 0.5, name: 'Barista', kind: 'adult', pose: 'stand', facing: 'left', hair: 'bun' }], props: [], seed: 41 },
        content: {
          title: 'O tempo de extração',
          description: 'A barista confere o relógio enquanto o café passa.',
          dialogue: 'NARRAÇÃO: Três minutos. Se passar disso, o café amarga.',
          shot: 'close',
          movement: 'estatico',
          duration: 10,
          characters: ['Barista'],
        },
      },
      {
        image: { setting: 'kitchen', time: 'day', shot: 'medio', people: [{ x: 0.42, name: 'Barista', kind: 'adult', pose: 'sit', facing: 'right', hair: 'bun', expression: 'smile' }], props: [], seed: 52 },
        content: {
          title: 'O primeiro gole',
          description: 'A barista prova o café e sorri.',
          dialogue: 'NARRAÇÃO: Doce, com notas de chocolate.',
          shot: 'medio',
          movement: 'pan',
          duration: 10,
          characters: ['Barista'],
        },
      },
      {
        image: { setting: 'empty', time: 'day', shot: 'detalhe', people: [], props: [], seed: 63 },
        content: {
          title: 'Assinatura',
          description: 'O pacote Café Moinho no centro do quadro, com o site da marca.',
          dialogue: 'NARRAÇÃO: Café Moinho. Moído do seu jeito.',
          shot: 'detalhe',
          movement: 'estatico',
          duration: 8,
        },
      },
    ],
  },
  {
    name: 'Studio Vila · Anúncio',
    client: 'Studio Vila',
    aspect: '9:16',
    minutesAgo: 3 * 24 * 60,
    briefing: [
      'Anúncio de 15s para o Studio Vila, estúdio de pilates de bairro. Mostrar o cuidado da professora com cada aluna. Tom leve. Fechar com a fachada e o convite para a aula experimental.',
    ],
    frames: [
      {
        image: 'studio-1',
        content: {
          title: 'O estúdio',
          description: 'Sala clara com aparelhos de pilates; uma aluna alonga no reformer.',
          dialogue: 'NARRAÇÃO: Um espaço para o seu corpo.',
          shot: 'geral',
          movement: 'pan',
          duration: 5,
        },
      },
      {
        image: 'studio-2',
        content: {
          title: 'O cuidado',
          description: 'A professora ajusta a postura da aluna no tapete.',
          dialogue: 'NARRAÇÃO: Com atenção em cada movimento.',
          shot: 'medio',
          movement: 'dolly',
          duration: 5,
          characters: ['Professora', 'Aluna'],
        },
      },
      {
        image: 'studio-3',
        content: {
          title: 'A fachada',
          description: 'Fachada do Studio Vila, com bicicleta na calçada.',
          dialogue: 'NARRAÇÃO: Studio Vila. Sua primeira aula é por nossa conta.',
          shot: 'aberto',
          movement: 'estatico',
          duration: 5,
        },
      },
    ],
  },
]

async function loadImage(image: SeedFrame['image']) {
  if (typeof image !== 'string') {
    const { blob, width, height } = await sketchToBlob(image)
    return putImage(blob, width, height)
  }
  const res = await fetch(`/demo/${image}.webp`)
  if (!res.ok) throw new Error(`Imagem de demonstração não encontrada: ${image}`)
  const blob = await res.blob()
  const { width, height } = await createImageBitmap(blob)
  return putImage(blob, width, height)
}

function aiRecord(instruction: string, basePrompt: string): AIRecord {
  return { instruction, basePrompt, structuredPrompt: instruction, provider: 'OpenAI', model: 'gpt-6.1-sol', isDemo: false, contextRefs: [] }
}

async function seedProject(seed: SeedProject, now: number) {
  const projectId = uid('prj')
  const updatedAt = now - seed.minutesAgo * MIN
  const createdAt = updatedAt - 2 * DAY
  const sceneId = uid('scn')
  await db.scenes.add({ id: sceneId, projectId, number: 1, heading: 'Roteiro', sequence: '', summary: '', timeOfDay: 'day', characters: [], scriptExcerpt: '', order: 0 })

  const docId = uid('doc')
  const briefing = seed.briefing[seed.briefing.length - 1]
  await db.docs.add({
    id: docId,
    projectId,
    kind: 'brief',
    title: 'Briefing',
    version: seed.briefing.length,
    text: briefing,
    chunks: chunkText(briefing, 'brief'),
    confidential: false,
    createdAt,
    updatedAt,
    updatedBy: OWNER,
  })
  await db.docVersions.bulkAdd(seed.briefing.map((text, i) => ({ id: uid('dv'), docId, version: i + 1, text, createdAt: i ? updatedAt : createdAt, authorId: OWNER })))

  for (const [order, sf] of seed.frames.entries()) {
    const frameId = uid('frm')
    const imageId = await loadImage(sf.image)
    const sketch = typeof sf.image === 'string' ? undefined : sf.image
    const content: FrameContent = { ...emptyContent(sf.content), imageId, sketch }
    const versions: SeedVersion[] = [...(sf.history ?? []), sf.head ?? { kind: 'initial', message: 'Primeira versão, gerada do briefing.', minutesAgo: seed.minutesAgo }]
    const revs: Revision[] = []
    for (const [i, v] of versions.entries()) {
      const snapshot = { ...content, ...v.patch }
      revs.push({
        id: uid('rev'),
        short: shortHash(),
        projectId,
        frameId,
        parentId: revs[i - 1]?.id,
        number: i + 1,
        authorId: OWNER,
        createdAt: now - v.minutesAgo * MIN,
        message: v.message,
        kind: v.kind,
        snapshot,
        ai: v.kind === 'initial' || v.kind === 'manual' ? undefined : aiRecord(v.message, revs[i - 1]?.snapshot.description ?? snapshot.description),
      })
    }
    await db.revisions.bulkAdd(revs)
    const head = revs[revs.length - 1]
    const frame: Frame = {
      ...content,
      id: frameId,
      projectId,
      sceneId,
      order,
      status: 'draft',
      headRevisionId: head.id,
      dirty: false,
      updatedAt: head.createdAt,
      updatedBy: OWNER,
    }
    await db.frames.add(frame)
  }

  await db.events.add({ id: uid('ev'), projectId, actorId: OWNER, type: 'project.created', message: `Projeto “${seed.name}” criado a partir do briefing`, createdAt })
  await db.projects.add({
    id: projectId,
    name: seed.name,
    client: seed.client,
    producer: 'Lumen Filmes',
    ownerId: OWNER,
    status: 'pre',
    style: 'pencil',
    styleNotes: '',
    members: [
      { userId: OWNER, role: 'producer' },
      { userId: 'u_rafael', role: 'editor' },
    ],
    aspect: seed.aspect,
    createdAt,
    updatedAt,
  })
}

let seeding: Promise<void> | null = null

/** Idempotent (guards against React StrictMode double effects). */
export function seedDemo(): Promise<void> {
  seeding ??= doSeed().finally(() => {
    seeding = null
  })
  return seeding
}

async function doSeed() {
  if (localStorage.getItem(SEED_FLAG)) return
  // Clears data from earlier demos (and earlier seed versions) before reseeding.
  await Promise.all(db.tables.map((t) => t.clear()))
  const now = Date.now()
  for (const project of PROJECTS) await seedProject(project, now)
  localStorage.setItem(SEED_FLAG, '1')
}

export async function resetDemo() {
  await db.delete()
  localStorage.removeItem(SEED_FLAG)
  location.reload()
}

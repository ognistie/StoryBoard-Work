import { norm } from './context'
import type { SketchSubject, StoryboardSpec } from './sketch'
import type { Asset, HairStyle, Outfit, Project, Region, ShotType, SketchPerson, SketchSpec, TimeOfDay } from './types'

/**
 * Pure functions that turn short natural-language deltas into SketchSpec changes.
 * Used only by the local demo provider; real providers edit pixels directly.
 */

const PROPS: [RegExp, string][] = [
  [/\bcarro|automovel|veiculo\b/, 'carro'],
  [/\barvore/, 'arvore'],
  [/\bcachorr|\bcao\b|\bcaes\b|pet\b/, 'cachorro'],
  [/\bcaixa|mudanca/, 'caixas'],
  [/\bplaca|vendido/, 'placa'],
  [/\bchave/, 'chaves'],
  [/\bluminaria|abajur|lampada/, 'luminaria'],
  [/\bbal(a|o)o/, 'balao'],
]

const PERSON_WORDS = /\b(pessoa|pessoas|alguem|homem|mulher|crianca|criancas|menino|menina|personagem|figurante|amig\w*|vizinh\w*|corretor\w*|senhor\w*|filh\w*|pai|mae|avo|gestor\w*|lojista|barista|cliente|apresentador\w*|profissional|colaborador\w*|funcionari\w*|atendente|instrutor\w*|alun[oa]s?|dono|dona|ela|ele)\b/
const GROUP_WORDS = /\b(time|equipe|reuniao|grupo|colegas|todos)\b/
const ADD = /\b(adicion\w*|inclu\w*|coloc\w*|acrescent\w*|bot\w*|insir\w*|insere|por mais|mais uma|mais um|aparec\w*)\b/
const REMOVE = /\b(remov\w*|tir\w*|apag\w*|exclu\w*|elimin\w*)\b/
const NUMBERS: Record<string, number> = { um: 1, uma: 1, dois: 2, duas: 2, tres: 3, '2': 2, '3': 3 }

const SHOTS: [RegExp, ShotType][] = [
  [/extreme close|close extremo|super close/, 'extreme-close'],
  [/close|plano fechado|primeiro plano|aproxim/, 'close'],
  [/plano geral|bem aberto|muito aberto/, 'geral'],
  [/plano aberto|abrir o plano|mais aberto|afast/, 'aberto'],
  [/americano/, 'americano'],
  [/plano medio|meio corpo/, 'medio'],
  [/detalhe/, 'detalhe'],
  [/\bpov\b|ponto de vista|subjetiva/, 'pov'],
  [/ombro|over the shoulder|\bots\b/, 'ots'],
]

const CHILD_RE = /\b(crianca|menino|menina|filh[oa]|garot[oa]|\d\s?anos)\b/

function isChildAsset(a?: Asset) {
  if (!a) return false
  const d = norm(a.description)
  const age = d.match(/(\d{1,2})\s*anos/)
  return age ? Number(age[1]) < 13 : CHILD_RE.test(d)
}

/** Visual traits for the demo renderer, read from a character sheet (asset description). */
export function lookFor(description = ''): Pick<SketchPerson, 'hair' | 'outfit' | 'beard'> {
  const d = norm(description)
  const hair: HairStyle | undefined = /cachead|cacho|crespo/.test(d)
    ? 'curly'
    : /\bbone\b|chapeu/.test(d)
      ? 'cap'
      : /coque/.test(d)
        ? 'bun'
        : /rabo de cavalo/.test(d)
          ? 'ponytail'
          : /cabelo (longo|comprido|liso)/.test(d)
            ? 'long'
            : /espetad/.test(d)
              ? 'spiky'
              : /cabelo curto|careca/.test(d)
                ? 'short'
                : undefined
  const outfit: Outfit | undefined = /vestido/.test(d)
    ? 'dress'
    : /listrad|xadrez/.test(d)
      ? 'striped'
      : /casaco|jaqueta|blazer|terno|moletom/.test(d)
        ? 'jacket'
        : /camisa|polo/.test(d)
          ? 'collar'
          : undefined
  return { hair, outfit, beard: /barba|bigode/.test(d) || undefined }
}

function charactersIn(text: string, characters: Asset[]): Asset[] {
  const n = ` ${norm(text)} `
  return characters.filter((c) => c.type === 'character' && new RegExp(`[\\s@]${norm(c.name).split(' ')[0]}[\\s,.!?]`).test(n))
}

function placeX(spec: SketchSpec, where: 'left' | 'right' | 'center', region?: Region): number {
  if (region) return Math.min(0.95, Math.max(0.05, region.x + region.w / 2))
  const xs = spec.people.map((p) => p.x)
  if (where === 'center') return 0.5
  if (where === 'left') return Math.max(0.08, (xs.length ? Math.min(...xs) : 0.5) - 0.15)
  return Math.min(0.92, (xs.length ? Math.max(...xs) : 0.5) + 0.15)
}

export function applyInstruction(
  base: SketchSpec,
  instruction: string,
  opts: { region?: Region; characters?: Asset[] } = {},
): { spec: SketchSpec; understood: string[] } {
  const spec: SketchSpec = structuredClone(base)
  const ins = norm(instruction)
  const understood: string[] = []
  const chars = charactersIn(instruction, opts.characters ?? [])
  const where: 'left' | 'right' | 'center' = /esquerda/.test(ins) ? 'left' : /centro|meio/.test(ins) ? 'center' : 'right'
  const removing = REMOVE.test(ins)

  // people
  if (!removing && (ADD.test(ins) || /\bmais\b/.test(ins)) && (PERSON_WORDS.test(ins) || chars.length)) {
    const named = chars.filter((c) => !spec.people.some((p) => p.name && norm(p.name) === norm(c.name)))
    const countWord = ins.match(/\b(um|uma|dois|duas|tres|2|3)\s+(pessoa|crianca|homem|mulher|menin|amig|figurante)/)
    const count = named.length || (countWord ? NUMBERS[countWord[1]] : 1)
    for (let i = 0; i < count; i++) {
      const asset = named[i]
      const person: SketchPerson = {
        ...lookFor(asset?.description),
        x: placeX(spec, where, opts.region),
        name: asset?.name,
        kind: asset ? (isChildAsset(asset) ? 'child' : 'adult') : CHILD_RE.test(ins) ? 'child' : 'adult',
        pose: /acen/.test(ins) ? 'wave' : /sentad/.test(ins) ? 'sit' : /andando|caminhando/.test(ins) ? 'walk' : 'stand',
        facing: where === 'right' ? 'left' : 'right',
        expression: expressionIn(ins),
      }
      spec.people.push(person)
    }
    understood.push(count > 1 ? `adicionar ${count} pessoas` : `adicionar ${named[0]?.name ?? 'uma pessoa'}`)
  } else if (removing && (PERSON_WORDS.test(ins) || chars.length)) {
    const byName = chars.length ? spec.people.findIndex((p) => p.name && chars.some((c) => norm(c.name) === norm(p.name!))) : -1
    let idx = byName
    if (idx < 0 && spec.people.length) {
      const sorted = spec.people.map((p, i) => ({ p, i })).sort((a, b) => a.p.x - b.p.x)
      idx = where === 'left' ? sorted[0].i : where === 'center' ? sorted[Math.floor(sorted.length / 2)].i : sorted.at(-1)!.i
    }
    if (idx >= 0) {
      understood.push(`remover ${spec.people[idx].name ?? 'pessoa'}`)
      spec.people.splice(idx, 1)
    }
  }

  // poses on existing people
  if (!ADD.test(ins) && !removing) {
    const target = chars.length ? spec.people.find((p) => p.name && chars.some((c) => norm(c.name) === norm(p.name!))) : spec.people.at(-1)
    if (target) {
      if (/acen/.test(ins)) (target.pose = 'wave'), understood.push('acenando')
      else if (/sentad|sentar/.test(ins)) (target.pose = 'sit'), understood.push('sentado')
      else if (/andando|caminh/.test(ins)) (target.pose = 'walk'), understood.push('caminhando')
      const ex = expressionIn(ins)
      if (ex) (target.expression = ex), understood.push(`expressão: ${ex}`)
      if (/olhando para (a )?esquerda/.test(ins)) (target.facing = 'left'), understood.push('olhar à esquerda')
      if (/olhando para (a )?direita/.test(ins)) (target.facing = 'right'), understood.push('olhar à direita')
    }
  }

  // time of day / weather
  const time: [RegExp, TimeOfDay, string][] = [
    [/noite|noturn|escur/, 'night', 'noite'],
    [/por do sol|entardecer|fim de tarde|golden hour/, 'sunset', 'pôr do sol'],
    [/\bdia\b|manha|ensolarad|luz do dia/, 'day', 'dia'],
  ]
  for (const [re, t, label] of time) {
    if (re.test(ins)) {
      spec.time = t
      understood.push(label)
      break
    }
  }
  if (/chuv/.test(ins)) {
    spec.weather = /sem chuva|parar de chover|tir\w* a chuva|remov\w* a chuva/.test(ins) ? 'none' : 'rain'
    understood.push(spec.weather === 'rain' ? 'chuva' : 'sem chuva')
  }

  // framing
  for (const [re, shot] of SHOTS) {
    if (re.test(ins)) {
      spec.shot = shot
      understood.push(`enquadramento: ${shot}`)
      break
    }
  }

  // props
  for (const [re, prop] of PROPS) {
    if (!re.test(ins)) continue
    if (removing) {
      if (spec.props.includes(prop)) {
        spec.props = spec.props.filter((p) => p !== prop)
        understood.push(`remover ${prop}`)
      }
    } else if (!spec.props.includes(prop)) {
      spec.props.push(prop)
      understood.push(`adicionar ${prop}`)
    }
  }

  if (!understood.length) spec.seed = base.seed + 1
  return { spec, understood }
}

function expressionIn(ins: string): SketchPerson['expression'] {
  if (/surpres|assustad|espant|choque/.test(ins)) return 'surprised'
  if (/(^|\s)rindo|gargalh|empolgad|feliz demais/.test(ins)) return 'laugh'
  if (/serio|neutr|pensativ/.test(ins)) return 'neutral'
  if (/sorri/.test(ins)) return 'smile'
  return undefined
}

const SETTINGS: [RegExp, SketchSpec['setting']][] = [
  [/cozinha/, 'kitchen'],
  [/\bsala\b|sofa|living|interior/, 'living'],
  [/escritorio|imobiliaria|mesa de trabalho/, 'office'],
  [/quintal|jardim|parque|grama/, 'garden'],
  [/\brua\b|calcada|cidade|avenida/, 'street'],
  [/dentro do carro|\bcarro\b/, 'car'],
  [/casa|fachada|porta|frente/, 'house'],
]

/** Subjects a storyboard frame can show, with the PT-BR words that call for each. Checked on normalized text. */
const SUBJECT_WORDS: [RegExp, SketchSubject][] = [
  [/\bmaos?\b|\bdedos?\b|segura|escrev|digit|moendo|\bmoe\b/, 'hands'],
  [/celular|smartphone|telefone|notificac|aplicativo|\bapp\b/, 'phone'],
  [/laptop|notebook|computador|teclado/, 'laptop'],
  [/\bmesa\b|balcao|bancada|escrivaninha/, 'desk'],
  [/moedor|moagem|\bmoer\b|moendo|\bgraos?\b/, 'grinder'],
  [/xicara|caneca|\bcafe\b|coado|coador|\bcha\b/, 'cup'],
  [/formula|equacao|\bp ?= ?e\b|energia ?\/ ?tempo|energia ÷ tempo/, 'formula'],
  [/papel|caderno|folha|anota|bloco de notas|post-?it|carta\b/, 'paper'],
  [/planilha|grafico|dashboard|painel|\btela\b|relatorio|quadro de planejamento|indicador/, 'chart'],
  [/\blogo|\bmarca\b|simbolo|assinatura|lettering|texto na tela|cartela/, 'logo'],
  [/\bblocos?\b|pilulas?|\bpecas?\b|encaix|modul|lego/, 'blocks'],
  [/janela|\bluz\b/, 'window'],
  [/produto|embalagem|\bcaixas?\b|pacote|sacola|garrafa/, 'product'],
  [/\bloja\b|vitrine|fachada|comercio|cafeteria/, 'shop'],
  [/\brua\b|cidade|calcada|avenida|predios?/, 'street'],
]

/** Camera moves named in the scene text, for when the caller does not pass one. */
const MOVE_WORDS: [RegExp, string][] = [
  [/push.?in|dolly.?in|aproxima/, 'push-in'],
  [/zoom.?out|afasta|recua/, 'zoom-out'],
  [/time.?lapse/, 'time-lapse'],
  [/travel+ing|tracking|acompanha/, 'tracking'],
  [/\bpan\b|panoramica/, 'pan'],
  [/\btilt\b/, 'tilt'],
  [/camera na mao|handheld/, 'handheld'],
  [/\bgrua\b|crane/, 'crane'],
]

/** Subjects in the order the text mentions them, so the first one leads the frame. */
function subjectsIn(t: string): SketchSubject[] {
  const found = SUBJECT_WORDS.map(([re, subject]) => ({ subject, at: t.search(re) }))
    .filter((f) => f.at >= 0)
    .sort((a, b) => a.at - b.at)
    .map((f) => f.subject)
  // a written formula already is the paper
  return found.includes('formula') ? found.filter((s) => s !== 'paper') : found
}

function seedOf(t: string) {
  let h = 2166136261
  for (let i = 0; i < t.length; i++) h = Math.imul(h ^ t.charCodeAt(i), 16777619)
  return (h >>> 0) % 1e6
}

/**
 * Reads a scene's text into a storyboard spec: who is in it, what it shows, the framing and the camera move.
 * The same text always draws the same frame unless a seed is passed.
 */
export function specFromDescription(
  text: string,
  opts: { characters?: Asset[]; shot?: ShotType; time?: TimeOfDay; seed?: number; movement?: string; aspect?: Project['aspect'] } = {},
): StoryboardSpec {
  const t = norm(text)
  const setting = SETTINGS.find(([re]) => re.test(t))?.[1] ?? 'empty'
  const chars = charactersIn(text, opts.characters ?? [])
  let subjects = subjectsIn(t)
  let people: SketchPerson[] = chars.map((c) => ({ ...lookFor(c.description), x: 0, name: c.name, kind: isChildAsset(c) ? 'child' : 'adult', pose: 'stand', facing: 'right' }))
  if (!people.length) {
    const n = /familia/.test(t) || GROUP_WORDS.test(t) ? 3 : /casal|dois|duas/.test(t) ? 2 : PERSON_WORDS.test(t) ? 1 : 0
    people = Array.from({ length: n }, (_, i) => ({ x: 0, kind: i === 2 && /familia/.test(t) ? 'child' : 'adult', pose: 'stand', facing: 'right' }))
  }
  // never an empty frame: someone at a laptop
  if (!people.length && !subjects.some((s) => s !== 'window' && s !== 'desk')) {
    people = [{ x: 0, kind: 'adult', pose: 'stand', facing: 'right' }]
    subjects = [...subjects, 'laptop', 'desk']
  }
  const span = Math.min(0.6, 0.22 * Math.max(0, people.length - 1))
  people.forEach((p, i) => {
    p.x = people.length === 1 ? 0.5 : 0.5 - span / 2 + (span * i) / (people.length - 1)
    p.facing = p.x > 0.5 ? 'left' : 'right'
    if (/acen/.test(t) && i === 0) p.pose = 'wave'
    if (/sentad|sofa/.test(t)) p.pose = 'sit'
    if (/caminh|andando|chegando|entra/.test(t)) p.pose = 'walk'
  })
  const props = PROPS.filter(([re]) => re.test(t)).map(([, p]) => p)
  return {
    setting,
    time: opts.time && opts.time !== 'unknown' ? opts.time : /noite/.test(t) ? 'night' : /por do sol|entardecer/.test(t) ? 'sunset' : 'day',
    shot: opts.shot ?? 'aberto',
    people,
    props,
    weather: /chuv/.test(t) ? 'rain' : 'none',
    seed: opts.seed ?? seedOf(t),
    subjects,
    movement: opts.movement ?? MOVE_WORDS.find(([re]) => re.test(t))?.[1],
    aspect: opts.aspect,
  }
}

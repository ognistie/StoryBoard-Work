import type { HairStyle, Outfit, ShotType, SketchPerson, SketchSpec } from './types'

/**
 * Local, deterministic storyboard renderer used by the demo provider.
 * It is NOT an AI model: it draws an ink-and-pencil storyboard panel from a
 * SketchSpec so the whole workflow can be demonstrated without API keys.
 *
 * Visual language (based on the studio's reference boards):
 * - characters in dark ink with readable faces, hair and wardrobe;
 * - backgrounds in lighter pencil so figure/ground separation is instant;
 * - thick panel border, clean white paper.
 */

export const SKETCH_W = 1280
export const SKETCH_H = 720

const INK = '#1b1a18'
const PENCIL = '#66625b'
const LIGHT = '#9b978e'
const PAPER = '#ffffff'
const SHIRT = '#f3f1eb'
const PANTS = '#c8c4b9'
const HAIR = '#36342f'

type Ctx = CanvasRenderingContext2D
type Pt = [number, number]

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hash(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

interface StrokeOpts {
  w?: number
  color?: string
  alpha?: number
  fill?: string
  jitter?: number
  passes?: number
  /** straight segments with crisp corners (rectangles, roofs) instead of smoothed curves */
  sharp?: boolean
}

/** Hand-drawn pen: slightly wobbly, smoothed strokes with optional fill. */
class Pen {
  rnd: () => number
  constructor(
    public ctx: Ctx,
    seed: number,
    public s: number, // line-width scale
  ) {
    this.rnd = mulberry32(seed)
  }
  j(n: number) {
    return (this.rnd() - 0.5) * n
  }
  private trace(pts: Pt[], closed: boolean, jitter: number, sharp = false) {
    const c = this.ctx
    const p = pts.map(([x, y]) => [x + this.j(jitter), y + this.j(jitter)] as Pt)
    c.beginPath()
    if (p.length < 3 || sharp) {
      c.moveTo(p[0][0], p[0][1])
      for (let i = 1; i < p.length; i++) c.lineTo(p[i][0], p[i][1])
      if (closed) c.closePath()
      return
    }
    const mid = (a: Pt, b: Pt): Pt => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
    if (closed) {
      const start = mid(p[p.length - 1], p[0])
      c.moveTo(start[0], start[1])
      for (let i = 0; i < p.length; i++) {
        const m = mid(p[i], p[(i + 1) % p.length])
        c.quadraticCurveTo(p[i][0], p[i][1], m[0], m[1])
      }
      c.closePath()
    } else {
      c.moveTo(p[0][0], p[0][1])
      for (let i = 1; i < p.length - 1; i++) {
        const m = mid(p[i], p[i + 1])
        c.quadraticCurveTo(p[i][0], p[i][1], m[0], m[1])
      }
      c.lineTo(p[p.length - 1][0], p[p.length - 1][1])
    }
  }
  path(pts: Pt[], closed: boolean, o: StrokeOpts = {}) {
    const c = this.ctx
    const w = (o.w ?? 2) * this.s
    const jitter = (o.jitter ?? 1) * this.s
    c.save()
    c.globalAlpha = o.alpha ?? 1
    if (o.fill) {
      this.trace(pts, true, 0, o.sharp)
      c.fillStyle = o.fill
      c.fill()
    }
    c.strokeStyle = o.color ?? INK
    const passes = o.passes ?? 2
    for (let i = 0; i < passes; i++) {
      c.lineWidth = i === 0 ? w : w * 0.45
      c.globalAlpha = (o.alpha ?? 1) * (i === 0 ? 1 : 0.55)
      this.trace(pts, closed, jitter * (i === 0 ? 0.6 : 1.4), o.sharp)
      c.stroke()
    }
    c.restore()
  }
  line(x1: number, y1: number, x2: number, y2: number, o: StrokeOpts = {}) {
    const mx = (x1 + x2) / 2 + this.j(2 * this.s)
    const my = (y1 + y2) / 2 + this.j(2 * this.s)
    this.path([[x1, y1], [mx, my], [x2, y2]], false, o)
  }
  rect(x: number, y: number, w: number, h: number, o: StrokeOpts = {}) {
    this.path([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], true, { ...o, jitter: o.jitter ?? 0.6, sharp: true })
  }
  ellipse(cx: number, cy: number, rx: number, ry: number, o: StrokeOpts = {}, from = 0, to = Math.PI * 2) {
    const n = Math.max(10, Math.round(Math.max(rx, ry) / 3))
    const pts: Pt[] = []
    const full = Math.abs(to - from) >= Math.PI * 2 - 0.01
    for (let i = 0; i <= n - (full ? 1 : 0); i++) {
      const t = from + ((to - from) * i) / n
      pts.push([cx + Math.cos(t) * rx, cy + Math.sin(t) * ry])
    }
    this.path(pts, full, o)
  }
  /** Parallel hatching clipped to the current clip region. */
  hatch(x: number, y: number, w: number, h: number, gap: number, o: StrokeOpts = {}, slope = 1) {
    const c = this.ctx
    c.save()
    c.beginPath()
    c.rect(x, y, w, h)
    c.clip()
    for (let i = -h * Math.abs(slope); i < w + h; i += gap * this.s) this.line(x + i, y + h, x + i + h * slope, y, { w: 0.9, passes: 1, jitter: 1.5, ...o })
    c.restore()
  }
  /** Scalloped foliage (trees, bushes) with inner curls, like the reference boards. */
  scribble(cx: number, cy: number, rx: number, ry: number, o: StrokeOpts = {}) {
    const c = this.ctx
    const n = Math.max(9, Math.round((rx + ry) / (14 * this.s)))
    const pts: Pt[] = []
    for (let i = 0; i < n; i++) {
      const t = (i / n) * Math.PI * 2 + this.j(0.12)
      const k = 0.92 + this.rnd() * 0.12
      pts.push([cx + Math.cos(t) * rx * k, cy + Math.sin(t) * ry * k])
    }
    c.save()
    c.lineCap = 'round'
    c.strokeStyle = o.color ?? INK
    c.globalAlpha = o.alpha ?? 1
    c.beginPath()
    c.moveTo(pts[0][0], pts[0][1])
    for (let i = 0; i < n; i++) {
      const a = pts[i]
      const b = pts[(i + 1) % n]
      const mx = (a[0] + b[0]) / 2
      const my = (a[1] + b[1]) / 2
      // push the control point outward to create a bump
      const ox = mx - cx
      const oy = my - cy
      const len = Math.hypot(ox, oy) || 1
      const bump = Math.hypot(b[0] - a[0], b[1] - a[1]) * 0.55
      c.quadraticCurveTo(mx + (ox / len) * bump, my + (oy / len) * bump, b[0], b[1])
    }
    c.closePath()
    if (o.fill) {
      c.fillStyle = o.fill
      c.fill()
    }
    c.lineWidth = (o.w ?? 1.6) * this.s
    c.stroke()
    c.restore()
    for (let i = 0; i < n * 0.6; i++) {
      const a = this.rnd() * Math.PI * 2
      const r = 0.25 + 0.45 * this.rnd()
      const x = cx + Math.cos(a) * rx * r
      const y = cy + Math.sin(a) * ry * r
      const sz = 7 * this.s
      this.path([[x - sz, y + sz * 0.3], [x - sz * 0.2, y - sz * 0.6], [x + sz * 0.6, y - sz * 0.2], [x + sz * 0.2, y + sz * 0.4]], false, { w: 1, passes: 1, color: o.color, alpha: (o.alpha ?? 1) * 0.8 })
    }
  }
  tuft(x: number, y: number, size: number, o: StrokeOpts = {}) {
    const s = size * this.s
    this.path([[x - s, y], [x - s * 0.6, y - s * 1.3], [x - s * 0.2, y], [x + s * 0.2, y - s * 1.5], [x + s * 0.6, y], [x + s, y - s * 1.1], [x + s * 1.3, y]], false, { w: 1.2, passes: 1, ...o })
  }
  text(t: string, x: number, y: number, size: number, color = INK, weight = 700) {
    const c = this.ctx
    c.save()
    c.fillStyle = color
    c.font = `${weight} ${size * this.s}px Inter, Arial, sans-serif`
    c.textAlign = 'center'
    c.textBaseline = 'middle'
    c.fillText(t, x, y)
    c.restore()
  }
}

// ---------------------------------------------------------------- framing

const SHOT_SCALE: Record<ShotType, number> = {
  geral: 0.3,
  aberto: 0.42,
  americano: 1.05,
  medio: 1.4,
  close: 2.1,
  'extreme-close': 3.6,
  detalhe: 0.42,
  pov: 0.42,
  ots: 1.05,
}

/** Where the head center lands for tight shots (fraction of frame height). */
const HEAD_Y: Partial<Record<ShotType, number>> = { americano: 0.22, medio: 0.27, ots: 0.3, close: 0.42, 'extreme-close': 0.5 }

const BG_ZOOM: Record<ShotType, number> = {
  geral: 0.85,
  aberto: 1,
  americano: 1.3,
  medio: 1.55,
  close: 2.1,
  'extreme-close': 2.8,
  detalhe: 1,
  pov: 1,
  ots: 1.45,
}

// ---------------------------------------------------------------- main

export function renderSketch(ctx: Ctx, spec: SketchSpec, w = SKETCH_W, h = SKETCH_H) {
  const s = w / 960
  const pen = new Pen(ctx, spec.seed, s)
  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.fillStyle = PAPER
  ctx.fillRect(0, 0, w, h)

  const interior = spec.setting === 'living' || spec.setting === 'kitchen' || spec.setting === 'office'
  const horizon = h * (interior ? 0.66 : 0.62)
  const zoom = BG_ZOOM[spec.shot] ?? 1
  const tight = spec.shot === 'close' || spec.shot === 'extreme-close'

  // background: lighter pencil, zoomed for tighter shots (depth of field)
  ctx.save()
  ctx.translate(w / 2, horizon)
  ctx.scale(zoom, zoom)
  ctx.translate(-w / 2, -horizon)
  ctx.globalAlpha = tight ? 0.45 : 1
  drawSky(pen, spec, w, horizon, interior)
  drawSetting(pen, spec, w, h, horizon)
  ctx.restore()
  ctx.globalAlpha = 1

  if (spec.shot === 'detalhe') {
    drawDetail(pen, spec, w, h)
  } else {
    for (const prop of spec.props) drawProp(pen, prop, w, h, horizon, interior)
    const scale = SHOT_SCALE[spec.shot] ?? 0.42
    // children and characters further from center first, so the lead overlaps
    const people = [...spec.people].sort((a, b) => Math.abs(b.x - 0.5) - Math.abs(a.x - 0.5))
    for (const person of people) drawPerson(pen, person, w, h, horizon, scale, spec.shot)
  }

  if (spec.shot === 'ots') drawShoulder(pen, w, h)

  if (spec.time === 'night') {
    ctx.fillStyle = 'rgba(22,26,40,0.24)'
    ctx.fillRect(0, 0, w, h)
  } else if (spec.time === 'sunset') {
    const g = ctx.createLinearGradient(0, 0, 0, h)
    g.addColorStop(0, 'rgba(236,150,70,0.16)')
    g.addColorStop(0.7, 'rgba(236,150,70,0.04)')
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
  }

  if (spec.weather === 'rain') {
    for (let i = 0; i < 320; i++) {
      const x = pen.rnd() * w
      const y = pen.rnd() * h
      pen.line(x, y, x - 7 * s, y + 20 * s, { w: 0.8, color: PENCIL, alpha: 0.55, passes: 1 })
    }
  }

  if (spec.shot === 'pov') {
    ctx.save()
    ctx.fillStyle = 'rgba(27,26,24,0.55)'
    ctx.beginPath()
    ctx.rect(0, 0, w, h)
    ctx.ellipse(w / 2, h / 2, w * 0.47, h * 0.46, 0, 0, Math.PI * 2, true)
    ctx.fill('evenodd')
    ctx.restore()
  }

  // panel border
  ctx.strokeStyle = INK
  ctx.lineWidth = 6 * s
  ctx.strokeRect(3 * s, 3 * s, w - 6 * s, h - 6 * s)
  ctx.restore()
}

// ---------------------------------------------------------------- sky & settings

function drawSky(p: Pen, spec: SketchSpec, w: number, horizon: number, interior: boolean) {
  const s = p.s
  if (interior) return
  if (spec.time === 'night') {
    p.hatch(0, 0, w, horizon, 7, { color: PENCIL, alpha: 0.5 }, 0.6)
    p.hatch(0, 0, w, horizon * 0.7, 9, { color: PENCIL, alpha: 0.35 }, -0.6)
    const mx = w * 0.82
    const my = horizon * 0.26
    p.ctx.save()
    p.ctx.fillStyle = PAPER
    p.ctx.beginPath()
    p.ctx.arc(mx, my, 34 * s, 0, Math.PI * 2)
    p.ctx.fill()
    p.ctx.restore()
    p.ellipse(mx, my, 34 * s, 34 * s, { w: 2, color: PENCIL })
    p.ellipse(mx + 12 * s, my - 6 * s, 26 * s, 28 * s, { w: 1.2, color: LIGHT })
    for (let i = 0; i < 26; i++) {
      const x = p.rnd() * w
      const y = p.rnd() * horizon * 0.75
      p.ctx.fillStyle = PAPER
      p.ctx.fillRect(x, y, 3 * s, 3 * s)
    }
  } else if (spec.time === 'sunset') {
    const sx = w * 0.72
    p.ellipse(sx, horizon, 60 * s, 60 * s, { w: 2.2, color: PENCIL }, Math.PI, Math.PI * 2)
    for (let i = 0; i < 9; i++) {
      const a = Math.PI + (Math.PI * (i + 0.5)) / 9
      p.line(sx + Math.cos(a) * 78 * s, horizon + Math.sin(a) * 78 * s, sx + Math.cos(a) * 110 * s, horizon + Math.sin(a) * 110 * s, { w: 1.4, color: PENCIL, passes: 1 })
    }
    for (let i = 0; i < 7; i++) {
      const y = horizon * (0.3 + i * 0.07)
      const x0 = p.rnd() * w * 0.5
      p.line(x0, y, x0 + w * (0.25 + p.rnd() * 0.3), y, { w: 1, color: LIGHT, passes: 1 })
    }
  } else {
    for (const [cx, cy, k] of [
      [w * 0.2, horizon * 0.22, 1],
      [w * 0.62, horizon * 0.15, 0.8],
    ] as const) {
      p.ellipse(cx, cy, 46 * s * k, 16 * s * k, { w: 1.3, color: LIGHT }, Math.PI * 0.95, Math.PI * 2.05)
      p.ellipse(cx + 38 * s * k, cy - 4 * s * k, 30 * s * k, 18 * s * k, { w: 1.3, color: LIGHT }, Math.PI, Math.PI * 2)
      p.line(cx - 46 * s * k, cy + 2 * s, cx + 70 * s * k, cy + 2 * s, { w: 1.1, color: LIGHT, passes: 1 })
    }
  }
}

function drawSetting(p: Pen, spec: SketchSpec, w: number, h: number, horizon: number) {
  const s = p.s
  const bg = { color: PENCIL, w: 1.8 }
  const fine = { color: LIGHT, w: 1.1, passes: 1 }
  switch (spec.setting) {
    case 'house': {
      p.line(0, horizon, w, horizon, bg)
      const hx = w * 0.31
      const hw = w * 0.38
      const hh = h * 0.3
      const hy = horizon - hh
      // roof with shingle hatching
      p.path([[hx - 28 * s, hy], [hx + hw / 2, hy - h * 0.17], [hx + hw + 28 * s, hy]], true, { ...bg, fill: PAPER, sharp: true })
      p.ctx.save()
      p.ctx.beginPath()
      p.ctx.moveTo(hx - 28 * s, hy)
      p.ctx.lineTo(hx + hw / 2, hy - h * 0.17)
      p.ctx.lineTo(hx + hw + 28 * s, hy)
      p.ctx.closePath()
      p.ctx.clip()
      for (let y = hy - h * 0.15; y < hy; y += 11 * s) p.line(hx - 30 * s, y, hx + hw + 30 * s, y, fine)
      p.ctx.restore()
      p.rect(hx + hw * 0.72, hy - h * 0.14, 26 * s, h * 0.08, { ...bg, fill: PAPER })
      p.rect(hx, hy, hw, hh, { ...bg, fill: PAPER })
      // windows
      for (const wx of [hx + hw * 0.08, hx + hw * 0.7]) {
        const ww = hw * 0.22
        const wy = hy + hh * 0.2
        const wh = hh * 0.36
        p.rect(wx, wy, ww, wh, bg)
        p.line(wx + ww / 2, wy, wx + ww / 2, wy + wh, fine)
        p.line(wx, wy + wh / 2, wx + ww, wy + wh / 2, fine)
        p.hatch(wx + 2 * s, wy + 2 * s, ww * 0.35, wh - 4 * s, 6, { color: LIGHT, alpha: 0.7 })
        p.line(wx - 6 * s, wy + wh + 3 * s, wx + ww + 6 * s, wy + wh + 3 * s, bg)
      }
      // door
      const dx = hx + hw * 0.42
      const dw = hw * 0.16
      p.rect(dx, horizon - hh * 0.6, dw, hh * 0.6, { ...bg, fill: '#ecebe6' })
      p.ellipse(dx + dw * 0.8, horizon - hh * 0.3, 3 * s, 3 * s, { ...bg, w: 1.4, fill: PENCIL })
      p.line(dx - 10 * s, horizon + 4 * s, dx + dw + 10 * s, horizon + 4 * s, bg)
      // path
      p.line(dx, horizon + 4 * s, w * 0.33, h, { ...bg, w: 1.4 })
      p.line(dx + dw, horizon + 4 * s, w * 0.67, h, { ...bg, w: 1.4 })
      // fence
      for (const [a, b] of [
        [0, hx - 30 * s],
        [hx + hw + 30 * s, w],
      ]) {
        for (let x = a + 8 * s; x < b; x += 22 * s) p.path([[x, horizon], [x, horizon - 38 * s], [x + 5 * s, horizon - 46 * s], [x + 10 * s, horizon - 38 * s], [x + 10 * s, horizon]], false, { ...fine, sharp: true })
        p.line(a, horizon - 26 * s, b, horizon - 26 * s, fine)
      }
      p.scribble(hx - 16 * s, horizon - 16 * s, 46 * s, 22 * s, { ...bg, w: 1.4, fill: PAPER })
      p.scribble(hx + hw + 18 * s, horizon - 14 * s, 40 * s, 20 * s, { ...bg, w: 1.4, fill: PAPER })
      drawTree(p, w * 0.88, horizon, 1.1)
      for (let i = 0; i < 9; i++) p.tuft(p.rnd() * w, horizon + 20 * s + p.rnd() * (h - horizon - 40 * s), 7, { color: LIGHT })
      break
    }
    case 'garden': {
      p.line(0, horizon, w, horizon, bg)
      for (let x = 10 * s; x < w; x += 46 * s) p.rect(x, horizon - 64 * s, 9 * s, 64 * s, { ...fine, w: 1.2 })
      p.line(0, horizon - 50 * s, w, horizon - 50 * s, fine)
      p.line(0, horizon - 22 * s, w, horizon - 22 * s, fine)
      drawTree(p, w * 0.24, horizon + 10 * s, 1.9)
      p.scribble(w * 0.78, horizon - 22 * s, 70 * s, 28 * s, { ...bg, w: 1.3, fill: PAPER })
      for (let i = 0; i < 22; i++) p.tuft(p.rnd() * w, horizon + 16 * s + p.rnd() * (h - horizon - 30 * s), 8, { color: LIGHT })
      break
    }
    case 'street': {
      p.line(0, horizon, w, horizon, fine)
      const vx = w / 2
      p.line(vx - 30 * s, horizon, 0, h * 0.95, bg)
      p.line(vx + 30 * s, horizon, w, h * 0.95, bg)
      p.line(vx - 60 * s, horizon, -w * 0.2, h, fine)
      p.line(vx + 60 * s, horizon, w * 1.2, h, fine)
      for (let i = 0; i < 6; i++) {
        const t = (i + 1) / 7
        const y = horizon + (h - horizon) * t * t
        p.line(vx, y, vx, y + 22 * s * t + 4 * s, { ...bg, w: 3 * t + 1 })
      }
      for (const side of [-1, 1]) {
        for (let b = 0; b < 4; b++) {
          const bw = 92 * s
          const bx = side < 0 ? 10 * s + b * 108 * s : w - 10 * s - bw - b * 108 * s
          const bh = (150 + ((b * 61) % 90)) * s
          p.rect(bx, horizon - bh, bw, bh, { ...bg, fill: PAPER })
          for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) p.rect(bx + 12 * s + c * 26 * s, horizon - bh + 16 * s + r * 34 * s, 16 * s, 20 * s, fine)
        }
      }
      for (const x of [w * 0.3, w * 0.7]) {
        p.line(x, horizon + 30 * s, x, horizon - 110 * s, bg)
        p.path([[x, horizon - 110 * s], [x + (x < vx ? 24 : -24) * s, horizon - 120 * s]], false, bg)
      }
      break
    }
    case 'living': {
      const floor = horizon
      p.line(0, floor, w, floor, bg)
      p.line(0, floor - 12 * s, w, floor - 12 * s, fine)
      // window with curtains
      const wx = w * 0.56
      p.rect(wx, h * 0.12, w * 0.26, h * 0.34, { ...bg, fill: spec.time === 'night' ? '#d9d8d3' : PAPER })
      p.line(wx + w * 0.13, h * 0.12, wx + w * 0.13, h * 0.46, fine)
      p.line(wx, h * 0.29, wx + w * 0.26, h * 0.29, fine)
      for (const cx of [wx - 18 * s, wx + w * 0.26 + 4 * s]) for (let k = 0; k < 3; k++) p.path([[cx + k * 6 * s, h * 0.1], [cx + k * 6 * s + 4 * s, h * 0.28], [cx + k * 6 * s - 2 * s, h * 0.5]], false, fine)
      p.line(wx - 30 * s, h * 0.1, wx + w * 0.26 + 30 * s, h * 0.1, bg)
      // picture frame + shelf
      p.rect(w * 0.18, h * 0.14, w * 0.17, h * 0.16, bg)
      p.path([[w * 0.2, h * 0.27], [w * 0.25, h * 0.2], [w * 0.28, h * 0.24], [w * 0.33, h * 0.17]], false, fine)
      // sofa
      const sx = w * 0.08
      const sw = w * 0.38
      p.rect(sx, floor - h * 0.26, sw, h * 0.12, { ...bg, fill: '#efede7' })
      p.rect(sx, floor - h * 0.15, sw, h * 0.11, { ...bg, fill: '#efede7' })
      p.rect(sx - 22 * s, floor - h * 0.2, 30 * s, h * 0.18, { ...bg, fill: '#efede7' })
      p.rect(sx + sw - 8 * s, floor - h * 0.2, 30 * s, h * 0.18, { ...bg, fill: '#efede7' })
      p.line(sx + sw / 2, floor - h * 0.15, sx + sw / 2, floor - h * 0.04, fine)
      p.line(sx + 10 * s, floor - h * 0.04, sx + 10 * s, floor, bg)
      p.line(sx + sw - 10 * s, floor - h * 0.04, sx + sw - 10 * s, floor, bg)
      // lamp & plant
      p.line(w * 0.9, floor, w * 0.9, floor - h * 0.36, bg)
      p.path([[w * 0.86, floor - h * 0.36], [w * 0.94, floor - h * 0.36], [w * 0.925, floor - h * 0.45], [w * 0.875, floor - h * 0.45]], true, { ...bg, fill: PAPER, sharp: true })
      p.rect(w * 0.5, floor - 34 * s, 36 * s, 34 * s, bg)
      p.scribble(w * 0.5 + 18 * s, floor - 60 * s, 30 * s, 28 * s, { ...fine, w: 1.2 })
      p.ellipse(w * 0.45, floor + (h - floor) * 0.5, w * 0.3, (h - floor) * 0.28, fine)
      break
    }
    case 'kitchen': {
      const floor = horizon
      p.line(0, floor, w, floor, bg)
      p.rect(w * 0.04, floor - h * 0.24, w * 0.68, h * 0.24, { ...bg, fill: PAPER })
      p.line(w * 0.03, floor - h * 0.24, w * 0.73, floor - h * 0.24, { ...bg, w: 3 })
      for (let i = 0; i < 4; i++) {
        p.rect(w * 0.06 + i * w * 0.165, floor - h * 0.2, w * 0.15, h * 0.18, fine)
        p.line(w * 0.12 + i * w * 0.165, floor - h * 0.17, w * 0.15 + i * w * 0.165, floor - h * 0.17, fine)
      }
      for (let i = 0; i < 3; i++) p.rect(w * 0.06 + i * w * 0.2, h * 0.06, w * 0.17, h * 0.18, bg)
      p.rect(w * 0.76, h * 0.12, w * 0.18, floor - h * 0.12, { ...bg, fill: PAPER })
      p.line(w * 0.76, h * 0.34, w * 0.94, h * 0.34, bg)
      p.line(w * 0.78, h * 0.2, w * 0.78, h * 0.28, bg)
      p.rect(w * 0.3, h * 0.28, w * 0.18, h * 0.14, bg)
      break
    }
    case 'office': {
      const floor = horizon
      p.line(0, floor, w, floor, bg)
      p.rect(w * 0.08, h * 0.08, w * 0.84, h * 0.38, { ...bg, fill: PAPER })
      for (let i = 1; i < 12; i++) p.line(w * 0.08, h * 0.08 + i * h * 0.032, w * 0.92, h * 0.08 + i * h * 0.032, fine)
      p.rect(w * 0.24, floor - h * 0.05, w * 0.52, h * 0.05, { ...bg, fill: '#ecebe6' })
      p.line(w * 0.27, floor, w * 0.27, h * 0.95, bg)
      p.line(w * 0.73, floor, w * 0.73, h * 0.95, bg)
      p.rect(w * 0.55, floor - h * 0.2, w * 0.14, h * 0.13, { ...bg, fill: PAPER })
      p.line(w * 0.62, floor - h * 0.07, w * 0.62, floor - h * 0.05, bg)
      p.rect(w * 0.1, floor - 40 * s, 34 * s, 40 * s, bg)
      p.scribble(w * 0.1 + 17 * s, floor - 70 * s, 34 * s, 30 * s, { ...fine, w: 1.2 })
      break
    }
    case 'car': {
      p.line(0, horizon + 50 * s, w, horizon + 50 * s, fine)
      drawCar(p, w * 0.5, horizon + 50 * s, 1.9, bg)
      break
    }
    default: {
      p.line(0, horizon, w, horizon, fine)
      for (let i = 0; i < 6; i++) p.tuft(p.rnd() * w, horizon + 20 * s + p.rnd() * (h - horizon - 40 * s), 7, { color: LIGHT })
    }
  }
}

function drawTree(p: Pen, x: number, ground: number, k: number) {
  const s = p.s * k
  const bg = { color: PENCIL, w: 1.8 }
  p.path([[x - 10 * s, ground], [x - 7 * s, ground - 40 * s], [x - 6 * s, ground - 90 * s]], false, bg)
  p.path([[x + 10 * s, ground], [x + 7 * s, ground - 40 * s], [x + 6 * s, ground - 90 * s]], false, bg)
  p.line(x, ground - 70 * s, x + 18 * s, ground - 100 * s, { ...bg, w: 1.2 })
  p.scribble(x, ground - 140 * s, 72 * s, 60 * s, { ...bg, w: 1.5, fill: PAPER })
}

function drawCar(p: Pen, cx: number, ground: number, k: number, o: StrokeOpts = { color: INK, w: 2 }) {
  const s = p.s * k
  const L = 150 * s
  const fill = '#f1efe9'
  p.path([[cx - L, ground - 22 * s], [cx - L, ground - 48 * s], [cx - L * 0.55, ground - 54 * s], [cx - L * 0.32, ground - 90 * s], [cx + L * 0.3, ground - 90 * s], [cx + L * 0.55, ground - 54 * s], [cx + L, ground - 46 * s], [cx + L, ground - 22 * s]], true, { ...o, fill })
  p.path([[cx - L * 0.5, ground - 56 * s], [cx - L * 0.3, ground - 84 * s], [cx - 4 * s, ground - 84 * s], [cx - 4 * s, ground - 56 * s]], true, { ...o, w: 1.2, fill: '#dddbd4', sharp: true })
  p.path([[cx + 4 * s, ground - 56 * s], [cx + 4 * s, ground - 84 * s], [cx + L * 0.28, ground - 84 * s], [cx + L * 0.48, ground - 56 * s]], true, { ...o, w: 1.2, fill: '#dddbd4', sharp: true })
  p.line(cx, ground - 54 * s, cx, ground - 24 * s, { ...o, w: 1 })
  for (const wx of [cx - L * 0.6, cx + L * 0.6]) {
    p.ellipse(wx, ground - 18 * s, 26 * s, 26 * s, { ...o, fill: '#3a3934' })
    p.ellipse(wx, ground - 18 * s, 11 * s, 11 * s, { ...o, w: 1.2, fill: '#cfccc4' })
  }
  p.ellipse(cx + L - 8 * s, ground - 40 * s, 6 * s, 5 * s, { ...o, w: 1 })
}

// ---------------------------------------------------------------- props

function drawProp(p: Pen, prop: string, w: number, h: number, horizon: number, interior: boolean) {
  const s = p.s
  const floor = horizon
  switch (prop) {
    case 'carro':
      drawCar(p, w * 0.17, horizon + 62 * s, 0.85, { color: INK, w: 2 })
      break
    case 'arvore':
      drawTree(p, w * 0.08, horizon, 1.2)
      break
    case 'cachorro': {
      const x = w * 0.64
      const y = (interior ? floor : horizon) + 60 * s
      const o = { color: INK, w: 2, fill: '#f0eee8' }
      for (const [dx, dk] of [[-26, 1], [-14, -1], [18, 1], [28, -1]] as const) p.path([[x + dx * s, y - 10 * s], [x + (dx + dk * 2) * s, y + 14 * s]], false, { color: INK, w: 3 })
      p.ellipse(x, y - 16 * s, 40 * s, 17 * s, o)
      p.path([[x - 38 * s, y - 22 * s], [x - 54 * s, y - 40 * s], [x - 50 * s, y - 44 * s]], false, { color: INK, w: 2.2 })
      p.ellipse(x + 44 * s, y - 34 * s, 17 * s, 15 * s, o)
      p.ellipse(x + 58 * s, y - 28 * s, 9 * s, 6 * s, o)
      p.path([[x + 34 * s, y - 46 * s], [x + 30 * s, y - 28 * s], [x + 40 * s, y - 34 * s]], true, { color: INK, w: 1.6, fill: HAIR })
      p.ellipse(x + 48 * s, y - 38 * s, 2 * s, 2.4 * s, { color: INK, w: 1, fill: INK })
      break
    }
    case 'caixas': {
      const x = w * 0.7
      const o = { color: INK, w: 2, fill: '#efe9da' }
      p.rect(x, floor - 4 * s, 78 * s, 62 * s, o)
      p.rect(x + 12 * s, floor - 56 * s, 58 * s, 52 * s, o)
      p.line(x + 39 * s, floor - 4 * s, x + 39 * s, floor + 58 * s, { color: PENCIL, w: 1 })
      p.line(x + 41 * s, floor - 56 * s, x + 41 * s, floor - 4 * s, { color: PENCIL, w: 1 })
      p.text('MUDANÇA', x + 39 * s, floor + 30 * s, 9, PENCIL)
      break
    }
    case 'placa': {
      const x = w * 0.12
      p.line(x, horizon + 30 * s, x, horizon - 90 * s, { color: INK, w: 3 })
      p.rect(x - 56 * s, horizon - 150 * s, 112 * s, 58 * s, { color: INK, w: 2.4, fill: PAPER })
      p.text('VENDIDO', x, horizon - 121 * s, 18)
      break
    }
    case 'chaves':
      drawKeys(p, w * 0.8, h * 0.62, 0.7)
      break
    case 'luminaria':
      p.line(w * 0.92, floor, w * 0.92, floor - 160 * s, { color: INK, w: 2 })
      p.ellipse(w * 0.92, floor - 170 * s, 26 * s, 16 * s, { color: INK, w: 2, fill: PAPER })
      break
    case 'balao':
      p.line(w * 0.78, h * 0.32, w * 0.75, h * 0.62, { color: INK, w: 1.2 })
      p.ellipse(w * 0.78, h * 0.24, 28 * s, 36 * s, { color: INK, w: 2, fill: PAPER })
      break
  }
}

function drawKeys(p: Pen, cx: number, cy: number, k: number) {
  const s = p.s * k
  const o = { color: INK, w: 2.6 }
  p.ellipse(cx, cy, 40 * s, 40 * s, o)
  p.ellipse(cx - 30 * s, cy + 30 * s, 26 * s, 34 * s, { ...o, fill: '#e9e7e0' })
  p.ellipse(cx - 30 * s, cy + 22 * s, 8 * s, 8 * s, { ...o, w: 1.6, fill: PAPER })
  p.path([[cx - 18 * s, cy + 60 * s], [cx + 4 * s, cy + 190 * s], [cx + 22 * s, cy + 186 * s], [cx + 8 * s, cy + 150 * s], [cx + 22 * s, cy + 140 * s], [cx + 2 * s, cy + 120 * s], [cx - 4 * s, cy + 64 * s]], true, { ...o, fill: '#e9e7e0' })
}

/** Plano detalhe: the keys of the new house hanging from a finger, with the brand tag. */
function drawDetail(p: Pen, spec: SketchSpec, w: number, h: number) {
  const s = p.s
  const o = { color: INK, w: 3, fill: PAPER }
  if (!spec.props.includes('chaves')) {
    p.ellipse(w / 2, h / 2, 120 * s, 120 * s, { w: 2.4 })
    return
  }
  // hand entering from the top-right, index finger extended
  p.path([[w * 1.02, h * 0.02], [w * 0.74, h * 0.05], [w * 0.66, h * 0.12], [w * 0.7, h * 0.24], [w * 0.86, h * 0.3], [w * 1.02, h * 0.3]], true, o)
  p.path(tube([[w * 0.68, h * 0.17], [w * 0.55, h * 0.19], [w * 0.47, h * 0.24]], 46 * s, 40 * s), true, o)
  p.ellipse(w * 0.475, h * 0.24, 6 * s, 9 * s, { color: INK, w: 1.6 })
  p.line(w * 0.66, h * 0.21, w * 0.78, h * 0.25, { color: INK, w: 1.8 })
  p.hatch(w * 0.74, h * 0.04, w * 0.28, h * 0.24, 8, { color: LIGHT, alpha: 0.8 })
  // ring + keys
  const rx = w * 0.47
  const ry = h * 0.37
  p.ellipse(rx, ry, 52 * s, 52 * s, { color: INK, w: 4 })
  p.path([[rx - 26 * s, ry + 40 * s], [rx - 60 * s, ry + 250 * s], [rx - 34 * s, ry + 254 * s], [rx - 36 * s, ry + 214 * s], [rx - 16 * s, ry + 206 * s], [rx - 30 * s, ry + 186 * s], [rx - 6 * s, ry + 44 * s]], true, { ...o, fill: '#ebe9e2', sharp: true })
  p.ellipse(rx - 18 * s, ry + 60 * s, 30 * s, 26 * s, { ...o, fill: '#ebe9e2' })
  p.path([[rx + 20 * s, ry + 44 * s], [rx + 74 * s, ry + 232 * s], [rx + 98 * s, ry + 224 * s], [rx + 86 * s, ry + 188 * s], [rx + 104 * s, ry + 176 * s], [rx + 84 * s, ry + 160 * s], [rx + 42 * s, ry + 40 * s]], true, { ...o, fill: '#d9d6ce', sharp: true })
  p.ellipse(rx + 30 * s, ry + 56 * s, 28 * s, 24 * s, { ...o, fill: '#d9d6ce' })
  // brand tag
  p.line(rx + 44 * s, ry + 26 * s, rx + 150 * s, ry + 70 * s, { color: INK, w: 2 })
  p.path([[rx + 140 * s, ry + 60 * s], [rx + 300 * s, ry + 60 * s], [rx + 300 * s, ry + 140 * s], [rx + 140 * s, ry + 140 * s], [rx + 120 * s, ry + 100 * s]], true, { ...o, sharp: true })
  p.text('HORIZONTE', rx + 214 * s, ry + 100 * s, 17)
  // motion/sparkle marks
  for (const [dx, dy] of [[-120, 40], [-140, 120], [180, 220]] as const) p.line(rx + dx * s, ry + dy * s, rx + (dx - 26) * s, ry + (dy + 8) * s, { color: PENCIL, w: 1.6, passes: 1 })
}

function drawShoulder(p: Pen, w: number, h: number) {
  const c = p.ctx
  const s = p.s
  c.save()
  c.fillStyle = '#2e2d29'
  c.globalAlpha = 0.92
  c.beginPath()
  c.ellipse(w * 0.06, h * 1.12, w * 0.24, h * 0.55, 0, 0, Math.PI * 2)
  c.fill()
  c.beginPath()
  c.ellipse(w * 0.13, h * 0.5, w * 0.1, h * 0.2, -0.15, 0, Math.PI * 2)
  c.fill()
  c.restore()
  p.hatch(0, h * 0.3, w * 0.24, h * 0.7, 6, { color: PAPER, alpha: 0.18 })
  p.ellipse(w * 0.13, h * 0.5, w * 0.1, h * 0.2, { color: INK, w: 2.4 })
  void s
}

// ---------------------------------------------------------------- people

const HAIRS: HairStyle[] = ['short', 'curly', 'long', 'ponytail', 'cap', 'bun', 'spiky']
const OUTFITS: Outfit[] = ['plain', 'striped', 'jacket', 'collar']

/** Traits of the demo cast, so they stay consistent across every panel. */
const KNOWN_LOOKS: Record<string, Pick<SketchPerson, 'hair' | 'outfit' | 'beard'>> = {
  ana: { hair: 'curly', outfit: 'jacket' },
  pedro: { hair: 'short', outfit: 'striped', beard: true },
  léo: { hair: 'cap', outfit: 'plain' },
  bia: { hair: 'bun', outfit: 'jacket' },
  marta: { hair: 'ponytail', outfit: 'collar' },
}

function lookOf(person: SketchPerson) {
  const h = hash(person.name ?? `${person.x}`)
  const known = KNOWN_LOOKS[(person.name ?? '').toLowerCase()] ?? {}
  return {
    hair: person.hair ?? known.hair ?? HAIRS[h % HAIRS.length],
    outfit: person.outfit ?? known.outfit ?? OUTFITS[(h >> 3) % OUTFITS.length],
    beard: person.beard ?? known.beard ?? false,
    expression: person.expression ?? (person.pose === 'wave' ? 'laugh' : 'smile'),
  }
}

/** Offset a polyline into a closed "tube" polygon (arms, legs). */
function tube(pts: Pt[], w0: number, w1: number): Pt[] {
  const left: Pt[] = []
  const right: Pt[] = []
  pts.forEach((pt, i) => {
    const a = pts[Math.max(0, i - 1)]
    const b = pts[Math.min(pts.length - 1, i + 1)]
    const dx = b[0] - a[0]
    const dy = b[1] - a[1]
    const len = Math.hypot(dx, dy) || 1
    const nx = -dy / len
    const ny = dx / len
    const hw = (w0 + (w1 - w0) * (i / (pts.length - 1))) / 2
    left.push([pt[0] + nx * hw, pt[1] + ny * hw])
    right.push([pt[0] - nx * hw, pt[1] - ny * hw])
  })
  return [...left, ...right.reverse()]
}

function drawPerson(p: Pen, person: SketchPerson, w: number, h: number, horizon: number, scale: number, shot: ShotType) {
  const kid = person.kind === 'child'
  const H = h * scale * (kid ? 0.68 : 1)
  const u = H / 100
  const x = person.x * w
  const d = person.facing === 'left' ? -1 : 1
  const look = lookOf(person)
  const sit = person.pose === 'sit'
  const headTarget = HEAD_Y[shot]
  const headC = kid ? 11 : 9.5
  const ground = headTarget !== undefined ? h * headTarget + H - headC * u : horizon + h * 0.2 + (kid ? 8 * p.s : 0)
  const top = ground - H + (sit ? 22 * u : 0)
  const Y = (v: number) => top + v * u
  const X = (v: number) => x + v * u
  const lw = Math.max(1.6, Math.min(4.2, u * 0.55)) / p.s
  const ink = { color: INK, w: lw }
  const thin = { color: INK, w: lw * 0.55, passes: 1 }
  const detailed = u > 1.6

  // contact shadow
  if (headTarget === undefined) {
    p.ctx.save()
    p.ctx.fillStyle = 'rgba(27,26,24,0.10)'
    p.ctx.beginPath()
    p.ctx.ellipse(x + (sit ? d * 10 * u : 0), ground, 16 * u, 2.6 * u, 0, 0, Math.PI * 2)
    p.ctx.fill()
    p.ctx.restore()
  }

  // proportions (units of H/100)
  const head = kid ? { rx: 9.5, ry: 10.5, cy: 11 } : { rx: 7.6, ry: 8.8, cy: 9.5 }
  const shY = kid ? 23 : 20
  const shW = kid ? 10 : 12.5
  const hipY = kid ? 56 : 52
  const hipW = kid ? 8.5 : 10.5
  const kneeY = kid ? 77 : 75

  // ----- legs
  const legW = kid ? 6.4 : 7.4
  const legs: Pt[][] = sit
    ? [
        [[X(-4), Y(hipY)], [X(-4 + d * 20), Y(hipY + 2)], [X(-4 + d * 21), Y(hipY + 26)]],
        [[X(4), Y(hipY)], [X(4 + d * 21), Y(hipY + 1)], [X(4 + d * 23), Y(hipY + 25)]],
      ]
    : person.pose === 'walk'
      ? [
          [[X(-4), Y(hipY)], [X(-4 - d * 6), Y(kneeY)], [X(-4 - d * 13), Y(97)]],
          [[X(4), Y(hipY)], [X(4 + d * 7), Y(kneeY - 1)], [X(4 + d * 10), Y(97)]],
        ]
      : [
          [[X(-4.8), Y(hipY)], [X(-5.2), Y(kneeY)], [X(-5.4), Y(96)]],
          [[X(4.8), Y(hipY)], [X(5.2), Y(kneeY)], [X(5.4), Y(96)]],
        ]
  for (const leg of legs) {
    p.path(tube(leg, legW * u, legW * 0.78 * u), true, { ...ink, fill: look.outfit === 'dress' ? PAPER : PANTS })
    const foot = leg[leg.length - 1]
    p.ellipse(foot[0] + d * 3 * u, foot[1] + 1.2 * u, 5.4 * u, 2.6 * u, { ...ink, fill: '#4a4843' })
  }
  if (detailed && !sit) p.line(X(0), Y(hipY + 1), X(0), Y(hipY + 9), thin)

  // ----- torso
  const torso: Pt[] = [
    [X(-3.5), Y(shY - 1.5)],
    [X(-shW + 1), Y(shY)],
    [X(-shW - 0.6), Y(shY + 4)],
    [X(-hipW + 0.6), Y(hipY - 6)],
    [X(-hipW), Y(hipY + 1)],
    [X(hipW), Y(hipY + 1)],
    [X(hipW - 0.6), Y(hipY - 6)],
    [X(shW + 0.6), Y(shY + 4)],
    [X(shW - 1), Y(shY)],
    [X(3.5), Y(shY - 1.5)],
  ]
  if (look.outfit === 'dress') {
    p.path([[X(-hipW), Y(hipY - 2)], [X(-hipW - 7), Y(kneeY)], [X(hipW + 7), Y(kneeY)], [X(hipW), Y(hipY - 2)]], true, { ...ink, fill: SHIRT })
  }
  p.path(torso, true, { ...ink, fill: look.outfit === 'jacket' ? '#d8d5cc' : SHIRT })
  const c = p.ctx
  if (look.outfit === 'striped' && detailed) {
    c.save()
    c.beginPath()
    torso.forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py)))
    c.closePath()
    c.clip()
    c.fillStyle = '#2a2925'
    for (let yy = shY + 3; yy < hipY + 1; yy += 6) c.fillRect(X(-shW - 2), Y(yy), (shW + 2) * 2 * u, 2.6 * u)
    c.restore()
  } else if (look.outfit === 'jacket' && detailed) {
    p.path([[X(-2.5), Y(shY - 1)], [X(-1.5), Y(hipY)], [X(1.5), Y(hipY)], [X(2.5), Y(shY - 1)]], true, { ...thin, fill: SHIRT })
    p.line(X(-2.5), Y(shY - 1), X(-6), Y(shY + 9), thin)
    p.line(X(2.5), Y(shY - 1), X(6), Y(shY + 9), thin)
    p.hatch(X(-hipW), Y(shY + 10), (hipW - 3) * u, (hipY - shY - 10) * u, Math.max(5, u * 2.4) / p.s, { color: PENCIL, alpha: 0.55 })
  } else if (look.outfit === 'collar' && detailed) {
    p.path([[X(-4), Y(shY - 1.5)], [X(0), Y(shY + 4)], [X(4), Y(shY - 1.5)]], false, thin)
    p.path([[X(-4), Y(shY - 1.5)], [X(-6), Y(shY + 2.5)], [X(-1), Y(shY + 3)]], false, thin)
    p.path([[X(4), Y(shY - 1.5)], [X(6), Y(shY + 2.5)], [X(1), Y(shY + 3)]], false, thin)
    for (let k = 0; k < 3; k++) p.ellipse(X(0), Y(shY + 8 + k * 5), 0.6 * u, 0.6 * u, { ...thin, fill: INK })
  } else if (detailed) {
    p.path([[X(-3.5), Y(shY - 1.5)], [X(0), Y(shY + 2.5)], [X(3.5), Y(shY - 1.5)]], false, thin)
  }
  if (detailed) p.hatch(X(d > 0 ? -shW : hipW - 4), Y(shY + 4), 4 * u, (hipY - shY - 3) * u, Math.max(4, u * 2) / p.s, { color: PENCIL, alpha: 0.45 })

  // ----- arms
  const armW = (kid ? 4.4 : 4.8) * u
  const sleeve = look.outfit === 'jacket' ? '#d8d5cc' : SHIRT
  const arm = (side: number, pts: Pt[], open = false) => {
    p.path(tube(pts, armW, armW * 0.85), true, { ...ink, fill: sleeve })
    const hand = pts[pts.length - 1]
    p.ellipse(hand[0], hand[1] + 1.4 * u, 2.6 * u, 3 * u, { ...ink, fill: PAPER })
    if (open && detailed) for (let f = -1; f <= 1; f++) p.line(hand[0] + f * 1.6 * u, hand[1] - 1 * u, hand[0] + f * 2.6 * u, hand[1] - 5 * u, { ...ink, w: lw * 0.8 })
    void side
  }
  const swing = person.pose === 'walk' ? 5 : 0
  arm(-1, [[X(-shW + 1), Y(shY + 2)], [X(-shW - 2.5 + d * swing), Y(shY + 16)], [X(-shW - 2 + d * swing * 1.6), Y(hipY - 1)]])
  if (person.pose === 'wave') arm(1, [[X(shW - 1), Y(shY + 2)], [X(shW + 9), Y(shY - 6)], [X(shW + 11), Y(shY - 19)]], true)
  else arm(1, [[X(shW - 1), Y(shY + 2)], [X(shW + 2.5 - d * swing), Y(shY + 16)], [X(shW + 2 - d * swing * 1.6), Y(hipY - 1)]])

  // ----- neck & head
  p.path(tube([[X(0), Y(head.cy + head.ry - 1)], [X(0), Y(shY)]], 5 * u, 5.6 * u), true, { ...ink, fill: PAPER, w: lw * 0.9 })
  const hx = X(0)
  const hy = Y(head.cy)
  const rx = head.rx * u
  const ry = head.ry * u
  // hair behind the head
  if (look.hair === 'long') {
    p.path([[hx - rx * 1.0, hy - ry * 0.5], [hx - rx * 1.2, hy + ry * 0.6], [hx - rx * 1.05, hy + ry * 1.55], [hx - rx * 0.55, hy + ry * 1.35], [hx + rx * 0.55, hy + ry * 1.35], [hx + rx * 1.05, hy + ry * 1.55], [hx + rx * 1.2, hy + ry * 0.6], [hx + rx * 1.0, hy - ry * 0.5]], true, { ...ink, fill: '#57544d' })
    if (u > 1.6) for (const k of [-1.05, -0.95, 0.95, 1.05]) p.line(hx + rx * k, hy + ry * 0.3, hx + rx * k * 1.02, hy + ry * 1.3, { color: '#d9d6cf', w: 0.8, passes: 1 })
  }
  if (look.hair === 'ponytail') p.ellipse(hx - d * rx * 1.15, hy + ry * 0.2, rx * 0.45, ry * 0.8, { ...ink, fill: HAIR })
  if (look.hair === 'bun') p.ellipse(hx, hy - ry * 1.1, rx * 0.42, ry * 0.36, { ...ink, fill: HAIR })
  // ear + face
  p.ellipse(hx - d * rx * 0.92, hy + ry * 0.1, rx * 0.2, ry * 0.26, { ...ink, fill: PAPER, w: lw * 0.8 })
  p.ellipse(hx, hy, rx, ry, { ...ink, fill: PAPER })
  if (look.beard && detailed) {
    c.save()
    c.beginPath()
    c.ellipse(hx, hy, rx, ry, 0, 0.1, Math.PI - 0.1)
    c.clip()
    p.hatch(hx - rx, hy + ry * 0.25, rx * 2, ry, Math.max(3, u * 1.1) / p.s, { color: INK, alpha: 0.7 })
    c.restore()
  }
  drawHair(p, look.hair, hx, hy, rx, ry, d, ink)
  drawFace(p, look.expression, hx + d * rx * 0.2, hy, rx, ry, d, lw, u)

  // ----- name tag
  if (person.name && H > 70 && headTarget === undefined) {
    const ty = Math.max(16 * p.s, hy - ry * 2 - 12 * p.s)
    p.text(person.name.toUpperCase(), hx, ty, 11, PENCIL, 700)
  }
}

function drawHair(p: Pen, hair: HairStyle, hx: number, hy: number, rx: number, ry: number, d: number, ink: StrokeOpts) {
  const fillDark = { ...ink, fill: HAIR }
  switch (hair) {
    case 'short':
    case 'ponytail':
    case 'bun':
    case 'long':
      p.path(
        [
          [hx - rx * 1.02, hy + ry * 0.05],
          [hx - rx * 0.95, hy - ry * 0.7],
          [hx - rx * 0.3, hy - ry * 1.08],
          [hx + rx * 0.5, hy - ry * 1.02],
          [hx + rx * 1.02, hy - ry * 0.55],
          [hx + rx * 1.02, hy + ry * 0.05],
          [hx + rx * 0.7, hy - ry * 0.45],
          [hx + d * rx * 0.1, hy - ry * 0.55],
          [hx - rx * 0.6, hy - ry * 0.35],
        ],
        true,
        fillDark,
      )
      break
    case 'curly': {
      for (let i = 0; i <= 11; i++) {
        const t = Math.PI * (1.02 + (i / 11) * 0.96)
        const cx = hx + Math.cos(t) * rx * 1.02
        const cy = hy + Math.sin(t) * ry * 1.0
        p.ellipse(cx, cy, rx * 0.27, ry * 0.24, { ...ink, fill: '#f7f6f2', w: (ink.w ?? 2) * 0.8 })
      }
      p.ellipse(hx - rx * 0.2, hy - ry * 0.6, rx * 0.25, ry * 0.22, { ...ink, w: (ink.w ?? 2) * 0.7 })
      break
    }
    case 'cap':
      p.path([[hx - rx * 1.03, hy - ry * 0.2], [hx - rx * 0.85, hy - ry * 0.9], [hx, hy - ry * 1.15], [hx + rx * 0.85, hy - ry * 0.9], [hx + rx * 1.03, hy - ry * 0.2]], true, { ...ink, fill: '#8c8981' })
      p.path([[hx + d * rx * 0.2, hy - ry * 0.25], [hx + d * rx * 1.7, hy - ry * 0.12], [hx + d * rx * 1.5, hy - ry * 0.32], [hx + d * rx * 0.6, hy - ry * 0.4]], true, { ...ink, fill: '#6e6b64' })
      p.ellipse(hx, hy - ry * 1.15, rx * 0.12, ry * 0.08, { ...ink, fill: INK })
      break
    case 'spiky': {
      const pts: [number, number][] = [[hx - rx * 1.02, hy]]
      for (let i = 0; i <= 8; i++) {
        const t = Math.PI * (1 + i / 8)
        const r = i % 2 ? 1.35 : 0.9
        pts.push([hx + Math.cos(t) * rx * r, hy + Math.sin(t) * ry * r])
      }
      pts.push([hx + rx * 1.02, hy], [hx + rx * 0.5, hy - ry * 0.45], [hx - rx * 0.5, hy - ry * 0.45])
      p.path(pts, true, fillDark)
      break
    }
  }
}

function drawFace(p: Pen, expression: string, fx: number, hy: number, rx: number, ry: number, d: number, lw: number, u: number) {
  const dot = { color: INK, w: lw * 0.8, fill: INK, passes: 1 }
  if (u < 1.1) {
    // tiny figures: just eyes
    p.ctx.fillStyle = INK
    p.ctx.fillRect(fx - rx * 0.35, hy, Math.max(1.5, rx * 0.12), Math.max(1.5, rx * 0.15))
    p.ctx.fillRect(fx + rx * 0.25, hy, Math.max(1.5, rx * 0.12), Math.max(1.5, rx * 0.15))
    return
  }
  const ey = hy - ry * 0.02
  const eye = (ex: number) => p.ellipse(ex, ey, rx * 0.1, ry * 0.15, dot)
  eye(fx - rx * 0.33)
  eye(fx + rx * 0.33)
  const brow = { color: INK, w: lw * 0.7, passes: 1 }
  const lift = expression === 'surprised' ? 0.12 : 0
  p.line(fx - rx * 0.48, ey - ry * (0.3 + lift), fx - rx * 0.18, ey - ry * (0.34 + lift), brow)
  p.line(fx + rx * 0.18, ey - ry * (0.34 + lift), fx + rx * 0.48, ey - ry * (0.3 + lift), brow)
  // nose
  p.path([[fx + d * rx * 0.05, hy + ry * 0.12], [fx + d * rx * 0.22, hy + ry * 0.32], [fx - d * rx * 0.02, hy + ry * 0.36]], false, { color: INK, w: lw * 0.7, passes: 1 })
  // mouth
  const my = hy + ry * 0.58
  const mw = rx * 0.34
  if (expression === 'surprised') p.ellipse(fx, my, rx * 0.12, ry * 0.12, { color: INK, w: lw * 0.8, fill: '#3a3833', passes: 1 })
  else if (expression === 'laugh') p.path([[fx - mw, my - ry * 0.05], [fx + mw, my - ry * 0.05], [fx + mw * 0.6, my + ry * 0.16], [fx - mw * 0.6, my + ry * 0.16]], true, { color: INK, w: lw * 0.8, fill: '#3a3833', passes: 1 })
  else if (expression === 'neutral') p.line(fx - mw * 0.6, my, fx + mw * 0.6, my, { color: INK, w: lw * 0.8, passes: 1 })
  else p.ellipse(fx, my - ry * 0.12, mw, ry * 0.16, { color: INK, w: lw * 0.8, passes: 1 }, 0.25, Math.PI - 0.25)
}

// ---------------------------------------------------------------- export helpers

/** Render a spec to a JPEG blob. Optionally a low-resolution preview. */
export async function sketchToBlob(spec: SketchSpec, preview = false): Promise<{ blob: Blob; width: number; height: number }> {
  const canvas = document.createElement('canvas')
  canvas.width = SKETCH_W
  canvas.height = SKETCH_H
  const ctx = canvas.getContext('2d')!
  renderSketch(ctx, spec)
  if (preview) {
    const small = document.createElement('canvas')
    small.width = SKETCH_W / 4
    small.height = SKETCH_H / 4
    small.getContext('2d')!.drawImage(canvas, 0, 0, small.width, small.height)
    const blob = await toBlob(small, 0.6)
    return { blob, width: small.width, height: small.height }
  }
  const blob = await toBlob(canvas, 0.9)
  return { blob, width: SKETCH_W, height: SKETCH_H }
}

export function toBlob(canvas: HTMLCanvasElement, quality = 0.9): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Falha ao codificar imagem'))), 'image/jpeg', quality),
  )
}

/** Draw an ink figure on top of an arbitrary image (demo fallback for uploaded images). */
export function overlayPerson(ctx: Ctx, w: number, h: number, person: SketchPerson, seed: number) {
  const p = new Pen(ctx, seed, w / 960)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  drawPerson(p, person, w, h, h * 0.62, 0.42, 'aberto')
}

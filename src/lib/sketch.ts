import type { ShotType, SketchPerson, SketchSpec } from './types'

/**
 * Local, deterministic "pencil storyboard" renderer used by the demo provider.
 * It is NOT an AI model: it draws a parametric sketch from a SketchSpec so the
 * full workflow can be demonstrated without API keys. The UI labels it as such.
 */

export const SKETCH_W = 960
export const SKETCH_H = 540

type Ctx = CanvasRenderingContext2D

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

class Pencil {
  rnd: () => number
  constructor(
    public ctx: Ctx,
    seed: number,
  ) {
    this.rnd = mulberry32(seed)
  }
  j(n = 1.6) {
    return (this.rnd() - 0.5) * n
  }
  line(x1: number, y1: number, x2: number, y2: number, w = 1.4, alpha = 0.85, passes = 2) {
    const c = this.ctx
    for (let p = 0; p < passes; p++) {
      c.beginPath()
      c.lineWidth = w * (p === 0 ? 1 : 0.6)
      c.globalAlpha = alpha * (p === 0 ? 1 : 0.5)
      const mx = (x1 + x2) / 2 + this.j(2.2)
      const my = (y1 + y2) / 2 + this.j(2.2)
      c.moveTo(x1 + this.j(), y1 + this.j())
      c.quadraticCurveTo(mx, my, x2 + this.j(), y2 + this.j())
      c.stroke()
    }
    c.globalAlpha = 1
  }
  poly(pts: [number, number][], close = true, w = 1.4, alpha = 0.85) {
    for (let i = 0; i < pts.length - (close ? 0 : 1); i++) {
      const a = pts[i]
      const b = pts[(i + 1) % pts.length]
      this.line(a[0], a[1], b[0], b[1], w, alpha)
    }
  }
  rect(x: number, y: number, w: number, h: number, lw = 1.4, alpha = 0.85) {
    this.poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], true, lw, alpha)
  }
  ellipse(cx: number, cy: number, rx: number, ry: number, w = 1.4, alpha = 0.85) {
    const c = this.ctx
    for (let p = 0; p < 2; p++) {
      c.beginPath()
      c.lineWidth = w * (p === 0 ? 1 : 0.6)
      c.globalAlpha = alpha * (p === 0 ? 1 : 0.45)
      const steps = 28
      for (let i = 0; i <= steps + 1; i++) {
        const t = (i / steps) * Math.PI * 2 + p * 0.3
        const x = cx + Math.cos(t) * (rx + this.j(1.2))
        const y = cy + Math.sin(t) * (ry + this.j(1.2))
        if (i === 0) c.moveTo(x, y)
        else c.lineTo(x, y)
      }
      c.stroke()
    }
    c.globalAlpha = 1
  }
  hatch(x: number, y: number, w: number, h: number, gap = 7, alpha = 0.25, angle = 1) {
    const c = this.ctx
    c.save()
    c.beginPath()
    c.rect(x, y, w, h)
    c.clip()
    for (let i = -h; i < w + h; i += gap) {
      this.line(x + i, y + h, x + i + h * angle, y, 0.8, alpha, 1)
    }
    c.restore()
  }
}

const SHOT_SCALE: Record<ShotType, number> = {
  geral: 0.22,
  aberto: 0.3,
  americano: 0.62,
  medio: 0.78,
  close: 1.55,
  'extreme-close': 2.9,
  detalhe: 0.3,
  pov: 0.3,
  ots: 0.75,
}

const BG_ZOOM: Record<ShotType, number> = {
  geral: 0.9,
  aberto: 1,
  americano: 1.35,
  medio: 1.6,
  close: 2.2,
  'extreme-close': 3,
  detalhe: 1,
  pov: 1,
  ots: 1.5,
}

export function renderSketch(ctx: Ctx, spec: SketchSpec, w = SKETCH_W, h = SKETCH_H) {
  const p = new Pencil(ctx, spec.seed)
  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  // paper
  ctx.fillStyle = '#fbfaf6'
  ctx.fillRect(0, 0, w, h)
  const grain = mulberry32(spec.seed + 7)
  ctx.fillStyle = 'rgba(60,55,45,0.035)'
  for (let i = 0; i < 1400; i++) ctx.fillRect(grain() * w, grain() * h, 1.2, 1.2)
  ctx.strokeStyle = '#2b2a28'

  const horizon = h * 0.6
  const zoom = BG_ZOOM[spec.shot] ?? 1

  // background (scaled around the horizon for tighter shots; lighter = depth of field)
  ctx.save()
  ctx.translate(w / 2, horizon)
  ctx.scale(zoom, zoom)
  ctx.translate(-w / 2, -horizon)
  const bgAlpha = spec.shot === 'close' || spec.shot === 'extreme-close' ? 0.35 : 0.85
  ctx.globalAlpha = bgAlpha
  drawSky(p, spec, w, horizon)
  drawSetting(p, spec, w, h, horizon)
  ctx.restore()
  ctx.globalAlpha = 1

  // props in front
  for (const prop of spec.props) drawProp(p, prop, w, h, horizon, spec)

  // people, sorted so children/back figures draw first
  const scale = SHOT_SCALE[spec.shot] ?? 0.3
  const people = [...spec.people].sort((a, b) => (a.kind === 'child' ? -1 : 0) - (b.kind === 'child' ? -1 : 0))
  for (const person of people) drawPerson(p, person, w, h, horizon, scale, spec.shot)

  if (spec.shot === 'ots') {
    // dark shoulder silhouette in the foreground
    ctx.fillStyle = 'rgba(40,38,35,0.55)'
    ctx.beginPath()
    ctx.ellipse(w * 0.08, h * 1.05, w * 0.22, h * 0.5, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(w * 0.12, h * 0.42, w * 0.08, h * 0.13, 0, 0, Math.PI * 2)
    ctx.fill()
  }

  if (spec.time === 'night') {
    ctx.fillStyle = 'rgba(25,28,40,0.32)'
    ctx.fillRect(0, 0, w, h)
  } else if (spec.time === 'sunset') {
    const g = ctx.createLinearGradient(0, 0, 0, h)
    g.addColorStop(0, 'rgba(230,150,80,0.14)')
    g.addColorStop(1, 'rgba(120,60,40,0.06)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
  }

  if (spec.weather === 'rain') {
    for (let i = 0; i < 260; i++) {
      const x = p.rnd() * w
      const y = p.rnd() * h
      p.line(x, y, x - 6, y + 16, 0.7, 0.35, 1)
    }
  }

  if (spec.shot === 'pov') {
    ctx.globalAlpha = 0.5
    ctx.fillStyle = '#2b2a28'
    const r = Math.max(w, h) * 0.75
    ctx.beginPath()
    ctx.rect(0, 0, w, h)
    ctx.ellipse(w / 2, h / 2, r * 0.62, r * 0.42, 0, 0, Math.PI * 2, true)
    ctx.fill('evenodd')
    ctx.globalAlpha = 1
  }

  // frame border
  ctx.strokeStyle = '#2b2a28'
  p.rect(6, 6, w - 12, h - 12, 2.2, 0.9)
  ctx.restore()
}

function drawSky(p: Pencil, spec: SketchSpec, w: number, horizon: number) {
  const c = p.ctx
  if (spec.setting === 'living' || spec.setting === 'kitchen' || spec.setting === 'office') return
  if (spec.time === 'night') {
    p.hatch(0, 0, w, horizon, 5, 0.35)
    c.fillStyle = '#fbfaf6'
    c.beginPath()
    c.arc(w * 0.82, horizon * 0.25, 22, 0, Math.PI * 2)
    c.fill()
    p.ellipse(w * 0.82, horizon * 0.25, 22, 22, 1.2)
    for (let i = 0; i < 18; i++) {
      const x = p.rnd() * w
      const y = p.rnd() * horizon * 0.7
      c.fillStyle = '#fbfaf6'
      c.fillRect(x, y, 2, 2)
    }
  } else if (spec.time === 'sunset') {
    p.ellipse(w * 0.7, horizon - 10, 46, 46, 1.4)
    for (let i = 0; i < 6; i++) p.line(w * 0.7 - 80 - i * 14, horizon - 30 - i * 14, w * 0.7 - 120 - i * 18, horizon - 30 - i * 14, 0.8, 0.4, 1)
    p.hatch(0, horizon * 0.55, w, horizon * 0.45, 12, 0.18)
  } else {
    p.ellipse(w * 0.14, horizon * 0.22, 26, 26, 1.2, 0.6)
    // clouds
    for (const [cx, cy] of [[w * 0.42, horizon * 0.2], [w * 0.7, horizon * 0.3]] as const) {
      p.ellipse(cx, cy, 40, 13, 1, 0.5)
      p.ellipse(cx + 30, cy - 8, 28, 12, 1, 0.5)
    }
  }
}

function drawSetting(p: Pencil, spec: SketchSpec, w: number, h: number, horizon: number) {
  switch (spec.setting) {
    case 'house': {
      p.line(0, horizon, w, horizon, 1.6)
      const hx = w * 0.3
      const hw = w * 0.4
      const hy = horizon - h * 0.34
      p.rect(hx, hy, hw, h * 0.34, 1.8)
      p.poly([[hx - 20, hy], [hx + hw / 2, hy - h * 0.17], [hx + hw + 20, hy]], false, 1.8)
      p.hatch(hx - 10, hy - h * 0.16, hw + 20, h * 0.16, 9, 0.18)
      p.rect(hx + hw * 0.43, horizon - h * 0.17, hw * 0.14, h * 0.17, 1.5)
      p.rect(hx + hw * 0.1, hy + h * 0.07, hw * 0.2, h * 0.09, 1.3)
      p.line(hx + hw * 0.2, hy + h * 0.07, hx + hw * 0.2, hy + h * 0.16, 1)
      p.rect(hx + hw * 0.7, hy + h * 0.07, hw * 0.2, h * 0.09, 1.3)
      p.line(hx + hw * 0.8, hy + h * 0.07, hx + hw * 0.8, hy + h * 0.16, 1)
      // path
      p.line(hx + hw * 0.43, horizon, w * 0.36, h, 1.2, 0.6)
      p.line(hx + hw * 0.57, horizon, w * 0.64, h, 1.2, 0.6)
      // bushes and tree
      p.ellipse(hx - 10, horizon - 14, 40, 18, 1.2, 0.6)
      p.ellipse(hx + hw + 14, horizon - 12, 36, 16, 1.2, 0.6)
      drawTree(p, w * 0.86, horizon, 1)
      break
    }
    case 'garden': {
      p.line(0, horizon, w, horizon, 1.4)
      for (let x = 10; x < w; x += 34) {
        p.line(x, horizon, x, horizon - 46, 1.1, 0.6)
      }
      p.line(0, horizon - 36, w, horizon - 36, 1.1, 0.6)
      p.line(0, horizon - 16, w, horizon - 16, 1.1, 0.6)
      drawTree(p, w * 0.18, horizon - 10, 1.4)
      for (let i = 0; i < 60; i++) {
        const x = p.rnd() * w
        const y = horizon + 10 + p.rnd() * (h - horizon - 20)
        p.line(x, y, x + 3, y - 8, 0.8, 0.35, 1)
      }
      break
    }
    case 'street': {
      p.line(0, horizon, w, horizon, 1.2, 0.6)
      const vx = w / 2
      p.line(vx - 20, horizon, 0, h, 1.6)
      p.line(vx + 20, horizon, w, h, 1.6)
      for (let i = 0; i < 6; i++) {
        const t = i / 6
        const y = horizon + (h - horizon) * t * t + 10
        p.line(vx - 2, y, vx + 2, y + 14 * (t + 0.3), 2, 0.6, 1)
      }
      for (const side of [-1, 1]) {
        for (let b = 0; b < 3; b++) {
          const bx = side < 0 ? 20 + b * 110 : w - 120 - b * 110
          const bh = 120 + ((b * 53) % 70)
          p.rect(bx, horizon - bh, 90, bh, 1.3, 0.7)
          for (let r = 0; r < 3; r++) p.rect(bx + 14, horizon - bh + 18 + r * 34, 22, 18, 0.9, 0.5)
        }
      }
      break
    }
    case 'living': {
      const floor = h * 0.68
      p.line(0, floor, w, floor, 1.6)
      p.rect(w * 0.56, h * 0.16, w * 0.24, h * 0.3, 1.5)
      p.line(w * 0.68, h * 0.16, w * 0.68, h * 0.46, 1)
      p.line(w * 0.56, h * 0.31, w * 0.8, h * 0.31, 1)
      if (spec.time === 'night') p.hatch(w * 0.56, h * 0.16, w * 0.24, h * 0.3, 5, 0.4)
      // sofa
      p.rect(w * 0.12, floor - h * 0.14, w * 0.34, h * 0.14, 1.6)
      p.rect(w * 0.12, floor - h * 0.24, w * 0.34, h * 0.1, 1.4)
      p.rect(w * 0.09, floor - h * 0.18, w * 0.04, h * 0.18, 1.3)
      p.rect(w * 0.45, floor - h * 0.18, w * 0.04, h * 0.18, 1.3)
      // lamp + frame
      p.line(w * 0.88, floor, w * 0.88, floor - h * 0.34, 1.3)
      p.poly([[w * 0.84, floor - h * 0.34], [w * 0.92, floor - h * 0.34], [w * 0.9, floor - h * 0.42], [w * 0.86, floor - h * 0.42]], true, 1.3)
      p.rect(w * 0.2, h * 0.14, w * 0.16, h * 0.14, 1.2, 0.7)
      p.hatch(0, floor, w, h - floor, 14, 0.12, 0.2)
      break
    }
    case 'kitchen': {
      const floor = h * 0.7
      p.line(0, floor, w, floor, 1.6)
      p.rect(w * 0.05, floor - h * 0.22, w * 0.9, h * 0.22, 1.5)
      for (let i = 0; i < 5; i++) p.rect(w * 0.07 + i * w * 0.175, floor - h * 0.19, w * 0.15, h * 0.17, 1, 0.6)
      for (let i = 0; i < 4; i++) p.rect(w * 0.08 + i * w * 0.22, h * 0.08, w * 0.18, h * 0.18, 1.2, 0.7)
      p.rect(w * 0.4, h * 0.3, w * 0.2, h * 0.14, 1.2)
      break
    }
    case 'office': {
      const floor = h * 0.7
      p.line(0, floor, w, floor, 1.6)
      p.rect(w * 0.1, h * 0.12, w * 0.8, h * 0.36, 1.3, 0.7)
      for (let i = 1; i < 10; i++) p.line(w * 0.1, h * 0.12 + i * h * 0.036, w * 0.9, h * 0.12 + i * h * 0.036, 0.8, 0.35, 1)
      p.rect(w * 0.25, floor - h * 0.04, w * 0.5, h * 0.04, 1.5)
      p.line(w * 0.28, floor, w * 0.28, h * 0.92, 1.3)
      p.line(w * 0.72, floor, w * 0.72, h * 0.92, 1.3)
      break
    }
    case 'car': {
      p.line(0, horizon + 40, w, horizon + 40, 1.2, 0.6)
      drawCar(p, w * 0.5, horizon + 40, 1.6)
      break
    }
    default:
      p.line(0, horizon, w, horizon, 1.2, 0.6)
  }
}

function drawTree(p: Pencil, x: number, ground: number, s: number) {
  p.line(x, ground, x, ground - 70 * s, 2)
  p.line(x + 8 * s, ground, x + 6 * s, ground - 70 * s, 1.4)
  p.ellipse(x + 2, ground - 110 * s, 52 * s, 46 * s, 1.4)
  p.ellipse(x - 22 * s, ground - 92 * s, 30 * s, 24 * s, 1, 0.5)
  p.ellipse(x + 26 * s, ground - 96 * s, 30 * s, 24 * s, 1, 0.5)
}

function drawCar(p: Pencil, cx: number, ground: number, s: number) {
  const w = 220 * s
  const h = 46 * s
  p.rect(cx - w / 2, ground - h - 18, w, h, 1.6)
  p.poly([[cx - w * 0.3, ground - h - 18], [cx - w * 0.18, ground - h - 58 * s], [cx + w * 0.2, ground - h - 58 * s], [cx + w * 0.32, ground - h - 18]], false, 1.6)
  p.ellipse(cx - w * 0.3, ground - 16, 20 * s, 20 * s, 1.6)
  p.ellipse(cx + w * 0.3, ground - 16, 20 * s, 20 * s, 1.6)
  p.line(cx, ground - h - 58 * s, cx, ground - h - 18, 1.1)
}

function drawProp(p: Pencil, prop: string, w: number, h: number, horizon: number, spec: SketchSpec) {
  const floor = spec.setting === 'living' || spec.setting === 'kitchen' || spec.setting === 'office' ? h * 0.7 : horizon
  switch (prop) {
    case 'carro':
      drawCar(p, w * 0.16, horizon + 50, 0.8)
      break
    case 'arvore':
      drawTree(p, w * 0.08, horizon, 1.1)
      break
    case 'cachorro': {
      const x = w * 0.62
      const y = floor + 30
      p.ellipse(x, y - 14, 26, 12, 1.4)
      p.ellipse(x + 28, y - 26, 11, 10, 1.4)
      for (const dx of [-16, -6, 10, 18]) p.line(x + dx, y - 6, x + dx, y + 8, 1.3)
      p.line(x - 26, y - 18, x - 38, y - 30, 1.3)
      break
    }
    case 'caixas': {
      const x = w * 0.7
      p.rect(x, floor - 10, 60, 50, 1.5)
      p.rect(x + 10, floor - 50, 44, 40, 1.4)
      p.line(x, floor + 5, x + 60, floor + 5, 0.9, 0.5)
      break
    }
    case 'placa': {
      const x = w * 0.12
      p.line(x, horizon + 20, x, horizon - 80, 1.8)
      p.rect(x - 40, horizon - 120, 80, 44, 1.5)
      p.ctx.save()
      p.ctx.fillStyle = '#2b2a28'
      p.ctx.font = '600 13px Inter, sans-serif'
      p.ctx.textAlign = 'center'
      p.ctx.fillText('VENDIDO', x, horizon - 93)
      p.ctx.restore()
      break
    }
    case 'chaves': {
      const x = w * 0.5
      const y = h * 0.55
      p.ellipse(x, y, 26, 26, 2)
      p.line(x + 26, y, x + 120, y, 2.4)
      p.line(x + 90, y, x + 90, y + 18, 2)
      p.line(x + 108, y, x + 108, y + 14, 2)
      break
    }
    case 'luminaria':
      p.line(w * 0.92, floor, w * 0.92, floor - 150, 1.3)
      p.ellipse(w * 0.92, floor - 160, 22, 14, 1.3)
      break
    case 'balao':
      p.ellipse(w * 0.78, h * 0.25, 22, 28, 1.4)
      p.line(w * 0.78, h * 0.25 + 28, w * 0.76, h * 0.55, 0.9)
      break
  }
}

function drawPerson(p: Pencil, person: SketchPerson, w: number, h: number, horizon: number, scale: number, shot: ShotType) {
  const kid = person.kind === 'child' ? 0.66 : 1
  const H = h * scale * kid * 1.1 // full body height in px
  const x = person.x * w
  const groundY = shot === 'close' || shot === 'extreme-close' ? h + H * 0.55 : shot === 'medio' || shot === 'ots' ? h + H * 0.28 : shot === 'americano' ? h + H * 0.12 : horizon + h * 0.18 + (person.kind === 'child' ? 6 : 0)
  const headR = H * 0.075
  const headY = groundY - H + headR
  const neckY = headY + headR
  const hipY = groundY - H * 0.47
  const shoulderW = H * 0.13
  const c = p.ctx
  // fill to hide background lines behind the figure
  c.save()
  c.fillStyle = '#fbfaf6'
  c.globalAlpha = 0.92
  c.beginPath()
  c.ellipse(x, headY, headR, headR * 1.15, 0, 0, Math.PI * 2)
  c.fill()
  c.beginPath()
  c.moveTo(x - shoulderW, neckY + H * 0.03)
  c.lineTo(x + shoulderW, neckY + H * 0.03)
  c.lineTo(x + shoulderW * 0.8, hipY)
  c.lineTo(x - shoulderW * 0.8, hipY)
  c.closePath()
  c.fill()
  c.restore()

  const lw = Math.max(1.3, H / 160)
  p.ellipse(x, headY, headR, headR * 1.15, lw)
  // hair hint + face direction
  const dir = person.facing === 'left' ? -1 : 1
  p.line(x - headR * 0.9, headY - headR * 0.4, x + headR * 0.9, headY - headR * 0.6, lw * 0.8, 0.6)
  if (scale > 0.6) {
    p.line(x + dir * headR * 0.35, headY - headR * 0.1, x + dir * headR * 0.42, headY - headR * 0.05, lw, 0.9, 1)
    p.line(x + dir * headR * 0.15, headY + headR * 0.45, x + dir * headR * 0.5, headY + headR * 0.42, lw * 0.8, 0.7, 1)
  }
  // torso
  p.poly(
    [
      [x - shoulderW, neckY + H * 0.03],
      [x + shoulderW, neckY + H * 0.03],
      [x + shoulderW * 0.8, hipY],
      [x - shoulderW * 0.8, hipY],
    ],
    true,
    lw,
  )
  p.hatch(x - shoulderW, neckY + H * 0.03, shoulderW * 2, hipY - neckY, Math.max(5, H / 40), 0.18)
  // arms
  const armY = neckY + H * 0.05
  if (person.pose === 'wave') {
    p.line(x + shoulderW, armY, x + shoulderW * 1.6, armY - H * 0.12, lw)
    p.line(x + shoulderW * 1.6, armY - H * 0.12, x + shoulderW * 1.8, armY - H * 0.28, lw)
  } else {
    p.line(x + shoulderW, armY, x + shoulderW * 1.3, hipY + H * 0.02, lw)
  }
  p.line(x - shoulderW, armY, x - shoulderW * 1.3, hipY + H * 0.02, lw)
  // legs
  if (person.pose === 'sit') {
    p.line(x - shoulderW * 0.5, hipY, x + dir * H * 0.22, hipY + H * 0.02, lw)
    p.line(x + dir * H * 0.22, hipY + H * 0.02, x + dir * H * 0.22, groundY, lw)
  } else if (person.pose === 'walk') {
    p.line(x - shoulderW * 0.4, hipY, x - H * 0.14, groundY, lw)
    p.line(x + shoulderW * 0.4, hipY, x + H * 0.12, groundY, lw)
  } else {
    p.line(x - shoulderW * 0.45, hipY, x - shoulderW * 0.55, groundY, lw)
    p.line(x + shoulderW * 0.45, hipY, x + shoulderW * 0.55, groundY, lw)
  }
  // label
  if (person.name) {
    c.save()
    c.fillStyle = '#4b4a46'
    const fs = Math.max(11, Math.min(18, H * 0.06))
    c.font = `600 ${fs}px Inter, sans-serif`
    c.textAlign = 'center'
    const ly = Math.max(fs + 12, headY - headR * 1.5)
    c.fillText(person.name.toUpperCase(), x, ly)
    c.restore()
  }
}

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

/** Draw a pencil figure on top of an arbitrary image (demo fallback for uploaded images). */
export function overlayPerson(ctx: Ctx, w: number, h: number, person: SketchPerson, seed: number) {
  const p = new Pencil(ctx, seed)
  ctx.strokeStyle = '#2b2a28'
  ctx.lineCap = 'round'
  drawPerson(p, person, w, h, h * 0.6, 0.3 * (w / SKETCH_W), 'aberto')
}

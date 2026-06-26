import { useEffect, useRef } from 'react'

// ── Canvas & world ────────────────────────────────────────────────────────────
const W = 800, H = 450
const GY = H - 72      // ground top y
const LW = 5000        // level width

// ── Level data ────────────────────────────────────────────────────────────────
const PLATS = [
  [260,350,110,16],[460,290,110,16],[650,230,110,16],
  [870,290,110,16],[1070,355,120,16],[1320,270,110,16],
  [1550,210,100,16],[1770,290,120,16],[2010,370,110,16],
  [2260,250,130,16],[2530,300,110,16],[2770,220,110,16],
  [3010,330,120,16],[3280,260,110,16],[3560,195,120,16],
  [3840,300,110,16],[4110,260,130,16],[4410,330,120,16],
]

function makeRings() {
  const r = []
  let id = 0
  for (let x = 150; x < LW - 300; x += 70 + (id % 3) * 20) {
    r.push({ x, y: GY - 36 - (id % 3) * 44, c: false, id: id++ })
  }
  PLATS.forEach(([px, py, pw]) => {
    for (let i = 0; i < 4; i++)
      r.push({ x: px + 12 + i * 24, y: py - 34, c: false, id: id++ })
  })
  return r
}

function makeEnemies() {
  return [
    [560,[400,720]],[1000,[820,1220]],[1460,[1260,1710]],
    [2060,[1820,2260]],[2660,[2420,2910]],[3260,[3020,3510]],
    [3960,[3720,4220]],[4510,[4320,4720]],
  ].map(([x, px], i) => ({
    x, y: GY - 34, vx: i % 2 === 0 ? 1.9 : -1.9,
    px, w: 34, h: 34, dead: false, anim: 0,
  }))
}

function mkState() {
  return {
    p: { x:80, y:GY-38, vx:0, vy:0, w:36, h:36,
         ground:false, face:1, rings:0, score:0, lives:3,
         inv:0, anim:0, dead:false, dt:0 },
    cam: 0,
    rings: makeRings(),
    enemies: makeEnemies(),
    sparks: [],
    tick: 0,
    over: false,
    won: false,
  }
}

// ── Input (module-level so it never gets lost) ────────────────────────────────
const K = {}
window.addEventListener('keydown', e => { K[e.code] = true;  e.preventDefault() })
window.addEventListener('keyup',   e => { K[e.code] = false })

// ── Helpers ───────────────────────────────────────────────────────────────────
function aabb(ax,ay,aw,ah, bx,by,bw,bh) {
  return ax < bx+bw && ax+aw > bx && ay < by+bh && ay+ah > by
}

function emit(arr, x, y, color, n = 7) {
  for (let i = 0; i < n; i++) {
    const a = (Math.PI * 2 / n) * i, sp = 2 + Math.random() * 3
    arr.push({ x, y, vx: Math.cos(a)*sp, vy: Math.sin(a)*sp - 1.5, life: 1, color })
  }
}

// ── Update ────────────────────────────────────────────────────────────────────
function update(s) {
  const { p } = s
  s.tick++
  if (s.over || s.won) return

  // Dead bounce-out animation
  if (p.dead) {
    p.dt++
    p.vy += 0.6
    p.y  += p.vy
    if (p.dt > 110) {
      p.lives--
      if (p.lives <= 0) { s.over = true; return }
      Object.assign(p, { x:80, y:GY-38, vx:0, vy:0, dead:false, dt:0, ground:false, inv:80, rings:0 })
      s.enemies = makeEnemies()
      s.rings   = makeRings()
      s.cam     = 0
    }
    return
  }

  const L = K.ArrowLeft  || K.KeyA
  const R = K.ArrowRight || K.KeyD
  const J = K.ArrowUp    || K.KeyW || K.Space

  if (R) { p.vx += 0.85; p.face =  1 }
  if (L) { p.vx -= 0.85; p.face = -1 }
  if (!L && !R) p.vx *= 0.77
  p.vx = Math.max(-12, Math.min(12, p.vx))

  if (J && p.ground) { p.vy = -13.5; p.ground = false }

  p.vy += 0.55
  p.vy  = Math.min(p.vy, 18)
  p.x  += p.vx
  p.y  += p.vy
  p.x   = Math.max(0, Math.min(LW - p.w, p.x))
  p.anim += Math.abs(p.vx) * 0.05

  // Ground collision
  p.ground = false
  if (p.y + p.h >= GY) { p.y = GY - p.h; p.vy = 0; p.ground = true }

  // Platform collision (top only)
  for (const [px, py, pw] of PLATS) {
    if (p.vy >= 0
        && p.y + p.h - p.vy <= py + 2
        && p.x + p.w > px && p.x < px + pw
        && p.y + p.h >= py && p.y + p.h <= py + 20) {
      p.y = py - p.h; p.vy = 0; p.ground = true
    }
  }

  // Rings
  for (const r of s.rings) {
    if (!r.c && aabb(p.x,p.y,p.w,p.h, r.x-9,r.y-9,18,18)) {
      r.c = true; p.rings++; p.score += 10
      emit(s.sparks, r.x, r.y, '#FFD700', 5)
    }
  }

  // Enemies
  if (p.inv <= 0) {
    for (const e of s.enemies) {
      if (e.dead) continue
      if (aabb(p.x,p.y,p.w,p.h, e.x,e.y,e.w,e.h)) {
        if (p.vy > 0 && p.y + p.h < e.y + e.h / 2 + 8) {
          // Stomp
          e.dead = true; p.vy = -9; p.score += 100
          emit(s.sparks, e.x + 17, e.y + 17, '#FF6622', 9)
        } else if (p.rings > 0) {
          // Hit — scatter rings
          const n = Math.min(p.rings, 12)
          for (let i = 0; i < n; i++)
            s.sparks.push({
              x: p.x+18, y: p.y+18,
              vx: (Math.random()-.5)*7, vy: -Math.random()*5-2,
              life: 1.4, color: '#FFD700', ring: true,
            })
          p.rings = Math.max(0, p.rings - n)
          p.inv = 90
        } else {
          p.dead = true; p.vy = -12; p.vx = 0
        }
      }
    }
  }
  if (p.inv > 0) p.inv--

  // Pit death
  if (p.y > H + 100) { p.dead = true; p.dt = 80 }

  // Level complete
  if (p.x > LW - 260) { s.won = true; p.score += p.rings * 50 }

  // Enemies patrol
  for (const e of s.enemies) {
    if (e.dead) continue
    e.x   += e.vx; e.anim += 0.15
    if (e.x < e.px[0])          { e.x = e.px[0];        e.vx *= -1 }
    if (e.x + e.w > e.px[1])    { e.x = e.px[1] - e.w;  e.vx *= -1 }
  }

  // Sparks
  for (let i = s.sparks.length - 1; i >= 0; i--) {
    const pt = s.sparks[i]
    pt.x += pt.vx; pt.y += pt.vy
    pt.vy += pt.ring ? 0.28 : 0.1
    pt.life -= 0.027
    if (pt.life <= 0) s.sparks.splice(i, 1)
  }

  // Camera
  const tx = p.x - W / 3
  s.cam += (tx - s.cam) * 0.12
  s.cam  = Math.max(0, Math.min(LW - W, s.cam))
}

// ── Draw ──────────────────────────────────────────────────────────────────────
function draw(ctx, s) {
  const { p, cam, rings, enemies, sparks, tick: t } = s

  // Sky gradient
  const sky = ctx.createLinearGradient(0, 0, 0, H)
  sky.addColorStop(0, '#1A6FA8')
  sky.addColorStop(1, '#87CEEB')
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H)

  // Clouds
  ctx.fillStyle = 'rgba(255,255,255,0.82)'
  ;[[70,55,90],[280,35,115],[530,58,92],[770,38,108],[1030,55,88]].forEach(([cx,cy,r]) => {
    const ox = ((cx - cam * 0.22) % (W + 250) + W + 250) % (W + 250) - 80
    ctx.beginPath()
    ctx.arc(ox,      cy,      r*0.34, 0, Math.PI*2)
    ctx.arc(ox+r*.28,cy-r*.1, r*0.27, 0, Math.PI*2)
    ctx.arc(ox+r*.52,cy,      r*0.32, 0, Math.PI*2)
    ctx.fill()
  })

  // Parallax hills — far
  ctx.fillStyle = '#5DA832'
  hillRow(ctx, cam * 0.32, H - 148, 310, 108)
  // Parallax hills — near
  ctx.fillStyle = '#3E7B1E'
  hillRow(ctx, cam * 0.58, H - 108, 220, 72)

  ctx.save()
  ctx.translate(-cam, 0)

  // Ground
  ctx.fillStyle = '#4CAF50'; ctx.fillRect(0, GY, LW, 18)
  ctx.fillStyle = '#7A4F2D'; ctx.fillRect(0, GY + 18, LW, H - GY)
  ctx.fillStyle = 'rgba(0,0,0,0.1)'
  for (let x = 0; x < LW; x += 32)
    for (let y = GY + 18; y < H; y += 32)
      if (((x / 32 + y / 32)) % 2 === 0) ctx.fillRect(x, y, 32, 32)

  // Platforms
  for (const [px, py, pw, ph] of PLATS) {
    ctx.fillStyle = '#4CAF50'; ctx.fillRect(px, py, pw, ph)
    ctx.fillStyle = '#388E3C'; ctx.fillRect(px, py + ph/2, pw, ph/2)
    ctx.fillStyle = '#7A4F2D'; ctx.fillRect(px, py + 6, pw, ph - 6)
    ctx.fillStyle = 'rgba(0,0,0,0.1)'
    for (let tx = px; tx < px + pw; tx += 16)
      if (((tx/16) % 2 === 0)) ctx.fillRect(tx, py + 6, 8, ph - 6)
  }

  // Goal post
  const gx = LW - 220
  ctx.strokeStyle = '#FFF'; ctx.lineWidth = 5
  ctx.beginPath(); ctx.moveTo(gx, GY); ctx.lineTo(gx, GY - 115); ctx.stroke()
  ctx.save()
  ctx.translate(gx, GY - 126)
  ctx.rotate(t * 0.06)
  drawStar(ctx, 0, 0, 22, 11, 5, '#FFD700', '#FF8800')
  ctx.restore()

  // Rings
  for (const r of rings) {
    if (r.c) continue
    const bob = Math.sin(t * 0.08 + r.id * 0.48) * 3
    const sx  = Math.abs(Math.cos(t * 0.1 + r.id * 0.42)) * 0.78 + 0.22
    ctx.save()
    ctx.translate(r.x, r.y + bob)
    ctx.scale(sx, 1)
    ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 3.5
    ctx.shadowColor = '#FFEE58'; ctx.shadowBlur = 6
    ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.stroke()
    ctx.shadowBlur = 0
    ctx.restore()
  }

  // Enemies
  for (const e of enemies) { if (!e.dead) drawEnemy(ctx, e, t) }

  // Sparks / scattered rings
  for (const pt of sparks) {
    ctx.globalAlpha = Math.min(1, pt.life)
    ctx.fillStyle   = pt.color
    ctx.beginPath()
    ctx.arc(pt.x, pt.y, pt.ring ? 5 : 3.5, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1

  // Player (flicker when invincible)
  const showP = !p.dead || (p.inv > 0 && p.inv % 6 < 3)
  if (showP) drawPlayer(ctx, p, t)

  ctx.restore()

  // ── HUD ──
  ctx.fillStyle = 'rgba(0,0,0,0.48)'; ctx.fillRect(10, 10, 172, 88)
  ctx.font = 'bold 13px monospace'
  ctx.fillStyle = '#FFD700'; ctx.fillText(`◎  ${p.rings}`, 20, 32)
  ctx.fillStyle = '#FFF'
  ctx.fillText(`SCORE  ${p.score}`,              20, 50)
  ctx.fillText(`LIVES  ${'♥'.repeat(Math.max(0, p.lives))}`, 20, 68)
  ctx.fillText(`TIME   ${Math.floor(t / 60)}s`,  20, 86)

  if (t < 280) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(W/2 - 165, H - 44, 330, 30)
    ctx.fillStyle = '#EEE'; ctx.font = '12px monospace'; ctx.textAlign = 'center'
    ctx.fillText('← → Mover  |  ↑ / Space Pular  |  Coletar anéis!', W/2, H - 24)
    ctx.textAlign = 'left'
  }

  // Win
  if (s.won) {
    ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(0, 0, W, H)
    ctx.textAlign = 'center'
    ctx.fillStyle = '#FFD700'; ctx.font = 'bold 46px monospace'; ctx.fillText('FASE COMPLETA!', W/2, H/2 - 36)
    ctx.fillStyle = '#FFF';   ctx.font = '22px monospace';       ctx.fillText(`Score: ${p.score}`, W/2, H/2 + 10)
    ctx.fillStyle = '#AAA';   ctx.font = '15px monospace';       ctx.fillText('Pressione R para jogar de novo', W/2, H/2 + 50)
    ctx.textAlign = 'left'
  }

  // Game Over
  if (s.over) {
    ctx.fillStyle = 'rgba(0,0,0,0.72)'; ctx.fillRect(0, 0, W, H)
    ctx.textAlign = 'center'
    ctx.fillStyle = '#F44336'; ctx.font = 'bold 50px monospace'; ctx.fillText('GAME OVER', W/2, H/2 - 18)
    ctx.fillStyle = '#FFF';   ctx.font = '16px monospace';       ctx.fillText('Pressione R para reiniciar', W/2, H/2 + 30)
    ctx.textAlign = 'left'
  }
}

// ── Scene helpers ─────────────────────────────────────────────────────────────
function hillRow(ctx, camX, baseY, hillW, hillH) {
  const start = Math.floor(camX / hillW) - 1
  for (let i = start; i <= start + Math.ceil(W / hillW) + 2; i++) {
    const x = i * hillW - camX
    ctx.beginPath()
    ctx.ellipse(x + hillW / 2, baseY, hillW * 0.68, hillH, 0, Math.PI, 0)
    ctx.fill()
  }
}

function drawStar(ctx, x, y, r1, r2, pts, c1, c2) {
  ctx.fillStyle = c1; ctx.strokeStyle = c2; ctx.lineWidth = 2
  ctx.beginPath()
  for (let i = 0; i < pts * 2; i++) {
    const r = i % 2 ? r2 : r1
    const a = (Math.PI / pts) * i - Math.PI / 2
    if (!i) ctx.moveTo(x + r * Math.cos(a), y + r * Math.sin(a))
    else    ctx.lineTo(x + r * Math.cos(a), y + r * Math.sin(a))
  }
  ctx.closePath(); ctx.fill(); ctx.stroke()
}

function drawEnemy(ctx, e, t) {
  const cx = e.x + 17, cy = e.y + 17, d = e.vx > 0 ? 1 : -1
  ctx.fillStyle = '#D32F2F'
  ctx.beginPath(); ctx.ellipse(cx, cy, 17, 15, 0, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#B71C1C'
  ctx.beginPath(); ctx.ellipse(cx, cy, 9, 8, 0, 0, Math.PI * 2); ctx.fill()
  // Parafusos
  ctx.fillStyle = '#888'
  ;[[-9,-8],[9,-8],[-9,8],[9,8]].forEach(([ox,oy]) => {
    ctx.beginPath(); ctx.arc(cx+ox, cy+oy, 3, 0, Math.PI*2); ctx.fill()
  })
  // Olho
  ctx.fillStyle = '#FFF'; ctx.beginPath(); ctx.arc(cx + d*6, cy-4, 5.5, 0, Math.PI*2); ctx.fill()
  ctx.fillStyle = '#F00'; ctx.beginPath(); ctx.arc(cx + d*7, cy-4, 3, 0, Math.PI*2); ctx.fill()
  // Pernas
  ctx.strokeStyle = '#D32F2F'; ctx.lineWidth = 3
  const la = Math.sin(e.anim) * 0.55
  ;[-1, 1].forEach(s => {
    ctx.beginPath()
    ctx.moveTo(cx + s*8, cy + 12)
    ctx.lineTo(cx + s*8 + Math.cos(la * s) * 9, cy + 22)
    ctx.stroke()
  })
}

function drawPlayer(ctx, p, t) {
  const cx = p.x + 18, cy = p.y + 18, d = p.face
  const airborne = !p.ground

  if (airborne) {
    // Bola giratória
    ctx.fillStyle = '#1565C0'
    ctx.beginPath(); ctx.arc(cx, cy, 18, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#42A5F5'
    ctx.beginPath(); ctx.arc(cx - 5, cy - 6, 7, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 2.5
    for (let i = 0; i < 4; i++) {
      const a = p.anim + (Math.PI / 2) * i
      ctx.beginPath(); ctx.arc(cx, cy, 14, a, a + 0.7); ctx.stroke()
    }
    return
  }

  const spd = Math.abs(p.vx)
  const frame = Math.floor(p.anim * 2) % 2

  // Sapatos
  ctx.fillStyle = '#C62828'
  ;[-1, 1].forEach((s, i) => {
    const lo = spd > 0.5 ? (i === 0 ? (frame ? 6 : -4) : (!frame ? 6 : -4)) : 0
    ctx.beginPath()
    ctx.ellipse(cx + s * 7 * d, cy + 18 + lo, 8, 5.5, 0.15 * d, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#FFEB3B'
    ctx.fillRect(cx + s*7*d - 8, cy + 15 + lo, 16, 3)
    ctx.fillStyle = '#C62828'
  })

  // Corpo
  ctx.fillStyle = '#1565C0'
  ctx.beginPath(); ctx.ellipse(cx, cy + 2, 14, 15, 0, 0, Math.PI * 2); ctx.fill()
  // Barriga
  ctx.fillStyle = '#EFEBE9'
  ctx.beginPath(); ctx.ellipse(cx + d*3, cy + 7, 9, 9, d*0.2, 0, Math.PI * 2); ctx.fill()

  // Cabeça
  ctx.fillStyle = '#1565C0'
  ctx.beginPath(); ctx.arc(cx + d*4, cy - 14, 13, 0, Math.PI * 2); ctx.fill()
  // Espinhos
  for (let i = 0; i < 3; i++) {
    const a = Math.PI + d * (0.22 + i * 0.38), r = 13 + i * 3.8
    ctx.beginPath()
    ctx.moveTo(cx + d*4 + Math.cos(a - 0.26)*11, cy - 14 + Math.sin(a - 0.26)*11)
    ctx.lineTo(cx + d*4 + Math.cos(a)*r,         cy - 14 + Math.sin(a)*r)
    ctx.lineTo(cx + d*4 + Math.cos(a + 0.26)*11, cy - 14 + Math.sin(a + 0.26)*11)
    ctx.fill()
  }
  // Focinho
  ctx.fillStyle = '#1976D2'
  ctx.beginPath(); ctx.arc(cx + d*11, cy - 11, 6, 0, Math.PI * 2); ctx.fill()
  // Olho
  ctx.fillStyle = '#FFF'
  ctx.beginPath(); ctx.arc(cx + d*10, cy - 15, 6.5, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#0D47A1'
  ctx.beginPath(); ctx.arc(cx + d*11, cy - 15, 3.8, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#FFF'
  ctx.beginPath(); ctx.arc(cx + d*12.5, cy - 16.5, 1.3, 0, Math.PI * 2); ctx.fill()
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const ref = useRef(null)

  useEffect(() => {
    const canvas = ref.current
    const ctx    = canvas.getContext('2d')
    let state    = mkState()
    let raf

    function resize() {
      const scale = Math.min(window.innerWidth / W, window.innerHeight / H)
      canvas.style.width  = W * scale + 'px'
      canvas.style.height = H * scale + 'px'
    }
    resize()
    window.addEventListener('resize', resize)

    function loop() {
      update(state)
      draw(ctx, state)
      if ((state.over || state.won) && K.KeyR) state = mkState()
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={ref}
      width={W}
      height={H}
      style={{ display: 'block', background: '#000', imageRendering: 'pixelated' }}
    />
  )
}

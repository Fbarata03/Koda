import { useEffect, useRef } from 'react'

const W = 800, H = 450

// ── Themes (1 per 10 levels) ─────────────────────────────────────────────────
const THEMES = [
  { name:'Green Hill Zone',   sky:['#1565C0','#64B5F6'], g:'#43A047', gl:'#2E7D32', dirt:'#6D4C41', ph:['#43A047','#2E7D32','#5D4037'], hills:['#4CAF50','#388E3C'], ac:'#FFD700' },
  { name:'Chemical Plant',    sky:['#0D1B2A','#1565C0'], g:'#1976D2', gl:'#1565C0', dirt:'#0D47A1', ph:['#42A5F5','#1E88E5','#0D47A1'], hills:['#1565C0','#0D47A1'], ac:'#00E5FF' },
  { name:'Marble Zone',       sky:['#4A0E2B','#9C27B0'], g:'#E64A19', gl:'#BF360C', dirt:'#6D1F00', ph:['#FF7043','#E64A19','#BF360C'], hills:['#7B1FA2','#4A148C'], ac:'#FF6D00' },
  { name:'Starlight City',    sky:['#000011','#0D1B4A'], g:'#37474F', gl:'#263238', dirt:'#1A252A', ph:['#546E7A','#37474F','#263238'], hills:['#0D47A1','#000D33'], ac:'#FFD700' },
  { name:'Ice Cap Zone',      sky:['#B3E5FC','#E1F5FE'], g:'#E3F2FD', gl:'#B3D4F5', dirt:'#90CAF9', ph:['#ECEFF1','#CFD8DC','#B0BEC5'], hills:['#B3E5FC','#81D4FA'], ac:'#00BCD4' },
]

// ── Level generator ───────────────────────────────────────────────────────────
function genLevel(num) {
  const d    = (num - 1) / 49
  const theme = THEMES[Math.floor((num - 1) / 10)]
  const LW   = 2800 + num * 70
  const GY   = H - 72
  const seed  = num * 7919

  const rng = (n => () => { n = (n * 9301 + 49297) % 233280; return n / 233280 })(seed)

  // Platforms — guaranteed reachable gaps
  const plats = []
  let x = 320
  while (x < LW - 350) {
    const w = 75 + rng() * 80 - d * 20
    const y = GY - 70 - rng() * (120 + d * 100)
    plats.push([Math.round(x), Math.round(y), Math.round(Math.max(60, w)), 16])
    x += Math.max(60, w) + 90 + rng() * 80
  }

  // Rings
  const rings = []
  let rid = 0
  for (let rx = 150; rx < LW - 300; rx += 60 + (rid % 4) * 12) {
    rings.push({ x: rx, y: GY - 36 - (rid % 3) * 44, c: false, id: rid++ })
  }
  plats.forEach(([px, py, pw]) => {
    const n = 3 + Math.floor(d * 2)
    for (let i = 0; i < n; i++)
      rings.push({ x: px + 10 + i * (pw / n), y: py - 34, c: false, id: rid++ })
  })

  // Springs (every 10 levels add more)
  const springs = []
  const ns = 1 + Math.floor(d * 4)
  for (let i = 0; i < ns; i++)
    springs.push({ x: 350 + rng() * (LW - 500), y: GY - 24, w: 26, h: 26, t: 0 })

  // Enemies
  const enemies = []
  const ne = Math.floor(3 + d * 14)
  for (let i = 0; i < ne; i++) {
    const ex = 500 + rng() * (LW - 700)
    const spd = 1.3 + d * 2.2 + rng() * 0.8
    const range = 120 + rng() * 180
    enemies.push({
      x: ex, y: GY - 34, vx: rng() < .5 ? spd : -spd,
      px: [ex - range/2, ex + range/2],
      w: 34, h: 34, dead: false, anim: 0, vy: 0,
      type: rng() < d * .7 ? 'jumper' : 'walker', jt: 0,
    })
  }

  return { num, theme, LW, GY, plats, rings, enemies, springs }
}

// ── State ─────────────────────────────────────────────────────────────────────
function mkState(num = 1, lives = 3, score = 0) {
  const level = genLevel(num)
  return {
    level, num,
    p: {
      x: 80, y: level.GY - 40, vx: 0, vy: 0, w: 36, h: 36,
      ground: false, face: 1, rings: 0, score, lives,
      inv: 0, anim: 0, dead: false, dt: 0, charge: 0, charging: false,
      spawn: { x: 80, y: level.GY - 40 },
    },
    cam: 0, sparks: [], shake: 0, tick: 0,
    phase: 'game',  // game | clear | over
    ct: 0,
  }
}

// ── Input ─────────────────────────────────────────────────────────────────────
const K = {}
window.addEventListener('keydown', e => { K[e.code] = true;  e.preventDefault() }, { passive: false })
window.addEventListener('keyup',   e => { K[e.code] = false })

// ── Helpers ───────────────────────────────────────────────────────────────────
const aabb = (ax,ay,aw,ah,bx,by,bw,bh) =>
  ax < bx+bw && ax+aw > bx && ay < by+bh && ay+ah > by

function emit(arr, x, y, color, n = 8, sp = 3) {
  for (let i = 0; i < n; i++) {
    const a = (Math.PI*2/n)*i, s = sp*.8 + Math.random()*sp*.5
    arr.push({ x, y, vx: Math.cos(a)*s, vy: Math.sin(a)*s-1.5,
               life: 1, color, sz: 2.5 + Math.random()*3 })
  }
}

// ── Update ────────────────────────────────────────────────────────────────────
function update(s) {
  const p = s.p
  const { GY, LW, plats, rings, enemies, springs } = s.level
  s.tick++
  if (s.shake > 0) s.shake *= 0.78

  // ── Phase: clear ──
  if (s.phase === 'clear') {
    s.ct++
    if (s.ct > 150 && (K.Space || K.ArrowRight || K.KeyD)) {
      if (s.num < 50) Object.assign(s, mkState(s.num + 1, p.lives, p.score))
      else { s.phase = 'credits' }
    }
    return
  }
  if (s.phase === 'over') { if (K.KeyR || K.Space) Object.assign(s, mkState(1)); return }

  // ── Dead arc ──
  if (p.dead) {
    p.dt++; p.vy += 0.6; p.y += p.vy
    if (p.dt > 110) {
      p.lives--
      if (p.lives <= 0) { s.phase = 'over'; s.shake = 20; return }
      p.x = p.spawn.x; p.y = p.spawn.y
      p.vx = 0; p.vy = 0; p.dead = false; p.dt = 0; p.ground = false; p.inv = 100; p.rings = 0
      for (const r of rings) r.c = false
      s.cam = Math.max(0, p.x - W/3)
    }
    return
  }

  const L = K.ArrowLeft  || K.KeyA
  const R = K.ArrowRight || K.KeyD
  const J = K.ArrowUp    || K.KeyW || K.Space
  const D = K.ArrowDown  || K.KeyS

  // Spindash charge
  if (D && p.ground) {
    p.charging = true
    p.charge   = Math.min(p.charge + 0.35, 13)
  } else if (p.charging) {
    p.vx = p.face * p.charge
    p.charging = false; p.charge = 0
    emit(s.sparks, p.x+18, p.y+30, '#42A5F5', 6, 3)
  }

  if (!p.charging) {
    if (R) { p.vx += 0.9; p.face =  1 }
    if (L) { p.vx -= 0.9; p.face = -1 }
    if (!L && !R) p.vx *= p.ground ? 0.76 : 0.91
  }
  p.vx = Math.max(-14, Math.min(14, p.vx))

  if (J && p.ground && !p.charging) { p.vy = -14; p.ground = false }

  p.vy = Math.min(p.vy + 0.58, 20)
  p.x += p.vx; p.y += p.vy
  p.x  = Math.max(0, Math.min(LW - p.w, p.x))
  p.anim += Math.abs(p.vx) * 0.05

  // Ground
  p.ground = false
  if (p.y + p.h >= GY) { p.y = GY - p.h; p.vy = 0; p.ground = true }

  // Platforms
  for (const [px, py, pw] of plats) {
    if (p.vy >= 0 && p.y+p.h-p.vy <= py+2
        && p.x+p.w > px && p.x < px+pw
        && p.y+p.h >= py && p.y+p.h <= py+22) {
      p.y = py - p.h; p.vy = 0; p.ground = true
    }
  }

  // Springs
  for (const sp of springs) {
    sp.t = Math.max(0, sp.t - 1)
    if (p.vy >= 0 && aabb(p.x,p.y,p.w,p.h, sp.x,sp.y,sp.w,sp.h)) {
      p.vy = -21; sp.t = 18; s.shake = 5
      emit(s.sparks, sp.x+13, sp.y, '#FFEB3B', 7, 3.5)
    }
  }

  // Rings
  for (const r of rings) {
    if (!r.c && aabb(p.x,p.y,p.w,p.h, r.x-9,r.y-9,18,18)) {
      r.c = true; p.rings++; p.score += 10
      emit(s.sparks, r.x, r.y, '#FFD700', 4, 2)
    }
  }

  // Enemies
  if (p.inv <= 0) {
    for (const e of enemies) {
      if (e.dead) continue
      if (aabb(p.x,p.y,p.w,p.h, e.x,e.y,e.w,e.h)) {
        if (p.vy > 0 && p.y+p.h < e.y+e.h*.55+8) {
          e.dead = true; p.vy = -11; p.score += 100; s.shake = 7
          emit(s.sparks, e.x+17, e.y+17, '#FF6622', 12, 4)
        } else if (p.rings > 0) {
          const n = Math.min(p.rings, 15)
          for (let i=0;i<n;i++) s.sparks.push({
            x:p.x+18,y:p.y+18, vx:(Math.random()-.5)*8, vy:-Math.random()*6-2,
            life:1.4, color:'#FFD700', sz:5, ring:true,
          })
          p.rings = Math.max(0, p.rings-n); p.inv = 100; s.shake = 14
        } else { p.dead=true; p.vy=-13; p.vx=0; s.shake=22 }
      }
    }
  }
  if (p.inv > 0) p.inv--

  // Pit
  if (p.y > H + 100) { p.dead = true; p.dt = 80; s.shake = 22 }

  // Goal
  if (p.x > LW - 240) {
    s.phase = 'clear'; s.ct = 0
    const timeBonus = Math.max(0, 8000 - s.tick * 4)
    p.score += p.rings * 50 + timeBonus
    emit(s.sparks, p.x+18, p.y+18, '#FFD700', 24, 6)
    s.shake = 10
  }

  // Enemy AI
  for (const e of enemies) {
    if (e.dead) continue
    e.x += e.vx; e.anim += 0.18
    if (e.x < e.px[0]) { e.x = e.px[0]; e.vx *= -1 }
    if (e.x+e.w > e.px[1]) { e.x = e.px[1]-e.w; e.vx *= -1 }
    if (e.type === 'jumper') {
      e.jt++
      if (e.jt > 80 + Math.random()*40) { e.vy = -11; e.jt = 0 }
    }
    if (e.vy) { e.vy += 0.58; e.y += e.vy; if (e.y >= GY-34) { e.y = GY-34; e.vy = 0 } }
  }

  // Sparks
  for (let i = s.sparks.length-1; i >= 0; i--) {
    const pt = s.sparks[i]
    pt.x += pt.vx; pt.y += pt.vy
    pt.vy += pt.ring ? 0.3 : 0.12; pt.life -= 0.024
    if (pt.life <= 0) s.sparks.splice(i, 1)
  }

  // Camera
  s.cam += (p.x - W/3 - s.cam) * 0.13
  s.cam  = Math.max(0, Math.min(LW - W, s.cam))
}

// ── Draw ──────────────────────────────────────────────────────────────────────
function draw(ctx, s) {
  const p  = s.p
  const { GY, LW, plats, rings, enemies, springs, theme, num } = s.level
  const cam = s.cam, t = s.tick

  ctx.save()
  if (s.shake > 1) ctx.translate((Math.random()-.5)*s.shake*1.2,(Math.random()-.5)*s.shake)

  // ── Sky ──
  const sk = ctx.createLinearGradient(0,0,0,H)
  sk.addColorStop(0, theme.sky[0]); sk.addColorStop(1, theme.sky[1])
  ctx.fillStyle = sk; ctx.fillRect(0,0,W,H)

  // Stars (dark themes)
  if (num > 30 && num <= 40) {
    for (let i = 0; i < 80; i++) {
      const sx = (i*173)%W, sy = (i*97)%(H*.55)
      const ss = .5 + Math.abs(Math.sin(t*.04+i))*.8
      ctx.fillStyle = `rgba(255,255,255,${.4+ss*.5})`
      ctx.fillRect(sx, sy, ss, ss)
    }
  }
  // Snow (ice theme)
  if (num > 40) {
    for (let i = 0; i < 40; i++) {
      const sx = ((i*211 + t*.8) % (W+40)) - 20
      const sy = (i*97 + t*.4) % H
      ctx.fillStyle = 'rgba(200,235,255,.6)'
      ctx.beginPath(); ctx.arc(sx,sy,1+Math.random(),0,Math.PI*2); ctx.fill()
    }
  }

  // Clouds
  ctx.fillStyle = num>30&&num<=40 ? 'rgba(100,140,200,.4)' : 'rgba(255,255,255,.8)'
  ;[[70,50,88],[280,30,112],[540,52,90],[780,34,106]].forEach(([cx,cy,r]) => {
    const ox = ((cx - cam*.2)%(W+260)+W+260)%(W+260) - 70
    ctx.beginPath()
    ctx.arc(ox,cy,r*.33,0,Math.PI*2)
    ctx.arc(ox+r*.27,cy-r*.1,r*.26,0,Math.PI*2)
    ctx.arc(ox+r*.51,cy,r*.31,0,Math.PI*2)
    ctx.fill()
  })

  // Hills
  ctx.fillStyle = theme.hills[0]; hillRow(ctx, cam*.33, H-145, 300, 105)
  ctx.fillStyle = theme.hills[1]; hillRow(ctx, cam*.58, H-106, 210, 70)

  // ── World space ──
  ctx.save()
  ctx.translate(-cam, 0)

  // Ground
  ctx.fillStyle = theme.g;    ctx.fillRect(0, GY,    LW, 18)
  ctx.fillStyle = theme.gl;   ctx.fillRect(0, GY+2,  LW,  5)
  ctx.fillStyle = theme.dirt; ctx.fillRect(0, GY+18, LW, H-GY)
  ctx.fillStyle = 'rgba(0,0,0,.09)'
  for (let x=0; x<LW; x+=32) for (let y=GY+18; y<H; y+=32)
    if (((x/32+y/32)%2)===0) ctx.fillRect(x,y,32,32)
  // Ground line detail
  ctx.strokeStyle='rgba(0,0,0,.12)'; ctx.lineWidth=1
  for (let x=0; x<LW; x+=96) {
    ctx.beginPath(); ctx.moveTo(x,GY+8); ctx.lineTo(x+48,GY+8); ctx.stroke()
  }

  // Platforms
  for (const [px,py,pw,ph] of plats) drawPlat(ctx,px,py,pw,ph,theme)

  // Goal star post
  const gx = LW - 220
  ctx.save()
  // Post
  const postG = ctx.createLinearGradient(gx-3,0,gx+3,0)
  postG.addColorStop(0,'#E0E0E0'); postG.addColorStop(.5,'#FFF'); postG.addColorStop(1,'#E0E0E0')
  ctx.fillStyle = postG; ctx.fillRect(gx-3, GY-130, 6, 130)
  // Base
  ctx.fillStyle='#9E9E9E'; ctx.fillRect(gx-10,GY-4,20,8)
  // Star
  ctx.translate(gx, GY-138); ctx.rotate(t*.065)
  drawStar(ctx, 0, 0, 26, 13, 5, theme.ac, 'rgba(0,0,0,.2)')
  ctx.restore()
  // Glow ring
  ctx.strokeStyle = theme.ac; ctx.lineWidth = 2.5
  ctx.shadowColor = theme.ac; ctx.shadowBlur = 12
  ctx.beginPath(); ctx.arc(gx, GY-138, 36, 0, Math.PI*2); ctx.stroke()
  ctx.shadowBlur = 0

  // Springs
  for (const sp of springs) drawSpring(ctx, sp)

  // Rings
  for (const r of rings) {
    if (r.c) continue
    const bob = Math.sin(t*.08 + r.id*.48) * 3
    const sx  = Math.abs(Math.cos(t*.1 + r.id*.42)) * .78 + .22
    ctx.save()
    ctx.translate(r.x, r.y + bob); ctx.scale(sx, 1)
    ctx.shadowColor='#FFEE58'; ctx.shadowBlur=7
    ctx.strokeStyle='#FFD700'; ctx.lineWidth=3.5
    ctx.beginPath(); ctx.arc(0,0,9,0,Math.PI*2); ctx.stroke()
    ctx.fillStyle='rgba(255,255,200,.45)'
    ctx.beginPath(); ctx.arc(-3,-3,3.5,0,Math.PI*2); ctx.fill()
    ctx.shadowBlur=0; ctx.restore()
  }

  // Enemies
  for (const e of enemies) if (!e.dead) drawEnemy(ctx, e, t)

  // Sparks
  for (const pt of s.sparks) {
    ctx.globalAlpha = Math.min(1, pt.life)
    ctx.fillStyle = pt.color
    ctx.shadowColor = pt.color; ctx.shadowBlur = pt.ring ? 6 : 3
    ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.ring ? 5.5 : pt.sz||3, 0, Math.PI*2); ctx.fill()
  }
  ctx.globalAlpha = 1; ctx.shadowBlur = 0

  // Player
  const showP = !p.dead || (p.inv > 0 && p.inv%6 < 3)
  if (showP) drawPlayer(ctx, p, t)

  ctx.restore() // world

  // ── HUD ──
  drawHUD(ctx, p, s, t)

  // ── Overlays ──
  if (s.phase === 'clear')  drawClear(ctx, p, s, t)
  if (s.phase === 'over')   drawOver(ctx, p)
  if (s.phase === 'credits') drawCredits(ctx, p, s)

  ctx.restore() // shake
}

// ── Scene helpers ─────────────────────────────────────────────────────────────
function hillRow(ctx, camX, baseY, hillW, hillH) {
  const start = Math.floor(camX / hillW) - 1
  for (let i = start; i <= start + Math.ceil(W/hillW) + 2; i++) {
    ctx.beginPath()
    ctx.ellipse(i*hillW - camX + hillW/2, baseY, hillW*.68, hillH, 0, Math.PI, 0)
    ctx.fill()
  }
}

function drawPlat(ctx, px, py, pw, ph, theme) {
  const [c1, c2, c3] = theme.ph
  // Shadow
  ctx.fillStyle='rgba(0,0,0,.18)'
  ctx.fillRect(px+5, py+ph+3, pw, 7)
  // Body
  ctx.fillStyle=c1; ctx.fillRect(px, py, pw, ph)
  // Bottom stripe darker
  ctx.fillStyle=c2; ctx.fillRect(px, py+ph/2, pw, ph/2)
  // Dirt
  ctx.fillStyle=c3; ctx.fillRect(px+2, py+7, pw-4, ph-7)
  // Top edge highlight
  ctx.fillStyle='rgba(255,255,255,.28)'; ctx.fillRect(px+2, py+2, pw-4, 3)
  // Left shadow
  ctx.fillStyle='rgba(0,0,0,.1)'; ctx.fillRect(px, py+3, 3, ph-3)
}

function drawSpring(ctx, sp) {
  const { x, y, w, h, t: st } = sp
  const compressed = st > 0
  const ch = compressed ? h*.4 : h
  ctx.fillStyle='#E53935'
  ctx.fillRect(x+2, y+h-8, w-4, 8)
  ctx.fillStyle='#FF8A65'
  for (let i=0;i<3;i++) {
    const yy = y + h - 8 - (ch/3)*i
    ctx.fillRect(x+2, yy-2, w-4, 4)
  }
  // Top disc
  ctx.fillStyle=compressed?'#FFEB3B':'#FFCCBC'
  ctx.beginPath(); ctx.ellipse(x+w/2, y+h-ch, w*.5, 5, 0, 0, Math.PI*2); ctx.fill()
}

function drawStar(ctx, x, y, r1, r2, pts, c1) {
  ctx.shadowColor=c1; ctx.shadowBlur=20
  ctx.fillStyle=c1
  ctx.beginPath()
  for (let i=0;i<pts*2;i++) {
    const r = i%2 ? r2 : r1, a = (Math.PI/pts)*i - Math.PI/2
    if (!i) ctx.moveTo(x+r*Math.cos(a), y+r*Math.sin(a))
    else    ctx.lineTo(x+r*Math.cos(a), y+r*Math.sin(a))
  }
  ctx.closePath(); ctx.fill()
  ctx.shadowBlur=0
}

// ── Enemy drawing ─────────────────────────────────────────────────────────────
function drawEnemy(ctx, e, t) {
  const cx = e.x+17, cy = e.y+17, d = e.vx>0?1:-1
  if (e.type === 'jumper') drawJumper(ctx,cx,cy,d,e)
  else                     drawCrab(ctx,cx,cy,d,e)
}

function drawCrab(ctx, cx, cy, d, e) {
  // Body shadow
  ctx.fillStyle='rgba(0,0,0,.2)'
  ctx.beginPath(); ctx.ellipse(cx+3,cy+17,15,5,0,0,Math.PI*2); ctx.fill()
  // Shell
  ctx.fillStyle='#B71C1C'
  ctx.beginPath(); ctx.ellipse(cx,cy,18,15,0,0,Math.PI*2); ctx.fill()
  // Plate segments
  ctx.fillStyle='#C62828'
  ;[[-8,0],[0,-3],[8,0]].forEach(([ox,oy])=>{
    ctx.beginPath(); ctx.ellipse(cx+ox,cy+oy,5,4,0,0,Math.PI*2); ctx.fill()
  })
  // Rivets
  ctx.fillStyle='#9E9E9E'
  ;[[-9,-8],[9,-8],[-9,5],[9,5]].forEach(([ox,oy])=>{
    ctx.beginPath(); ctx.arc(cx+ox,cy+oy,2.5,0,Math.PI*2); ctx.fill()
  })
  // Eye pod
  ctx.fillStyle='#212121'
  ctx.beginPath(); ctx.ellipse(cx+d*8,cy-4,8,6,d*.2,0,Math.PI*2); ctx.fill()
  ctx.fillStyle='#F44336'
  ctx.beginPath(); ctx.arc(cx+d*9,cy-4,4,0,Math.PI*2); ctx.fill()
  ctx.fillStyle='#FFF'
  ctx.beginPath(); ctx.arc(cx+d*10.5,cy-5.5,1.5,0,Math.PI*2); ctx.fill()
  // Claws
  ctx.strokeStyle='#C62828'; ctx.lineWidth=3.5; ctx.lineCap='round'
  const la = Math.sin(e.anim)*.55
  ;[-1,1].forEach(s => {
    ctx.beginPath()
    ctx.moveTo(cx+s*11,cy+8)
    ctx.lineTo(cx+s*11+Math.cos(la*s)*11,cy+20)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(cx+s*11+Math.cos(la*s)*11,cy+20)
    ctx.lineTo(cx+s*11+Math.cos(la*s)*15+s*4,cy+17)
    ctx.stroke()
  })
}

function drawJumper(ctx, cx, cy, d, e) {
  ctx.fillStyle='rgba(0,0,0,.2)'
  ctx.beginPath(); ctx.ellipse(cx+3,cy+17,13,4,0,0,Math.PI*2); ctx.fill()
  // Body
  ctx.fillStyle='#1B5E20'
  ctx.beginPath(); ctx.ellipse(cx,cy+2,16,13,0,0,Math.PI*2); ctx.fill()
  ctx.fillStyle='#2E7D32'
  ctx.beginPath(); ctx.ellipse(cx,cy-1,11,9,0,0,Math.PI*2); ctx.fill()
  // Stripe
  ctx.strokeStyle='#4CAF50'; ctx.lineWidth=2
  ctx.beginPath(); ctx.moveTo(cx-8,cy); ctx.lineTo(cx+8,cy); ctx.stroke()
  // Big bug eyes
  ctx.fillStyle='#212121'
  ctx.beginPath(); ctx.ellipse(cx+d*7,cy-5,8,9,.2*d,0,Math.PI*2); ctx.fill()
  ctx.fillStyle='#76FF03'
  ctx.beginPath(); ctx.arc(cx+d*8,cy-5,5.5,0,Math.PI*2); ctx.fill()
  ctx.fillStyle='#111'
  ctx.beginPath(); ctx.arc(cx+d*9,cy-5,2.5,0,Math.PI*2); ctx.fill()
  ctx.fillStyle='#FFF'
  ctx.beginPath(); ctx.arc(cx+d*10,cy-6.5,1.3,0,Math.PI*2); ctx.fill()
  // Legs
  ctx.strokeStyle='#1B5E20'; ctx.lineWidth=3; ctx.lineCap='round'
  const bent = e.vy && e.vy < 0
  ;[-1,1].forEach(s => {
    ctx.beginPath()
    ctx.moveTo(cx+s*9,cy+10)
    ctx.lineTo(cx+s*14,cy+18+(bent?-6:4))
    ctx.stroke()
  })
}

// ── Player drawing ────────────────────────────────────────────────────────────
function drawPlayer(ctx, p, t) {
  const cx = p.x+18, cy = p.y+18, d = p.face
  const spd = Math.abs(p.vx)
  const air = !p.ground

  // Ground shadow
  if (p.ground) {
    ctx.fillStyle='rgba(0,0,0,.18)'
    ctx.beginPath(); ctx.ellipse(cx, p.y+p.h+3, 14+Math.min(spd,6), 4, 0, 0, Math.PI*2); ctx.fill()
  }

  // Spin mode (airborne or charging)
  if (air || p.charging) {
    ctx.fillStyle='#0D47A1'
    ctx.beginPath(); ctx.arc(cx,cy,19,0,Math.PI*2); ctx.fill()
    // Gradient shine
    const sg = ctx.createRadialGradient(cx-6,cy-7,2,cx,cy,19)
    sg.addColorStop(0,'rgba(100,180,255,.65)'); sg.addColorStop(1,'rgba(0,0,0,0)')
    ctx.fillStyle=sg; ctx.beginPath(); ctx.arc(cx,cy,19,0,Math.PI*2); ctx.fill()
    // Spin arcs
    ctx.strokeStyle='rgba(255,255,255,.2)'; ctx.lineWidth=3; ctx.lineCap='round'
    for (let i=0;i<5;i++) {
      const a=p.anim+(Math.PI*2/5)*i
      ctx.beginPath(); ctx.arc(cx,cy,13,a,a+.55); ctx.stroke()
    }
    // Shoe visible
    ctx.fillStyle='#B71C1C'
    ctx.beginPath(); ctx.ellipse(cx+d*9,cy+10,10,6,d*.25,0,Math.PI*2); ctx.fill()
    ctx.fillStyle='#FFF'; ctx.fillRect(cx+d*9-9,cy+8,18,2.5)
    return
  }

  // Speed lines
  if (spd > 9) {
    ctx.strokeStyle=`rgba(100,180,255,${(spd-9)/5*.4})`; ctx.lineWidth=1.5
    for (let i=0;i<4;i++) {
      const ly = cy-8+i*6, len=spd*4
      ctx.beginPath(); ctx.moveTo(cx-d*20,ly); ctx.lineTo(cx-d*(20+len),ly); ctx.stroke()
    }
  }

  const fr = Math.floor(p.anim*2.5)%4

  // Shoes
  const lo = (i) => spd>0.8 ? (fr===i?7:fr===(i+2)%4?-4:0) : 0
  drawShoe(ctx, cx-d*5, cy+17+lo(0), d)
  drawShoe(ctx, cx+d*8, cy+17+lo(2), d)

  // Body
  ctx.fillStyle='#1565C0'
  ctx.beginPath(); ctx.ellipse(cx,cy+3,14,16,0,0,Math.PI*2); ctx.fill()
  // Body specular
  const bsg = ctx.createLinearGradient(cx-14,cy-5,cx+6,cy+10)
  bsg.addColorStop(0,'rgba(80,160,255,.3)'); bsg.addColorStop(1,'rgba(0,0,0,0)')
  ctx.fillStyle=bsg; ctx.beginPath(); ctx.ellipse(cx,cy+3,14,16,0,0,Math.PI*2); ctx.fill()
  // Belly
  ctx.fillStyle='#EFEBE9'
  ctx.beginPath(); ctx.ellipse(cx+d*3,cy+8,9,10,d*.18,0,Math.PI*2); ctx.fill()
  ctx.fillStyle='rgba(255,255,255,.4)'
  ctx.beginPath(); ctx.ellipse(cx+d*1,cy+5,4,5,d*.1,0,Math.PI*2); ctx.fill()

  // Back arm
  const barmA = spd>1 ? Math.sin(p.anim)*.55*(-d) : 0
  drawArm(ctx, cx-d*7, cy-2, barmA, d, false)

  // Head
  ctx.fillStyle='#1565C0'
  ctx.beginPath(); ctx.arc(cx+d*4, cy-14, 14, 0, Math.PI*2); ctx.fill()
  const hsg = ctx.createRadialGradient(cx+d*1,cy-18,2,cx+d*4,cy-14,14)
  hsg.addColorStop(0,'rgba(80,160,255,.3)'); hsg.addColorStop(1,'rgba(0,0,0,0)')
  ctx.fillStyle=hsg; ctx.beginPath(); ctx.arc(cx+d*4,cy-14,14,0,Math.PI*2); ctx.fill()

  // Spikes (4, detailed)
  for (let i=0;i<4;i++) {
    const a = Math.PI + d*(0.12+i*.36), r = 13+i*4
    const bx=cx+d*4, by=cy-14
    ctx.fillStyle='#0D47A1'
    ctx.beginPath()
    ctx.moveTo(bx+Math.cos(a-.28)*12, by+Math.sin(a-.28)*12)
    ctx.lineTo(bx+Math.cos(a)*r,      by+Math.sin(a)*r)
    ctx.lineTo(bx+Math.cos(a+.28)*12, by+Math.sin(a+.28)*12)
    ctx.fill()
    // Spike highlight
    ctx.fillStyle='rgba(80,160,255,.25)'
    ctx.beginPath()
    ctx.moveTo(bx+Math.cos(a-.1)*12,  by+Math.sin(a-.1)*12)
    ctx.lineTo(bx+Math.cos(a)*r*.65,  by+Math.sin(a)*r*.65)
    ctx.lineTo(bx+Math.cos(a+.1)*12,  by+Math.sin(a+.1)*12)
    ctx.fill()
  }

  // Nose area (lighter muzzle)
  ctx.fillStyle='#1976D2'
  ctx.beginPath(); ctx.arc(cx+d*13, cy-10, 7, 0, Math.PI*2); ctx.fill()
  ctx.fillStyle='rgba(100,160,255,.2)'
  ctx.beginPath(); ctx.arc(cx+d*12, cy-11, 4, 0, Math.PI*2); ctx.fill()

  // Eye — white
  ctx.fillStyle='#FFF'
  ctx.beginPath(); ctx.arc(cx+d*10, cy-15, 7.5, 0, Math.PI*2); ctx.fill()
  // Green iris (iconic Sonic eyes)
  ctx.fillStyle='#26A69A'
  ctx.beginPath(); ctx.arc(cx+d*11, cy-15, 5, 0, Math.PI*2); ctx.fill()
  // Dark pupil
  ctx.fillStyle='#0A0A1A'
  ctx.beginPath(); ctx.arc(cx+d*12, cy-15, 2.8, 0, Math.PI*2); ctx.fill()
  // Shine
  ctx.fillStyle='rgba(255,255,255,.9)'
  ctx.beginPath(); ctx.arc(cx+d*13.2, cy-16.5, 1.5, 0, Math.PI*2); ctx.fill()
  // Eyelid
  ctx.fillStyle='#0D47A1'
  ctx.beginPath(); ctx.arc(cx+d*10, cy-20, 7.5, .15, Math.PI-.15); ctx.fill()

  // Front arm
  const farmA = spd>1 ? -Math.sin(p.anim)*.55*(-d) : 0
  drawArm(ctx, cx+d*6, cy-2, farmA, d, true)
}

function drawArm(ctx, x, y, angle, d, front) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle)
  ctx.fillStyle = front ? '#1565C0' : '#0D47A1'
  ctx.beginPath(); ctx.ellipse(0,9,5,9,0,0,Math.PI*2); ctx.fill()
  // Glove
  ctx.fillStyle='#F5F5F5'
  ctx.beginPath(); ctx.arc(0,16,6.5,0,Math.PI*2); ctx.fill()
  ctx.fillStyle='rgba(0,0,0,.1)'
  ctx.beginPath(); ctx.arc(0,16,6.5,0,Math.PI*2); ctx.stroke()
  // Glove knuckle line
  ctx.strokeStyle='rgba(0,0,0,.08)'; ctx.lineWidth=1
  ctx.beginPath(); ctx.moveTo(-4,14); ctx.lineTo(4,14); ctx.stroke()
  ctx.restore()
}

function drawShoe(ctx, x, y, d) {
  // Shoe body
  ctx.fillStyle='#C62828'
  ctx.beginPath(); ctx.ellipse(x, y, 11, 6.5, d*.12, 0, Math.PI*2); ctx.fill()
  // Toe lighter
  ctx.fillStyle='#E53935'
  ctx.beginPath(); ctx.ellipse(x+d*4, y, 6, 4.5, d*.1, 0, Math.PI*2); ctx.fill()
  // White sole
  ctx.fillStyle='rgba(255,255,255,.85)'
  ctx.beginPath(); ctx.ellipse(x, y+3.5, 11, 3, d*.05, 0, Math.PI*2); ctx.fill()
  // Gold buckle
  ctx.fillStyle='#FFD700'
  ctx.fillRect(x-5.5, y-1.5, 11, 3)
  ctx.fillStyle='rgba(0,0,0,.15)'
  ctx.fillRect(x-5.5, y-1.5, 11, 1)
}

// ── HUD ───────────────────────────────────────────────────────────────────────
function drawHUD(ctx, p, s, t) {
  // Panel
  ctx.fillStyle='rgba(0,12,30,.65)'
  roundFill(ctx, 10,10,200,108, 10)
  ctx.strokeStyle='rgba(255,255,255,.12)'; ctx.lineWidth=1
  roundStroke(ctx, 10,10,200,108, 10)

  // Ring counter
  ctx.strokeStyle='#FFD700'; ctx.lineWidth=3
  ctx.shadowColor='#FFEE58'; ctx.shadowBlur=8
  ctx.beginPath(); ctx.arc(28,30,10,0,Math.PI*2); ctx.stroke()
  ctx.shadowBlur=0
  ctx.font='bold 16px "Segoe UI",sans-serif'; ctx.fillStyle='#FFD700'
  ctx.fillText(`${p.rings}`, 46, 36)

  // Score
  ctx.font='bold 13px "Segoe UI",sans-serif'; ctx.fillStyle='#E0E0E0'
  ctx.fillText(`SCORE  ${p.score.toLocaleString()}`, 18, 56)

  // Lives (hearts)
  for (let i=0;i<3;i++) {
    ctx.fillStyle = i < p.lives ? '#EF5350' : '#333'
    drawHeart(ctx, 20+i*24, 68, 8)
  }

  // Level info
  ctx.font='bold 11px "Segoe UI",sans-serif'
  ctx.fillStyle='#90CAF9'; ctx.fillText(`LEVEL ${s.num}/50`, 18, 90)
  ctx.fillStyle='#78909C'; ctx.fillText(s.level.theme.name, 18, 104)

  // Speed meter (right side)
  const spd = Math.abs(p.vx)
  if (spd > 4) {
    const alpha = Math.min(1, (spd-4)/10)
    ctx.fillStyle=`rgba(0,12,30,${alpha*.65})`
    roundFill(ctx, W-100,10,90,36,8)
    ctx.font=`bold ${10+Math.floor(spd*.5)}px "Segoe UI",sans-serif`
    ctx.fillStyle=`rgba(100,200,255,${alpha})`
    ctx.textAlign='center'; ctx.fillText('SPEED!',W-55,32); ctx.textAlign='left'
  }

  // Controls hint
  if (s.tick < 240 && s.num === 1) {
    ctx.fillStyle='rgba(0,10,25,.7)'
    roundFill(ctx, W/2-200,H-50,400,36,8)
    ctx.fillStyle='rgba(255,255,255,.8)'; ctx.font='12px "Segoe UI",sans-serif'
    ctx.textAlign='center'
    ctx.fillText('← → Mover  |  ↑/Space Pular  |  ↓ Spindash', W/2, H-28)
    ctx.textAlign='left'
  }
}

function drawHeart(ctx, x, y, r) {
  ctx.beginPath()
  ctx.moveTo(x, y+r*.5)
  ctx.bezierCurveTo(x, y-r*.5, x-r*1.5, y-r*.5, x-r*1.5, y+r*.3)
  ctx.bezierCurveTo(x-r*1.5, y+r*1.2, x, y+r*1.8, x, y+r*2)
  ctx.bezierCurveTo(x, y+r*1.8, x+r*1.5, y+r*1.2, x+r*1.5, y+r*.3)
  ctx.bezierCurveTo(x+r*1.5, y-r*.5, x, y-r*.5, x, y+r*.5)
  ctx.closePath(); ctx.fill()
}

function roundFill(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.roundRect(x,y,w,h,r); ctx.fill()
}
function roundStroke(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.roundRect(x,y,w,h,r); ctx.stroke()
}

// ── Overlays ──────────────────────────────────────────────────────────────────
function drawClear(ctx, p, s, t) {
  const a = Math.min(1, s.ct/25)
  ctx.fillStyle=`rgba(0,0,0,${a*.7})`; ctx.fillRect(0,0,W,H)
  if (s.ct < 8) return

  const by = Math.max(0,(25-s.ct)*4)
  ctx.save(); ctx.translate(0,-by)
  ctx.textAlign='center'

  ctx.shadowColor=s.level.theme.ac; ctx.shadowBlur=40
  ctx.fillStyle=s.level.theme.ac
  ctx.font='bold 52px "Segoe UI",sans-serif'
  ctx.fillText(`LEVEL ${s.num} CLEAR!`, W/2, H/2-45)
  ctx.shadowBlur=0

  ctx.fillStyle='rgba(255,255,255,.9)'; ctx.font='18px "Segoe UI",sans-serif'
  ctx.fillText(`Anéis coletados: ${p.rings}  → +${p.rings*50} pts`, W/2, H/2+0)
  ctx.fillText(`Score total: ${p.score.toLocaleString()}`, W/2, H/2+28)

  if (s.ct > 60) {
    const pulse = .6 + Math.sin(s.ct*.12)*.4
    ctx.fillStyle=`rgba(255,255,255,${pulse})`
    ctx.font='15px "Segoe UI",sans-serif'
    const msg = s.num<50 ? `Pressione SPACE → Nível ${s.num+1}` : 'Pressione SPACE → Créditos'
    ctx.fillText(msg, W/2, H/2+65)
  }
  ctx.textAlign='left'; ctx.restore()
}

function drawOver(ctx, p) {
  ctx.fillStyle='rgba(0,0,0,.8)'; ctx.fillRect(0,0,W,H)
  ctx.textAlign='center'
  ctx.shadowColor='#EF5350'; ctx.shadowBlur=50
  ctx.fillStyle='#EF5350'; ctx.font='bold 62px "Segoe UI",sans-serif'
  ctx.fillText('GAME OVER', W/2, H/2-22)
  ctx.shadowBlur=0
  ctx.fillStyle='rgba(255,255,255,.75)'; ctx.font='17px "Segoe UI",sans-serif'
  ctx.fillText('Pressione R ou SPACE para recomeçar', W/2, H/2+28)
  ctx.textAlign='left'
}

function drawCredits(ctx, p, s) {
  ctx.fillStyle='rgba(0,0,20,.92)'; ctx.fillRect(0,0,W,H)
  ctx.textAlign='center'
  ctx.shadowColor='#FFD700'; ctx.shadowBlur=40
  ctx.fillStyle='#FFD700'; ctx.font='bold 46px "Segoe UI",sans-serif'
  ctx.fillText('🏆 PARABÉNS! 🏆', W/2, H/2-60)
  ctx.shadowBlur=0
  ctx.fillStyle='#FFF'; ctx.font='22px "Segoe UI",sans-serif'
  ctx.fillText('Você completou todos os 50 níveis!', W/2, H/2-10)
  ctx.fillText(`Score final: ${p.score.toLocaleString()}`, W/2, H/2+28)
  ctx.fillStyle='rgba(255,255,255,.6)'; ctx.font='14px "Segoe UI",sans-serif'
  ctx.fillText('Feito por Fbarata03  •  Pressione R para jogar de novo', W/2, H/2+70)
  ctx.textAlign='left'
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const ref = useRef(null)

  useEffect(() => {
    const canvas = ref.current
    const ctx    = canvas.getContext('2d')
    let state    = mkState(1)
    let raf

    function resize() {
      const sc = Math.min(window.innerWidth/W, window.innerHeight/H)
      canvas.style.width  = W*sc+'px'
      canvas.style.height = H*sc+'px'
    }
    resize()
    window.addEventListener('resize', resize)

    function loop() {
      update(state)
      draw(ctx, state)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize) }
  }, [])

  return (
    <canvas ref={ref} width={W} height={H}
      style={{ display:'block', background:'#000' }}
    />
  )
}

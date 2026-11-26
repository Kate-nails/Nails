/* ═════════ Intro de Katy Cardona Nails — el logo se arma en el centro ═════════
   Sobre negro, a pantalla completa, en cada visita. Solo JavaScript (un canvas), sin librerías.
   El logo HD (Real-ESRGAN 4x) está cortado en 24 piezas exactas (logo-piezas.webp + logo-piezas.json):
   aro, K, C, moño, mano, onda, 11 letras, 5 de NAILS y 2 líneas. Juntas forman el logo píxel a píxel.
   Dirección "Premium" (skills de HERRAMIENTAS): entradas cubic-bezier(0.22,1,0.36,1) sin rebote,
   escalonado por jerarquía (emblema → mano → nombre), un solo "wow" (el brillo que cruza el metal).
   Guion (ms):
     150–2700  cada pieza entra desde un lado fijo de la pantalla, en línea recta, y aterriza suave en su sitio:
               aro (arriba-izq.), K (izq.), C (arriba), moño (arriba-der.), mano (der.), onda (abajo),
               KATY (izq.), CARDONA (der.), NAILS (abajo), líneas (cada una desde su lado)
     3000–4000 un brillo diagonal cruza el logo completo
     3300–4000 titilan los destellos de cuatro puntas · todo el tiempo: polvo dorado muy sutil
     4800–5400 el logo se desvanece y entra la página
   Revisión: ?intro-at=3000 congela la intro en ese instante (ms). */
(() => {
  const intro = document.getElementById('intro');
  if (!intro) return;
  const root = document.documentElement;
  root.classList.add('intro-on');

  const END = 5400;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const atRaw = new URLSearchParams(location.search).get('intro-at');
  const at = atRaw === null ? null : +atRaw;
  const big = matchMedia('(min-width: 761px)').matches;
  const DIR = 'assets/brand/intro/';
  const ATLAS = DIR + (big ? 'logo-piezas.webp' : 'logo-piezas-m.webp');
  const AK = big ? 1 : .5;                       // escala del atlas respecto a las coordenadas del JSON
  // destellos: [x, y] como fracción del logo y tamaño relativo
  const SPARKS = [[.272, .133, 1], [.124, .44, 1.05], [.911, .917, .95], [.67, .193, .55], [.873, .49, .4]];

  const stage = intro.querySelector('.intro__stage');
  const cv = document.createElement('canvas');
  cv.className = 'kc-canvas';
  cv.setAttribute('role', 'img');
  cv.setAttribute('aria-label', 'Logo de Katy Cardona Nails: monograma KC en oro rosa con moño, mano con uñas y el nombre');
  stage.appendChild(cv);
  const ctx = cv.getContext('2d');

  /* ── utilidades de tiempo y curvas ── */
  const clamp = v => Math.min(1, Math.max(0, v));
  const seg = (t, a, b) => clamp((t - a) / (b - a));
  const bezier = (x1, y1, x2, y2) => {            // igual que cubic-bezier() de CSS
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
    const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    return v => {
      v = clamp(v); let s = v;
      for (let i = 0; i < 8; i++) {
        const x = ((ax * s + bx) * s + cx) * s - v, d = (3 * ax * s + 2 * bx) * s + cx;
        if (Math.abs(d) < 1e-6) break; s -= x / d;
      }
      s = clamp(s); return ((ay * s + by) * s + cy) * s;
    };
  };
  const enter = bezier(.22, 1, .36, 1), move = bezier(.65, 0, .35, 1), leave = bezier(.7, 0, .84, 0);
  const rnd = (s => () => (s = (s * 16807) % 2147483647) / 2147483647)(11);   // aleatorio fijo: siempre igual

  let done = false, raf = 0, guard = 0, data = null, atlas = null, ready = false;
  let pieces = [], whole = null, shineCv = null;
  let vw = 0, vh = 0, dpr = 1, box = { x: 0, y: 0, w: 0, h: 0, s: 1 };

  /* ── coreografía: cada pieza entra desde un lado fijo, en línea recta, y aterriza suave ──
     emblema: aro desde arriba-izquierda, K desde la izquierda, C desde arriba, moño desde arriba-derecha,
     mano desde la derecha, onda desde abajo · nombre: KATY desde la izquierda, CARDONA desde la derecha,
     NAILS desde abajo, cada línea desde su lado. Solo el emblema gira un poco (≤ 10°); las letras no giran. */
  const SIDE = { L: [-1, 0], R: [1, 0], T: [0, -1], B: [0, 1], TL: [-.75, -.66], TR: [.75, -.66] };
  function choreo(p) {
    const n = p.n, o = p.order;
    const deg = d => d * Math.PI / 180;
    if (n === 'ring') return { t0: 150, dur: 1600, dir: SIDE.TL, rot: deg(-10) };
    if (n === 'swoosh') return { t0: 260, dur: 1500, dir: SIDE.B, rot: 0 };
    if (n === 'k') return { t0: 380, dur: 1500, dir: SIDE.L, rot: deg(6) };
    if (n === 'c') return { t0: 480, dur: 1500, dir: SIDE.T, rot: deg(-6) };
    if (n === 'bow') return { t0: 600, dur: 1500, dir: SIDE.TR, rot: deg(8) };
    if (n === 'hand') return { t0: 700, dur: 1500, dir: SIDE.R, rot: deg(-5) };
    if (n.startsWith('rule')) return { t0: 1550, dur: 1100, dir: o === 0 ? SIDE.L : SIDE.R, rot: 0 };
    if (n.startsWith('letter')) {                 // 0–3 KATY (izquierda) · 4–10 CARDONA (derecha)
      const left = o < 4, i = left ? 3 - o : o - 4;   // empiezan las más cercanas al centro
      return { t0: 950 + i * 60, dur: 1250, dir: left ? SIDE.L : SIDE.R, rot: 0 };
    }
    return { t0: 1500 + o * 60, dur: 1150, dir: SIDE.B, rot: 0 };   // NAILS
  }

  /* ── tamaño: el logo llena la pantalla sin cortarse; las piezas se pre-escalan con alta calidad ── */
  let build = 0;
  async function layout() {
    const id = ++build;
    dpr = Math.min(devicePixelRatio || 1, 2);
    vw = innerWidth; vh = innerHeight;
    cv.width = Math.round(vw * dpr); cv.height = Math.round(vh * dpr);
    const w = Math.min(vw * .92, vh * .88 * data.w / data.h);
    box = { w, h: w * data.h / data.w, s: w / data.w };
    box.x = (vw - box.w) / 2; box.y = (vh - box.h) / 2;
    const k = box.s * dpr;                               // px del lienzo por px del logo
    const bms = await Promise.all(data.pieces.map(p => createImageBitmap(atlas,
      Math.round(p.ax * AK), Math.round(p.ay * AK), Math.max(1, Math.round(p.w * AK)), Math.max(1, Math.round(p.h * AK)),
      { resizeWidth: Math.max(1, Math.round(p.w * k)), resizeHeight: Math.max(1, Math.round(p.h * k)), resizeQuality: 'high' })));
    if (id !== build || done) { bms.forEach(b => b.close()); return; }
    pieces.forEach(p => p.bm?.close());
    pieces.forEach((p, i) => { p.bm = bms[i]; });
    // logo completo (para el brillo, recortado a su forma)
    whole = document.createElement('canvas');
    whole.width = Math.ceil(box.w * dpr); whole.height = Math.ceil(box.h * dpr);
    const wc = whole.getContext('2d');
    for (const p of pieces) wc.drawImage(p.bm, Math.round(p.x * k), Math.round(p.y * k));
    shineCv = document.createElement('canvas');
    shineCv.width = whole.width; shineCv.height = whole.height;
    ready = true;
    draw(clock());
  }

  /* ── polvo dorado ── */
  const motes = Array.from({ length: big ? 34 : 18 }, () => ({
    x: rnd(), y: rnd(), r: .4 + rnd() * .8, sp: .006 + rnd() * .014, ph: rnd() * 6.28, tw: .6 + rnd() * 1.6, warm: rnd(),
  }));

  function star(x, y, s, a, rot) {
    ctx.save();
    ctx.translate(x, y); ctx.rotate(rot);
    ctx.globalCompositeOperation = 'lighter';
    const core = ctx.createRadialGradient(0, 0, 0, 0, 0, s * .22);
    core.addColorStop(0, `rgba(255,255,255,${a})`);
    core.addColorStop(.35, `rgba(255,232,220,${a * .55})`);
    core.addColorStop(1, 'rgba(255,190,165,0)');
    ctx.fillStyle = core;
    ctx.beginPath(); ctx.arc(0, 0, s * .22, 0, 6.2832); ctx.fill();
    const ray = (len, w) => {
      const g = ctx.createLinearGradient(-len, 0, len, 0);
      g.addColorStop(0, 'rgba(255,205,185,0)'); g.addColorStop(.5, `rgba(255,255,255,${a})`); g.addColorStop(1, 'rgba(255,205,185,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(-len, 0); ctx.quadraticCurveTo(0, -w, len, 0); ctx.quadraticCurveTo(0, w, -len, 0); ctx.fill();
    };
    for (let i = 0; i < 4; i++) { ctx.save(); ctx.rotate(i * Math.PI / 4); i % 2 ? ray(s * .5, s * .02) : ray(s, s * .03); ctx.restore(); }
    ctx.restore();
  }

  // posición de una pieza en el instante t: [x, y, giro, opacidad] en px de pantalla (CSS).
  // Sale justo fuera del borde de la pantalla por su lado y viaja en línea recta hasta su sitio.
  function pose(p, t) {
    const e = enter(seg(t, p.t0, p.t0 + p.dur)), r = 1 - e;
    const [dx, dy] = p.dir, k = box.s;
    const px = box.x + p.cx * k, py = box.y + p.cy * k, hw = p.w * k / 2, hh = p.h * k / 2;
    const fx = dx > 0 ? (vw - px + hw) / dx : dx < 0 ? (px + hw) / -dx : Infinity;
    const fy = dy > 0 ? (vh - py + hh) / dy : dy < 0 ? (py + hh) / -dy : Infinity;
    const far = Math.min(fx, fy) + 24;
    return [dx * far * r, dy * far * r, p.rot * r, enter(seg(t, p.t0, p.t0 + p.dur * .35))];
  }

  function drawPiece(p, t, alpha) {
    const [ox, oy, rot, op] = pose(p, t);
    const a = op * alpha;
    if (a <= .002) return;
    const k = box.s;
    const cx = box.x + p.cx * k + ox, cy = box.y + p.cy * k + oy;
    ctx.globalAlpha = a;
    if (Math.abs(rot) < 1e-4 && Math.abs(ox) < .02 && Math.abs(oy) < .02) {
      // en reposo: sin transformaciones y alineado al píxel → nitidez total
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(p.bm, Math.round(box.x * dpr) + Math.round(p.x * k * dpr), Math.round(box.y * dpr) + Math.round(p.y * k * dpr));
      return;
    }
    const w = p.w * k, h = p.h * k;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.translate(cx, cy);
    if (rot) ctx.rotate(rot);
    ctx.drawImage(p.bm, -w / 2, -h / 2, w, h);
  }

  function draw(t) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, cv.width, cv.height);
    if (!ready) return;
    const out = 1 - leave(seg(t, 4800, 5400));

    // polvo
    const da = enter(seg(t, 300, 1800)) * out * .45;
    if (da > 0) for (const m of motes) {
      const y = ((m.y - t / 1000 * m.sp) % 1 + 1) % 1, x = m.x + Math.sin(t / 1700 + m.ph) * .006;
      const a = da * (.35 + .65 * (.5 + .5 * Math.sin(t / 1000 * m.tw + m.ph)));
      ctx.fillStyle = m.warm > .5 ? `rgba(246,196,174,${a})` : `rgba(255,236,226,${a * .8})`;
      ctx.beginPath(); ctx.arc(x * cv.width, y * cv.height, m.r * dpr, 0, 6.2832); ctx.fill();
    }

    ctx.save();

    for (const p of pieces) { ctx.save(); drawPiece(p, t, out); ctx.restore(); }

    // el "wow": brillo diagonal que cruza el logo completo, recortado a su forma
    const sv = seg(t, 3000, 4000);
    if (sv > 0 && sv < 1 && whole) {
      const sc = shineCv.getContext('2d');
      sc.globalCompositeOperation = 'source-over';
      sc.clearRect(0, 0, shineCv.width, shineCv.height);
      sc.drawImage(whole, 0, 0);
      sc.globalCompositeOperation = 'source-in';
      const W = shineCv.width, H = shineCv.height, cx = -W * .35 + W * 1.7 * move(sv), band = W * .09;
      const g = sc.createLinearGradient(cx - band, -H * .2, cx + band, H * .2);
      g.addColorStop(0, 'rgba(255,240,232,0)'); g.addColorStop(.5, 'rgba(255,250,246,.95)'); g.addColorStop(1, 'rgba(255,240,232,0)');
      sc.fillStyle = g; sc.fillRect(0, 0, W, H);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.sin(Math.PI * sv) * .85 * out;
      ctx.drawImage(shineCv, Math.round(box.x * dpr), Math.round(box.y * dpr));
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();

    // destellos
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    SPARKS.forEach(([sx, sy, k], i) => {
      const t0 = 3300 + i * 150;
      const a = enter(seg(t, t0, t0 + 600)) * out * (.82 + .18 * Math.sin((t - t0) / 280 + i));
      if (a <= 0) return;
      const s = box.w * .075 * k * (.7 + .3 * enter(seg(t, t0, t0 + 700))) * (1 + .05 * Math.sin((t - t0) / 360 + i * 2));
      star(box.x + sx * box.w, box.y + sy * box.h, s, a, (t - t0) / 9000);
    });
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
  }

  /* ── reloj propio: se congela con la pestaña oculta ── */
  let last = 0, elapsed = 0, running = false;
  const clock = () => (at ?? elapsed);
  function tick(now) {
    if (!running) return;
    elapsed += Math.min(250, now - last); last = now;   // tiempo real; solo se recorta un tirón largo
    if (elapsed >= END) { draw(END); stop(); return finish(false); }
    draw(elapsed);
    raf = requestAnimationFrame(tick);
  }
  function play() { if (running || done || document.hidden) return; running = true; last = performance.now(); raf = requestAnimationFrame(tick); }
  function stop() { running = false; cancelAnimationFrame(raf); }
  function onVis() { document.hidden ? stop() : play(); }
  let rz = 0;
  function onResize() { clearTimeout(rz); rz = setTimeout(layout, 120); }

  function finish(fast) {
    if (done) return;
    done = true;
    clearTimeout(guard); stop();
    removeEventListener('keydown', onKey);
    removeEventListener('resize', onResize);
    document.removeEventListener('visibilitychange', onVis);
    const a = intro.animate([{ opacity: 1 }, { opacity: 0 }], { duration: fast ? 300 : 240, easing: 'ease', fill: 'forwards' });
    a.onfinish = () => {
      pieces.forEach(p => p.bm?.close());
      intro.remove();
      root.classList.remove('intro-on');
      scrollTo(0, 0);
      dispatchEvent(new Event('intro:done'));
    };
  }
  function onKey(e) { if (e.key === 'Escape') finish(true); }
  intro.querySelector('.intro__skip').addEventListener('click', () => finish(true));
  addEventListener('keydown', onKey);

  /* ── arranque: datos + atlas decodificado (máx. 6 s; si no, pasa directo a la página) ── */
  guard = setTimeout(() => finish(true), at === null ? 6000 : 60000);   // en revisión (?intro-at) espera más
  const img = new Image();
  img.src = ATLAS;
  Promise.all([fetch(DIR + 'logo-piezas.json').then(r => { if (!r.ok) throw r; return r.json(); }), img.decode()])
    .then(async ([d]) => {
      if (done) return;
      data = d; atlas = img;
      const count = {};
      pieces = d.pieces.map(p => {   // orden dentro de su tipo (letras de izquierda a derecha)
        const kind = p.n.replace(/\d+$/, '');
        const q = { ...p, kind, order: (count[kind] = (count[kind] ?? -1) + 1), cx: p.x + p.w / 2, cy: p.y + p.h / 2 };
        return Object.assign(q, choreo(q));
      });
      await layout();
      if (done) return;
      clearTimeout(guard);
      intro.classList.add('is-go');
      addEventListener('resize', onResize);
      if (at !== null) { window.__kcDraw = draw; return draw(at); }   // revisión: permite medir cuadros
      if (reduced) { draw(4400); guard = setTimeout(() => finish(false), 1800); return; }
      document.addEventListener('visibilitychange', onVis);
      play();
    })
    .catch(() => finish(true));
})();

/* ═════════ Intro de Katy Cardona Nails: túnel de glitter ═════════
   Solo la entrada tipo túnel: destellos de glitter en los colores de la marca (rosa, lila, hielo, oro)
   que vienen hacia la cámara, se aceleran y se estiran en estelas; la cámara entra y un portal de
   oro rosa se abre en el centro y revela la página.
   Sin GSAP: reloj propio con requestAnimationFrame. Se salta con el botón, Esc, clic o rueda.
   Con "reducir movimiento" no se muestra. Revisión: ?intro-at=1200 congela la intro en ese instante (ms). */
import * as THREE from 'three';

const intro = document.getElementById('intro');
const root = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

function run() {
  const END = 1700;
  const atRaw = new URLSearchParams(location.search).get('intro-at');
  const at = atRaw === null ? null : +atRaw;
  const mobile = matchMedia('(max-width: 760px)').matches;

  /* ── tiempo y curvas ── */
  const clamp = (v) => Math.min(1, Math.max(0, v));
  const seg = (t, a, b) => clamp((t - a) / (b - a));
  const outCubic = (x) => 1 - Math.pow(1 - x, 3);
  const inCubic = (x) => x * x * x;

  /* ── capas HTML ── */
  const $ = (s) => intro.querySelector(s);
  const flash = $('.k3-flash');
  const canvas = $('.k3-gl');

  /* ── fondo 3D: glitter ── */
  const S = { exit: 0, warp: 0 };
  let scene3d = null;
  try {
    scene3d = createScene(canvas, S, mobile);
  } catch (err) {
    // Sin WebGL: solo se abre el portal
    console.warn('[intro3d] escena 3D no disponible:', err);
  }

  /* ── coreografía (ms) ──
     Sin pausa: el túnel arranca ya en marcha desde el primer cuadro.
     0–1000: el glitter viene a toda velocidad y se estira en estelas; la cámara entra en el túnel.
     900–1700: un portal de oro rosa se abre en el centro y revela la página. */
  function update(t) {
    canvas.style.opacity = String(outCubic(seg(t, 0, 120)));
    S.warp = 0.45 + 0.55 * outCubic(seg(t, 0, 900));   // empieza rápido y sigue acelerando
    S.exit = inCubic(seg(t, 150, 1150));

    const hole = inCubic(seg(t, 900, END));
    intro.style.setProperty('--hole', `${hole * 150}vmax`);
    flash.style.opacity = t > 880 ? '1' : '0';
    if (t > 950) root.classList.remove('intro-on');
  }

  /* ── reloj ── */
  let done = false, raf = 0, last = 0, elapsed = 0, speed = 1, running = false;
  function tick(now) {
    if (!running) return;
    elapsed += Math.min(250, now - last) * speed;   // en equipos lentos avanza en tiempo real; solo recorta tirones largos
    last = now;
    if (elapsed >= END) { update(END); return finish(); }
    update(elapsed);
    raf = requestAnimationFrame(tick);
  }
  function play() { if (running || done || document.hidden) return; running = true; last = performance.now(); raf = requestAnimationFrame(tick); }
  function stop() { running = false; cancelAnimationFrame(raf); }
  const onVis = () => (document.hidden ? stop() : play());
  const skip = () => { speed = 5; };
  const onKey = (e) => { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') skip(); };

  function finish() {
    if (done) return;
    done = true;
    stop();
    document.removeEventListener('visibilitychange', onVis);
    removeEventListener('keydown', onKey);
    removeEventListener('wheel', skip);
    scene3d?.dispose();
    intro.remove();
    root.classList.remove('intro-on');
    scrollTo(0, 0);
    dispatchEvent(new Event('intro:done'));
  }

  $('.intro__skip')?.addEventListener('click', (e) => { e.stopPropagation(); skip(); });
  intro.addEventListener('pointerdown', skip);
  addEventListener('keydown', onKey);
  addEventListener('wheel', skip, { passive: true });

  // Arranca enseguida
  const start = () => {
    if (done || intro.classList.contains('is-go')) return;
    intro.classList.add('is-go');
    if (at !== null) { update(at); return; }   // revisión: cuadro congelado
    document.addEventListener('visibilitychange', onVis);
    play();
  };
  start();
}

/* ═════════ Escena WebGL: glitter de fondo ═════════
   Polvo de glitter que flota y titila en los colores de la marca, y un túnel de estelas
   para el salto final hacia el portal. */
function createScene(canvas, S, mobile) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.5 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.05, 140);
  const palette = ['#f2a7c3', '#c9c7f6', '#bfe6f2', '#e6cc95', '#f7e9f0', '#e3a58f'].map((c) => new THREE.Color(c));

  /* ── Polvo de glitter flotando ── */
  const DN = mobile ? 180 : 300;
  const dPos = new Float32Array(DN * 3), dCol = new Float32Array(DN * 3);
  for (let i = 0; i < DN; i++) {
    const r = 2.2 + Math.random() * 4.2, a = Math.random() * Math.PI * 2, y = (Math.random() - 0.5) * 6;
    dPos.set([Math.cos(a) * r, y, Math.sin(a) * r - 1], i * 3);
    const c = palette[i % palette.length];
    dCol.set([c.r, c.g, c.b], i * 3);
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dPos, 3));
  dustGeo.setAttribute('color', new THREE.BufferAttribute(dCol, 3));
  const dustMat = new THREE.PointsMaterial({ size: 0.07, map: glowTexture(), vertexColors: true, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending });
  const dust = new THREE.Points(dustGeo, dustMat);
  scene.add(dust);

  /* ── Túnel de glitter para el salto final ── */
  const N = mobile ? 500 : 850;
  const pos = new Float32Array(N * 6), col = new Float32Array(N * 6);
  const parts = [];
  const spawn = (s, anywhere) => {
    const a = Math.random() * Math.PI * 2, rad = 2.4 + Math.random() * 15;
    s.x = Math.cos(a) * rad; s.y = Math.sin(a) * rad;
    s.z = anywhere ? -70 + Math.random() * 78 : -70 - Math.random() * 10;
    s.s = 0.5 + Math.random() * 0.9;
  };
  for (let i = 0; i < N; i++) {
    const s = { x: 0, y: 0, z: 0, s: 1 };
    spawn(s, true);
    parts.push(s);
    const c = palette[i % palette.length], k = 0.45 + Math.random() * 0.55;
    col.set([c.r * k, c.g * k, c.b * k, c.r * k * 0.15, c.g * k * 0.15, c.b * k * 0.15], i * 6);
  }
  const tunGeo = new THREE.BufferGeometry();
  tunGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  tunGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const tunMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
  scene.add(new THREE.LineSegments(tunGeo, tunMat));

  /* ── puntero ── */
  let mx = 0, my = 0, tx = 0, ty = 0;
  const onMove = (e) => { tx = (e.clientX / innerWidth) * 2 - 1; ty = (e.clientY / innerHeight) * 2 - 1; };
  addEventListener('pointermove', onMove, { passive: true });

  let fit = 1;
  const resize = () => {
    const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    fit = w / h < 1 ? 1.4 : 1;
    camera.updateProjectionMatrix();
  };
  resize();
  addEventListener('resize', resize);

  const clock = new THREE.Clock();
  let raf = 0;
  const frame = () => {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    const { exit, warp } = S;
    mx += (tx - mx) * 0.05; my += (ty - my) * 0.05;

    // Polvo: gira despacio y titila; se apaga al empezar el salto
    dust.rotation.y = t * 0.08;
    dustMat.opacity = 0.9 * (1 - warp * 0.8) * (0.75 + 0.25 * Math.sin(t * 4));
    dustMat.size = 0.06 + 0.02 * Math.sin(t * 2.3);

    // Cámara
    const z = 8 * fit;
    camera.position.set(mx * 0.5, -my * 0.3, z - exit * (z + 4));
    camera.lookAt(0, 0, -exit * 6);
    camera.fov = 35 + exit * 32;
    camera.updateProjectionMatrix();

    // Túnel: casi quieto al principio, estelas largas en el salto
    tunMat.opacity = 0.45 + warp * 0.5;
    const speed = 8 + warp * 95, len = 0.18 + warp * 5;
    const camZ = camera.position.z;
    for (let i = 0; i < N; i++) {
      const s = parts[i];
      s.z += speed * s.s * dt;
      if (s.z > camZ + 1) spawn(s, false);
      pos.set([s.x, s.y, s.z, s.x, s.y, s.z - len * s.s], i * 6);
    }
    tunGeo.attributes.position.needsUpdate = true;

    renderer.render(scene, camera);
  };
  frame();

  return {
    dispose() {
      cancelAnimationFrame(raf);
      removeEventListener('pointermove', onMove);
      removeEventListener('resize', resize);
      scene.traverse((o) => {
        o.geometry?.dispose();
        const m = o.material;
        if (Array.isArray(m)) m.forEach((x) => x.dispose()); else m?.dispose();
      });
      renderer.dispose();
    },
  };
}

let glowTex = null;
function glowTexture() {
  if (glowTex) return glowTex;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.25, 'rgba(255,255,255,0.35)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  glowTex = new THREE.CanvasTexture(c);
  return glowTex;
}

/* ── arranque (al final del archivo: así todas las funciones y texturas ya están definidas) ── */
if (intro && reduced) {
  intro.remove();
  root.classList.remove('intro-on');
  dispatchEvent(new Event('intro:done'));
} else if (intro) {
  run();
}

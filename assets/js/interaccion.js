/* ═════════ Katy Cardona Nails — capa interactiva ═════════
   GSAP + ScrollTrigger (revelados y parallax), Lenis (scroll suave),
   inclinación 3D de tarjetas, botones magnéticos, cursor con aura y menú activo.
   Todo se desactiva si el sistema pide "reducir movimiento". */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const lerp = (a, b, t) => a + (b - a) * t;

  /* ── menú: indicador de la sección visible ── */
  const links = $$('.nav__links a');
  const box = $('.nav__links');
  if (box && links.length) {
    const pill = document.createElement('span');
    pill.className = 'nav__pill';
    box.prepend(pill);
    const place = a => {
      links.forEach(l => l.classList.toggle('is-active', l === a));
      if (!a) { pill.classList.remove('is-on'); return; }
      pill.style.left = (a.offsetLeft - 10) + 'px';
      pill.style.width = (a.offsetWidth + 20) + 'px';
      pill.classList.add('is-on');
    };
    const targets = links.map(a => $(a.getAttribute('href'))).filter(Boolean);
    const spy = new IntersectionObserver(es => {
      es.forEach(e => {
        if (e.isIntersecting) place(links.find(a => a.getAttribute('href') === '#' + e.target.id));
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    targets.forEach(t => spy.observe(t));
  }

  if (reduce) return;

  /* ── scroll suave (Lenis) sincronizado con GSAP ── */
  let lenis = null;
  if (window.Lenis) {
    lenis = new Lenis({ duration: 1.15, smoothWheel: true, wheelMultiplier: .95 });
    if (window.gsap && window.ScrollTrigger) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(t => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = t => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
    // anclas internas con desplazamiento suave
    $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const t = $(id);
      if (!t) return;
      e.preventDefault();
      lenis.scrollTo(t, { offset: -80 });
    }));
  }

  /* ── inclinación 3D de tarjetas con brillo que sigue al puntero ── */
  if (fine) {
    $$('[data-tilt]').forEach(el => {
      const glare = document.createElement('span');
      glare.className = 'glare';
      el.appendChild(glare);
      const max = el.matches('.work, .ins') ? 7 : 9;
      let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0, on = false;
      const tick = () => {
        cx = lerp(cx, tx, .14); cy = lerp(cy, ty, .14);
        el.style.setProperty('--rx', (-cy * max).toFixed(2) + 'deg');
        el.style.setProperty('--ry', (cx * max).toFixed(2) + 'deg');
        if (on || Math.abs(cx) > .002 || Math.abs(cy) > .002) raf = requestAnimationFrame(tick);
        else { raf = 0; el.style.removeProperty('--rx'); el.style.removeProperty('--ry'); }
      };
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        tx = px * 2 - 1; ty = py * 2 - 1;
        el.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
        el.style.setProperty('--my', (py * 100).toFixed(1) + '%');
        if (!raf) raf = requestAnimationFrame(tick);
      });
      el.addEventListener('pointerenter', () => { on = true; el.style.setProperty('--go', 1); });
      el.addEventListener('pointerleave', () => { on = false; tx = ty = 0; el.style.setProperty('--go', 0); if (!raf) raf = requestAnimationFrame(tick); });
    });

    /* ── botones magnéticos ── */
    $$('.btn').forEach(b => {
      b.addEventListener('pointermove', e => {
        const r = b.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) * .22, y = (e.clientY - r.top - r.height / 2) * .32;
        b.style.translate = `${x.toFixed(1)}px ${y.toFixed(1)}px`;
      });
      b.addEventListener('pointerleave', () => { b.style.translate = '0 0'; });
    });

    /* ── cursor con aura (crece sobre fotos y enlaces) ── */
    const cur = document.createElement('div');
    cur.className = 'cursor';
    cur.innerHTML = '<b></b>';
    document.body.appendChild(cur);
    const label = cur.firstChild;
    let mx = innerWidth / 2, my = innerHeight / 2, x = mx, y = my;
    addEventListener('pointermove', e => { mx = e.clientX; my = e.clientY; cur.classList.add('is-on'); }, { passive: true });
    document.addEventListener('pointerleave', () => cur.classList.remove('is-on'));
    const loop = () => { x = lerp(x, mx, .2); y = lerp(y, my, .2); cur.style.transform = `translate3d(${x}px,${y}px,0)`; requestAnimationFrame(loop); };
    loop();
    document.addEventListener('pointerover', e => {
      const t = e.target.closest('.work img, .work video, .ins, .hero__video, .hero__detail, a, button');
      const big = !!t && !!t.closest('.work, .ins, .hero__video, .hero__detail');
      cur.classList.toggle('is-big', big);
      label.textContent = t?.closest('.ins') ? 'Lo quiero' : big ? 'Ver' : '';
    });

    /* ── portada: capas con profundidad que siguen al puntero ── */
    const hero = $('.hero__main');
    const layers = hero ? $$('[data-depth]', hero) : [];
    if (hero && layers.length) {
      let hx = 0, hy = 0, gx = 0, gy = 0;
      hero.addEventListener('pointermove', e => {
        const r = hero.getBoundingClientRect();
        hx = (e.clientX - r.left) / r.width - .5; hy = (e.clientY - r.top) / r.height - .5;
      });
      hero.addEventListener('pointerleave', () => { hx = hy = 0; });
      const step = () => {
        gx = lerp(gx, hx, .08); gy = lerp(gy, hy, .08);
        layers.forEach(l => { const d = +l.dataset.depth; l.style.transform = `translate3d(${(gx * d).toFixed(2)}px,${(gy * d).toFixed(2)}px,0)`; });
        requestAnimationFrame(step);
      };
      step();
    }
  }

  /* ── GSAP: títulos palabra por palabra en 3D, parallax y cinta con inercia ── */
  if (!(window.gsap && window.ScrollTrigger)) return;
  gsap.registerPlugin(ScrollTrigger);

  const splitWords = el => {
    // conserva <em>, <span class="kicker"> y demás: solo parte los nodos de texto
    const walk = node => {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 3 && n.textContent.trim()) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            const w = document.createElement('span'); w.className = 'wsplit';
            const i = document.createElement('span'); i.textContent = part;
            w.appendChild(i); frag.appendChild(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && !n.classList.contains('kicker')) walk(n);
      });
    };
    walk(el);
    return $$('.wsplit > span', el);
  };

  document.fonts.ready.then(() => {
    $$('.h2').forEach(h => {
      h.removeAttribute('data-reveal'); // GSAP toma el control de estos títulos
      h.style.clipPath = 'none';
      const words = splitWords(h);
      gsap.from(words, {
        yPercent: 110, rotationX: -75, opacity: 0, transformOrigin: '50% 100%',
        duration: 1, ease: 'power4.out', stagger: .06,
        scrollTrigger: { trigger: h, start: 'top 85%', once: true },
      });
    });

    // celular (sin puntero): las tarjetas se inclinan en 3D mientras pasan por la pantalla
    if (!fine) {
      $$('[data-tilt]').filter(el => !el.closest('.gallery')).forEach(el => {
        ScrollTrigger.create({
          trigger: el, start: 'top bottom', end: 'bottom top',
          onUpdate: self => el.style.setProperty('--sx', ((.5 - self.progress) * 22).toFixed(2) + 'deg'),
        });
      });
    }

    // parallax suave dentro de las fotos
    $$('.ins img, .svc__pic img, .step .photo img').forEach(img => {
      gsap.fromTo(img, { yPercent: -6 }, {
        yPercent: 6, ease: 'none',
        scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true },
      });
    });

    // la cinta de técnicas se inclina con la velocidad del scroll
    const mq = $('.marquee');
    if (mq) {
      const skewTo = gsap.quickTo(mq, 'skewY', { duration: .5, ease: 'power3' });
      let rest = 0;
      ScrollTrigger.create({
        trigger: mq, start: 'top bottom', end: 'bottom top',
        onUpdate: self => {
          skewTo(gsap.utils.clamp(-4, 4, self.getVelocity() / -400));
          clearTimeout(rest); rest = setTimeout(() => skewTo(0), 140); // vuelve recta al parar
        },
      });
    }

    // números de los pasos: giran en 3D al entrar
    $$('.step__n').forEach(n => {
      gsap.from(n, { rotationY: -90, opacity: 0, transformPerspective: 600, duration: 1.2, ease: 'power3.out', scrollTrigger: { trigger: n, start: 'top 80%', once: true } });
    });

    // nombre final "Katy." con profundidad al hacer scroll
    const word = $('.closing__word');
    if (word) gsap.fromTo(word, { rotationX: 35, transformPerspective: 900, transformOrigin: '50% 100%' }, { rotationX: 0, ease: 'none', scrollTrigger: { trigger: '#closing', start: 'top bottom', end: 'center center', scrub: true } });

    ScrollTrigger.refresh();
  });
})();

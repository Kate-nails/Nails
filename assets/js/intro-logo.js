/* Intro: el logo real, nítido, sobre negro. Entra, se queda un momento y deja ver la página. */
(() => {
  const intro = document.getElementById('intro');
  if (!intro) return;
  const root = document.documentElement;
  const img = intro.querySelector('.intro__logo');
  const mq = matchMedia('(prefers-reduced-motion: reduce)');
  root.classList.add('intro-on');

  let done = false;
  const finish = fast => {
    if (done) return;
    done = true;
    const fade = intro.animate(
      [{ opacity: 1 }, { opacity: 0 }],
      { duration: fast ? 280 : 560, easing: 'ease', fill: 'forwards' }
    );
    fade.onfinish = () => {
      intro.remove();
      root.classList.remove('intro-on');
      scrollTo(0, 0);
      dispatchEvent(new Event('intro:done'));
    };
  };

  intro.querySelector('.intro__skip').addEventListener('click', () => finish(true));
  addEventListener('keydown', e => { if (e.key === 'Escape') finish(true); });

  const show = () => {
    if (done) return;
    intro.classList.add('is-go');
    setTimeout(() => finish(false), mq.matches ? 900 : 2400);
  };

  if (img.complete && img.naturalWidth) show();
  else {
    img.addEventListener('load', show, { once: true });
    img.addEventListener('error', () => finish(true), { once: true });
  }
})();

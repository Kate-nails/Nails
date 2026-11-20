/* ═════════ Frasco de esmalte en 3D (Three.js) para la portada ═════════
   Vidrio físico con transmisión, esmalte que cambia entre los tonos de Katy,
   tapa brillante y luz de estudio. Se inclina con el puntero y flota suave.
   No se carga con "reducir movimiento". En celular gira con el scroll. */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const canvas = document.getElementById('hero3d');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
if (canvas && !reduce) init();

function init() {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 760 ? 1.5 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), .04).texture;

  const camera = new THREE.PerspectiveCamera(30, 1, .1, 50);
  camera.position.set(0, .35, 7.2);

  /* ── frasco ── */
  const rig = new THREE.Group();
  scene.add(rig);

  // vidrio
  const glass = new THREE.Mesh(
    new RoundedBoxGeometry(1.5, 1.5, 1.05, 6, .2),
    new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 1, thickness: .9, roughness: .04, ior: 1.5, clearcoat: 1, clearcoatRoughness: .05, attenuationColor: new THREE.Color('#ffe9f1'), attenuationDistance: 3, envMapIntensity: 1.2 })
  );
  glass.position.y = -.35;
  rig.add(glass);

  // esmalte (líquido)
  const liqMat = new THREE.MeshPhysicalMaterial({ color: '#f2a7c3', roughness: .18, clearcoat: 1, clearcoatRoughness: .1, sheen: .4, envMapIntensity: .9 });
  const liquid = new THREE.Mesh(new RoundedBoxGeometry(1.26, 1.06, .82, 6, .16), liqMat);
  liquid.position.y = -.5;
  rig.add(liquid);

  // cuello y tapa
  const dark = new THREE.MeshPhysicalMaterial({ color: '#17111a', roughness: .22, metalness: .1, clearcoat: 1, clearcoatRoughness: .08, envMapIntensity: 1.4 });
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(.26, .3, .22, 48), new THREE.MeshPhysicalMaterial({ color: '#ffffff', transmission: 1, thickness: .3, roughness: .05, ior: 1.5 }));
  neck.position.y = .5;
  rig.add(neck);
  const cap = new THREE.Mesh(new RoundedBoxGeometry(.58, 1.15, .58, 5, .1), dark);
  cap.position.y = 1.18;
  rig.add(cap);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.31, .03, 16, 64), new THREE.MeshStandardMaterial({ color: '#e6cc95', metalness: 1, roughness: .2 }));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = .62;
  rig.add(ring);

  // brillo de estudio y sombra suave
  const key = new THREE.DirectionalLight('#ffffff', 2.2); key.position.set(-3, 4, 5); scene.add(key);
  const rim = new THREE.DirectionalLight('#c9c7f6', 2.6); rim.position.set(4, 2, -3); scene.add(rim);
  const pink = new THREE.PointLight('#f2a7c3', 6, 8); pink.position.set(2, -1.5, 2); scene.add(pink);
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(1.1, 48), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: .35, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = -1.18; shadow.scale.set(1, .45, 1);
  scene.add(shadow);

  rig.rotation.set(.12, -.55, .08);
  rig.position.x = .15;

  /* ── colores de Katy que va recorriendo ── */
  const shades = ['#f2a7c3', '#7b1a2f', '#c9c8f2', '#e9b3a6', '#c0142b', '#17141a', '#f28bb0'].map(c => new THREE.Color(c));
  let si = 0, mixT = 1;
  const from = new THREE.Color(), to = new THREE.Color();
  const nextShade = () => { from.copy(liqMat.color); si = (si + 1) % shades.length; to.copy(shades[si]); mixT = 0; };
  setInterval(nextShade, 3200);

  /* ── puntero ── */
  let px = 0, py = 0, cx = 0, cy = 0;
  const hero = canvas.closest('.hero__main') || document.body;
  hero.addEventListener('pointermove', e => {
    const r = hero.getBoundingClientRect();
    px = (e.clientX - r.left) / r.width - .5; py = (e.clientY - r.top) / r.height - .5;
  });
  hero.addEventListener('pointerleave', () => { px = py = 0; });

  /* ── tamaño ── */
  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const s = Math.min(1, w / h * .95);
    rig.scale.setScalar(s); shadow.scale.set(s, .45 * s, 1);
  };
  new ResizeObserver(resize).observe(canvas);
  resize();

  /* ── animar solo cuando la portada está a la vista ── */
  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(canvas);

  const clock = new THREE.Clock();
  const loop = () => {
    requestAnimationFrame(loop);
    if (!visible) return;
    const t = clock.getElapsedTime(), dt = Math.min(clock.getDelta(), .05);
    cx += (px - cx) * .06; cy += (py - cy) * .06;
    const sc = Math.min(1, scrollY / 600); // en celular (sin puntero) el scroll lo hace girar
    rig.rotation.y = -.55 + Math.sin(t * .35) * .35 + cx * .9 + sc * 1.6;
    rig.rotation.x = .12 + cy * .45;
    rig.rotation.z = .08 + Math.sin(t * .6) * .03;
    rig.position.y = Math.sin(t * 1.1) * .08;
    shadow.material.opacity = .3 - rig.position.y * .6;
    if (mixT < 1) { mixT = Math.min(1, mixT + .022); liqMat.color.copy(from).lerp(to, mixT * mixT * (3 - 2 * mixT)); pink.color.copy(liqMat.color).lerp(new THREE.Color('#ffffff'), .35); }
    renderer.render(scene, camera);
  };
  loop();
  canvas.classList.add('is-on');
}

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 5000);
camera.position.set(0, 52, 128);

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.minDistance = 3.5;
controls.maxDistance = 360;

// Subtle Sci-Fi UI Sound (Web Audio API — no external files needed)
let audioCtx = null;
let soundEnabled = true;
function playBeep(freq = 520, duration = 0.08) {
  if (!soundEnabled) return;
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
  gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}
function toggleSound() {
  soundEnabled = !soundEnabled;
  document.getElementById('soundBtn').textContent = soundEnabled ? '🔊' : '🔇';
  playBeep(680, 0.09);
}

// Deterministic Noise & FBM for Continents, Craters, Storms & City Lights
function hash2(x, y) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return s - Math.floor(s);
}
function noise2(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy), b = hash2(ix + 1, iy);
  const c = hash2(ix, iy + 1), d = hash2(ix + 1, iy + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}
function fbm(x, y, oct = 5) {
  let sum = 0, amp = 0.5, freq = 1;
  for (let i = 0; i < oct; i++) {
    sum += amp * noise2(x * freq, y * freq);
    freq *= 2.04;
    amp *= 0.5;
  }
  return sum;
}

function makeTexture(kind) {
  const w = 512, h = 256;
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(w, h);

  if (kind === 'clouds') {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const n = fbm((x / w) * 9, (y / h) * 4.5, 5);
        const alpha = n > 0.54 ? Math.min(235, (n - 0.54) * 950) : 0;
        const i = (y * w + x) * 4;
        img.data[i] = 255; img.data[i + 1] = 255; img.data[i + 2] = 255; img.data[i + 3] = alpha;
      }
    }
    ctx.putImageData(img, 0, 0);
    return new THREE.CanvasTexture(canvas);
  }

  if (kind === 'cityLights') {
    for (let y = 0; y < h; y++) {
      const lat = Math.abs((y / h) - 0.5) * 2;
      for (let x = 0; x < w; x++) {
        const u = (x / w) * 6, v = (y / h) * 3;
        const land = fbm(u, v, 5);
        const cluster = noise2(u * 14, v * 14);
        const spark = hash2(x * 1.7, y * 2.3);
        const i = (y * w + x) * 4;
        const isLit = land > 0.525 && lat < 0.72 && cluster > 0.56 && spark > 0.72;
        if (isLit) {
          img.data[i] = 255; img.data[i + 1] = 204; img.data[i + 2] = 92; img.data[i + 3] = 230;
        } else {
          img.data[i + 3] = 0;
        }
      }
    }
    ctx.putImageData(img, 0, 0);
    return new THREE.CanvasTexture(canvas);
  }

  for (let y = 0; y < h; y++) {
    const lat = Math.abs((y / h) - 0.5) * 2;
    for (let x = 0; x < w; x++) {
      const u = (x / w) * 6, v = (y / h) * 3;
      const n = fbm(u, v, 5);
      const i = (y * w + x) * 4;
      let r = 128, g = 128, b = 128;

      if (kind === 'earth') {
        if (lat > 0.85 - n * 0.08) {
          r = 242; g = 248; b = 255;
        } else if (n < 0.51) {
          const d = n / 0.51;
          r = 7 + d * 16; g = 42 + d * 88; b = 120 + d * 105;
        } else if (n < 0.535) {
          r = 198; g = 180; b = 132;
        } else if (n > 0.73) {
          r = 112; g = 106; b = 102;
        } else {
          const dry = Math.max(0, 1 - Math.abs(lat - 0.24) * 4) * (1 - n);
          r = 32 + dry * 160; g = 122 + dry * 32 - (n - 0.535) * 85; b = 44 + dry * 28;
        }
      } else if (kind === 'moon' || kind === 'mercury') {
        const cr = noise2(u * 6.5, v * 6.5);
        const base = (kind === 'moon' ? 148 : 118) + (n - 0.5) * 75 - (cr < 0.27 ? 35 : 0);
        r = base; g = base; b = base + 4;
      } else if (kind === 'venus') {
        const wave = Math.sin(v * 7 + n * 4) * 0.5 + 0.5;
        r = 216 + wave * 24; g = 164 + wave * 35; b = 82 + wave * 20;
      } else if (kind === 'mars') {
        const dark = n < 0.47 ? 0.62 : 1.0;
        r = (192 + n * 46) * dark; g = (80 + n * 35) * dark; b = (46 + n * 20) * dark;
      } else if (kind === 'jupiter') {
        const band = Math.sin(v * 14 + n * 3.8);
        r = 196 + band * 36; g = 150 + band * 32; b = 110 + band * 24;
        const dx = (x - 320) / 26, dy = (y - 165) / 14;
        if (dx * dx + dy * dy < 1) { r = 195; g = 68; b = 45; }
      } else if (kind === 'saturn') {
        const band = Math.sin(v * 12 + n * 2.2);
        r = 224 + band * 20; g = 196 + band * 20; b = 140 + band * 16;
      } else if (kind === 'uranus') {
        const band = Math.sin(v * 8 + n * 1.5);
        r = 112 + band * 20; g = 206 + band * 22; b = 228 + band * 18;
      } else if (kind === 'neptune') {
        const storm = Math.sin(v * 10 + n * 4);
        r = 36 + storm * 18; g = 84 + storm * 28; b = 208 + storm * 35;
      }

      img.data[i] = Math.max(0, Math.min(255, r));
      img.data[i + 1] = Math.max(0, Math.min(255, g));
      img.data[i + 2] = Math.max(0, Math.min(255, b));
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return new THREE.CanvasTexture(canvas);
}

// Multi-color Starfield
const starGeo = new THREE.BufferGeometry();
const starPos = new Float32Array(7500 * 3);
const starCol = new Float32Array(7500 * 3);
for (let i = 0; i < 7500; i++) {
  starPos[i * 3] = (Math.random() - 0.5) * 2600;
  starPos[i * 3 + 1] = (Math.random() - 0.5) * 2600;
  starPos[i * 3 + 2] = (Math.random() - 0.5) * 2600;
  const c = new THREE.Color().setHSL(Math.random() * 0.15 + 0.55, 0.35, 0.8 + Math.random() * 0.2);
  starCol[i * 3] = c.r; starCol[i * 3 + 1] = c.g; starCol[i * 3 + 2] = c.b;
}
starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
starGeo.setAttribute('color', new THREE.BufferAttribute(starCol, 3));
scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ size: 1.15, vertexColors: true })));

// Sun + Corona + Light
const sun = new THREE.Mesh(
  new THREE.SphereGeometry(9.8, 48, 48),
  new THREE.MeshBasicMaterial({ color: 0xffb703 })
);
const sunCorona = new THREE.Mesh(
  new THREE.SphereGeometry(12.2, 36, 36),
  new THREE.MeshBasicMaterial({ color: 0xfb8500, transparent: true, opacity: 0.22 })
);
scene.add(sun, sunCorona);
scene.add(new THREE.PointLight(0xfff7e6, 2.8, 1200));
scene.add(new THREE.AmbientLight(0x1e293b, 0.85));

const planetData = [
  { key: 'mercury', name: 'Mercury', type: 'TERRESTRIAL', r: 1.15, dist: 16, speed: 0.018, distTxt: '57.9M km', gravTxt: '3.7 m/s²', tempTxt: '167°C', moonsTxt: '0', desc: 'Smallest, innermost planet with heavily cratered silicate terrain.' },
  { key: 'venus',   name: 'Venus',   type: 'TERRESTRIAL', r: 1.85, dist: 23, speed: 0.013, distTxt: '108.2M km', gravTxt: '8.87 m/s²', tempTxt: '464°C', moonsTxt: '0', desc: 'Shrouded in thick sulfuric acid clouds with runaway greenhouse heat.' },
  { key: 'earth',   name: 'Earth',   type: 'OCEAN WORLD', r: 2.25, dist: 32, speed: 0.010, distTxt: '149.6M km', gravTxt: '9.81 m/s²', tempTxt: '15°C', moonsTxt: '1 + ISS', desc: 'Liquid water oceans, dynamic weather clouds, city lights, Moon & ISS.', earthExtras: true },
  { key: 'mars',    name: 'Mars',    type: 'TERRESTRIAL', r: 1.55, dist: 41, speed: 0.008, distTxt: '227.9M km', gravTxt: '3.72 m/s²', tempTxt: '-65°C', moonsTxt: '2', desc: 'Iron-oxide desert world home to Olympus Mons and vast canyons.' },
  { key: 'jupiter', name: 'Jupiter', type: 'GAS GIANT',   r: 4.8,  dist: 57, speed: 0.0055, distTxt: '778.5M km', gravTxt: '24.79 m/s²', tempTxt: '-110°C', moonsTxt: '95 (4 shown)', desc: 'Massive hydrogen-helium giant with banded storms and Galilean moons.', jupiterMoons: true },
  { key: 'saturn',  name: 'Saturn',  type: 'GAS GIANT',   r: 3.9,  dist: 75, speed: 0.004, distTxt: '1.43B km', gravTxt: '10.44 m/s²', tempTxt: '-140°C', moonsTxt: '146', desc: 'Adorned with bright icy rings made of billions of ring particles.', saturnRings: true },
  { key: 'uranus',  name: 'Uranus',  type: 'ICE GIANT',   r: 2.75, dist: 91, speed: 0.003, distTxt: '2.87B km', gravTxt: '8.69 m/s²', tempTxt: '-195°C', moonsTxt: '28', desc: 'Extreme axial tilt rolls this cyan ice giant sideways around the Sun.' },
  { key: 'neptune', name: 'Neptune', type: 'ICE GIANT',   r: 2.65, dist: 106, speed: 0.0024, distTxt: '4.50B km', gravTxt: '11.15 m/s²', tempTxt: '-200°C', moonsTxt: '16', desc: 'Distant deep-blue world swept by supersonic winds.' }
];

const clickableMeshes = [];
const planets = planetData.map(cfg => {
  const tex = makeTexture(cfg.key);
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(cfg.r, 48, 48),
    new THREE.MeshStandardMaterial({ map: tex, bumpMap: tex, bumpScale: 0.07, roughness: 0.76 })
  );
  mesh.userData.planetCfg = cfg;
  clickableMeshes.push(mesh);

  let clouds = null, moon = null, iss = null, moonsList = [];

  if (cfg.earthExtras) {
    clouds = new THREE.Mesh(
      new THREE.SphereGeometry(cfg.r * 1.022, 40, 40),
      new THREE.MeshStandardMaterial({ map: makeTexture('clouds'), transparent: true, opacity: 0.85, depthWrite: false })
    );
    const cityLights = new THREE.Mesh(
      new THREE.SphereGeometry(cfg.r * 1.006, 40, 40),
      new THREE.MeshBasicMaterial({ map: makeTexture('cityLights'), transparent: true, depthWrite: false })
    );
    const atmo = new THREE.Mesh(
      new THREE.SphereGeometry(cfg.r * 1.07, 36, 36),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.18 })
    );
    mesh.add(clouds, cityLights, atmo);

    moon = new THREE.Mesh(
      new THREE.SphereGeometry(0.55, 24, 24),
      new THREE.MeshStandardMaterial({ map: makeTexture('moon'), bumpMap: makeTexture('moon'), bumpScale: 0.05, roughness: 0.9 })
    );
    iss = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.08, 0.12),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    scene.add(moon, iss);
  }

  if (cfg.jupiterMoons) {
    [3.4, 4.3, 5.4, 6.6].forEach((orbR, idx) => {
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(0.26 + idx * 0.05, 16, 16),
        new THREE.MeshStandardMaterial({ color: [0xfacc15, 0xe2e8f0, 0xcbd5e1, 0x94a3b8][idx] })
      );
      scene.add(m);
      moonsList.push({ mesh: m, orbR, speed: 0.06 - idx * 0.01, angle: idx * 1.5 });
    });
  }

  if (cfg.saturnRings) {
    const innerRing = new THREE.Mesh(
      new THREE.RingGeometry(cfg.r * 1.32, cfg.r * 1.82, 72),
      new THREE.MeshBasicMaterial({ color: 0xe6cfa1, side: THREE.DoubleSide, transparent: true, opacity: 0.78 })
    );
    const outerRing = new THREE.Mesh(
      new THREE.RingGeometry(cfg.r * 1.92, cfg.r * 2.42, 72),
      new THREE.MeshBasicMaterial({ color: 0xcab082, side: THREE.DoubleSide, transparent: true, opacity: 0.55 })
    );
    innerRing.rotation.x = Math.PI / 2.25;
    outerRing.rotation.x = Math.PI / 2.25;
    mesh.add(innerRing, outerRing);
  }

  const orbitRing = new THREE.Mesh(
    new THREE.RingGeometry(cfg.dist - 0.12, cfg.dist + 0.12, 140),
    new THREE.MeshBasicMaterial({ color: 0x1e293b, side: THREE.DoubleSide })
  );
  orbitRing.rotation.x = Math.PI / 2;
  scene.add(orbitRing, mesh);

  return { ...cfg, mesh, clouds, moon, iss, moonsList, angle: Math.random() * Math.PI * 2, moonAngle: 0, issAngle: 1.2 };
});

// Asteroid Belt
const beltGeo = new THREE.BufferGeometry();
const beltPos = new Float32Array(1400 * 3);
for (let i = 0; i < 1400; i++) {
  const a = Math.random() * Math.PI * 2;
  const rad = 46.5 + (Math.random() - 0.5) * 4.5;
  beltPos[i * 3] = Math.cos(a) * rad;
  beltPos[i * 3 + 1] = (Math.random() - 0.5) * 1.6;
  beltPos[i * 3 + 2] = Math.sin(a) * rad;
}
beltGeo.setAttribute('position', new THREE.BufferAttribute(beltPos, 3));
const asteroidBelt = new THREE.Points(beltGeo, new THREE.PointsMaterial({ color: 0x94a3b8, size: 0.36 }));
scene.add(asteroidBelt);

// UI Controls & Selection
let paused = false;
let speedMult = 1.0;
let activePlanet = null;
let topMode = false;

function togglePause() {
  paused = !paused;
  document.getElementById('pauseBtn').textContent = paused ? '▶ Resume' : '⏸ Pause';
  playBeep(460, 0.08);
}
function updateSpeed(val) {
  speedMult = parseFloat(val);
  document.getElementById('speedVal').textContent = `${speedMult.toFixed(1)}x`;
}
function topDownView() {
  activePlanet = null;
  topMode = true;
  document.getElementById('infoCard').classList.add('hidden');
  document.querySelectorAll('.planet-dock button').forEach(b => b.classList.remove('active'));
  playBeep(600, 0.08);
}
function resetCamera() {
  activePlanet = null;
  topMode = false;
  document.getElementById('infoCard').classList.add('hidden');
  document.querySelectorAll('.planet-dock button').forEach(b => b.classList.remove('active'));
  playBeep(500, 0.08);
}
function takeScreenshot() {
  playBeep(880, 0.1);
  renderer.render(scene, camera);
  const link = document.createElement('a');
  link.download = 'aetheris-3d-snapshot.png';
  link.href = renderer.domElement.toDataURL('image/png');
  link.click();
}

function selectPlanet(cfg, btnEl = null) {
  activePlanet = planets.find(p => p.name === cfg.name);
  topMode = false;
  playBeep(740, 0.09);

  document.querySelectorAll('.planet-dock button').forEach(b => b.classList.remove('active'));
  if (btnEl) {
    btnEl.classList.add('active');
  } else {
    const match = [...document.querySelectorAll('.planet-dock button')].find(b => b.textContent === cfg.name);
    if (match) match.classList.add('active');
  }

  document.getElementById('cardType').textContent = cfg.type;
  document.getElementById('cardName').textContent = cfg.name;
  document.getElementById('cardDesc').textContent = cfg.desc;
  document.getElementById('statDist').textContent = cfg.distTxt;
  document.getElementById('statGrav').textContent = cfg.gravTxt;
  document.getElementById('statTemp').textContent = cfg.tempTxt;
  document.getElementById('statMoons').textContent = cfg.moonsTxt;
  document.getElementById('infoCard').classList.remove('hidden');
}

const dock = document.getElementById('planetDock');
planets.forEach(p => {
  const btn = document.createElement('button');
  btn.textContent = p.name;
  btn.onclick = () => selectPlanet(p, btn);
  dock.appendChild(btn);
});

// Direct 3D Click on Planets
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let downX = 0, downY = 0;
renderer.domElement.addEventListener('pointerdown', e => { downX = e.clientX; downY = e.clientY; });
renderer.domElement.addEventListener('pointerup', e => {
  if (Math.hypot(e.clientX - downX, e.clientY - downY) > 6) return;
  pointer.x = (e.clientX / innerWidth) * 2 - 1;
  pointer.y = -(e.clientY / innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(clickableMeshes)[0];
  if (hit && hit.object.userData.planetCfg) {
    selectPlanet(hit.object.userData.planetCfg);
  }
});

function animate() {
  requestAnimationFrame(animate);
  const step = paused ? 0 : speedMult;

  sun.rotation.y += 0.0025 * (step || 0.2);
  sunCorona.scale.setScalar(1 + Math.sin(performance.now() * 0.003) * 0.025);
  asteroidBelt.rotation.y += 0.0012 * step;

  planets.forEach(p => {
    p.angle += p.speed * step;
    p.mesh.rotation.y += 0.012 * (step || 0.2);
    if (p.clouds) p.clouds.rotation.y += 0.018 * (step || 0.2);
    p.mesh.position.set(Math.cos(p.angle) * p.dist, 0, Math.sin(p.angle) * p.dist);

    if (p.moon) {
      p.moonAngle += 0.045 * step;
      p.moon.position.set(
        p.mesh.position.x + Math.cos(p.moonAngle) * 4.2,
        Math.sin(p.moonAngle * 0.5) * 0.55,
        p.mesh.position.z + Math.sin(p.moonAngle) * 4.2
      );
      p.moon.rotation.y += 0.01;
    }
    if (p.iss) {
      p.issAngle += 0.11 * (step || 0.4);
      p.iss.position.set(
        p.mesh.position.x + Math.cos(p.issAngle) * 2.85,
        Math.cos(p.issAngle) * 0.65,
        p.mesh.position.z + Math.sin(p.issAngle) * 2.85
      );
      p.iss.rotation.y = -p.issAngle;
    }
    if (p.moonsList.length) {
      p.moonsList.forEach(m => {
        m.angle += m.speed * step;
        m.mesh.position.set(
          p.mesh.position.x + Math.cos(m.angle) * m.orbR,
          Math.sin(m.angle * 0.7) * 0.35,
          p.mesh.position.z + Math.sin(m.angle) * m.orbR
        );
      });
    }
  });

  if (activePlanet) {
    const pos = activePlanet.mesh.position;
    controls.target.lerp(pos, 0.08);
    const desired = new THREE.Vector3(
      pos.x + activePlanet.r * 3.8,
      pos.y + activePlanet.r * 1.8,
      pos.z + activePlanet.r * 3.8
    );
    camera.position.lerp(desired, 0.045);
  } else if (topMode) {
    controls.target.lerp(new THREE.Vector3(0, 0, 0), 0.06);
    camera.position.lerp(new THREE.Vector3(0, 175, 0.01), 0.04);
  } else {
    controls.target.lerp(new THREE.Vector3(0, 0, 0), 0.06);
  }

  controls.update();
  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

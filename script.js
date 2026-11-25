const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(52, innerWidth / innerHeight, 0.1, 4000);
camera.position.set(0, 46, 118);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.minDistance = 4;
controls.maxDistance = 320;

// Pseudo-random helper for deterministic continents & craters
function hash2(x, y) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return s - Math.floor(s);
}
function smoothNoise(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy), b = hash2(ix + 1, iy);
  const c = hash2(ix, iy + 1), d = hash2(ix + 1, iy + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}
function fbm(x, y, oct = 5) {
  let val = 0, amp = 0.5, freq = 1;
  for (let i = 0; i < oct; i++) {
    val += amp * smoothNoise(x * freq, y * freq);
    freq *= 2.05;
    amp *= 0.5;
  }
  return val;
}

function buildTexture(key) {
  const w = 512, h = 256;
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(w, h);

  if (key === 'clouds') {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const n = fbm((x / w) * 8, (y / h) * 4, 5);
        const alpha = n > 0.54 ? Math.min(230, (n - 0.54) * 900) : 0;
        const idx = (y * w + x) * 4;
        img.data[idx] = 255;
        img.data[idx + 1] = 255;
        img.data[idx + 2] = 255;
        img.data[idx + 3] = alpha;
      }
    }
    ctx.putImageData(img, 0, 0);
    return new THREE.CanvasTexture(canvas);
  }

  for (let y = 0; y < h; y++) {
    const lat = Math.abs((y / h) - 0.5) * 2; // 0 equator, 1 poles
    for (let x = 0; x < w; x++) {
      const u = (x / w) * 6;
      const v = (y / h) * 3;
      const n = fbm(u, v, 5);
      const idx = (y * w + x) * 4;
      let r = 120, g = 120, b = 120;

      if (key === 'earth') {
        if (lat > 0.86 - n * 0.08) {
          r = 240; g = 248; b = 255; // polar ice
        } else if (n < 0.51) {
          // deep & shallow ocean
          const depth = n / 0.51;
          r = 8 + depth * 18;
          g = 45 + depth * 85;
          b = 125 + depth * 95;
        } else if (n < 0.54) {
          r = 194; g = 178; b = 128; // coastline / sand
        } else if (n > 0.72) {
          r = 110; g = 105; b = 100; // mountain peaks
        } else {
          // lush green to arid belt
          const arid = Math.max(0, 1 - Math.abs(lat - 0.25) * 4) * (1 - n);
          r = 34 + arid * 155;
          g = 120 + arid * 35 - (n - 0.54) * 90;
          b = 45 + arid * 30;
        }
      } else if (key === 'moon' || key === 'mercury') {
        const crater = smoothNoise(u * 6, v * 6);
        const base = (key === 'moon' ? 145 : 118) + (n - 0.5) * 75 - (crater < 0.28 ? 35 : 0);
        r = base; g = base; b = base + (key === 'mercury' ? 5 : 2);
      } else if (key === 'venus') {
        const band = Math.sin(v * 7 + n * 4) * 0.5 + 0.5;
        r = 215 + band * 25; g = 165 + band * 35; b = 85 + band * 20;
      } else if (key === 'mars') {
        const dark = n < 0.48 ? 0.65 : 1.0;
        r = (188 + n * 45) * dark;
        g = (82 + n * 35) * dark;
        b = (48 + n * 20) * dark;
      } else if (key === 'jupiter') {
        const stripe = Math.sin(v * 14 + n * 3.5);
        r = 195 + stripe * 35;
        g = 152 + stripe * 32;
        b = 112 + stripe * 25;
      } else if (key === 'saturn') {
        const stripe = Math.sin(v * 12 + n * 2);
        r = 222 + stripe * 20;
        g = 196 + stripe * 22;
        b = 142 + stripe * 18;
      } else if (key === 'uranus') {
        const stripe = Math.sin(v * 8 + n * 1.5);
        r = 115 + stripe * 20;
        g = 205 + stripe * 22;
        b = 228 + stripe * 18;
      } else if (key === 'neptune') {
        const storm = Math.sin(v * 10 + n * 4);
        r = 38 + storm * 18;
        g = 86 + storm * 28;
        b = 205 + storm * 35;
      }

      img.data[idx] = Math.max(0, Math.min(255, r));
      img.data[idx + 1] = Math.max(0, Math.min(255, g));
      img.data[idx + 2] = Math.max(0, Math.min(255, b));
      img.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return new THREE.CanvasTexture(canvas);
}

// Starfield
const starGeo = new THREE.BufferGeometry();
const starCoords = new Float32Array(6000 * 3);
for (let i = 0; i < starCoords.length; i++) {
  starCoords[i] = (Math.random() - 0.5) * 2200;
}
starGeo.setAttribute('position', new THREE.BufferAttribute(starCoords, 3));
scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 1.1 })));

// Sun + Corona
const sun = new THREE.Mesh(
  new THREE.SphereGeometry(9.5, 48, 48),
  new THREE.MeshBasicMaterial({ color: 0xffb703 })
);
const sunHalo = new THREE.Mesh(
  new THREE.SphereGeometry(11.6, 36, 36),
  new THREE.MeshBasicMaterial({ color: 0xfb8500, transparent: true, opacity: 0.2 })
);
scene.add(sun, sunHalo);

const sunLight = new THREE.PointLight(0xfff8e7, 2.8, 900);
scene.add(sunLight);
scene.add(new THREE.AmbientLight(0x1e293b, 0.85));

const planetConfigs = [
  { key: 'mercury', name: 'Mercury', r: 1.1, dist: 16, speed: 0.018, info: 'Smallest planet closest to the Sun' },
  { key: 'venus',   name: 'Venus',   r: 1.8, dist: 23, speed: 0.013, info: 'Dense golden sulfuric cloud atmosphere' },
  { key: 'earth',   name: 'Earth',   r: 2.2, dist: 32, speed: 0.010, info: 'Blue oceans, continents, clouds & orbiting Moon', hasMoon: true, hasClouds: true },
  { key: 'mars',    name: 'Mars',    r: 1.5, dist: 41, speed: 0.008, info: 'Rust-red iron oxide terrain & dusty plains' },
  { key: 'jupiter', name: 'Jupiter', r: 4.8, dist: 56, speed: 0.0055, info: 'Largest gas giant with swirling cloud belts' },
  { key: 'saturn',  name: 'Saturn',  r: 3.9, dist: 74, speed: 0.004, info: 'Iconic tilted ring system of ice & rock', hasRings: true },
  { key: 'uranus',  name: 'Uranus',  r: 2.7, dist: 90, speed: 0.003, info: 'Cyan-blue ice giant tilted on its side' },
  { key: 'neptune', name: 'Neptune', r: 2.6, dist: 105, speed: 0.0024, info: 'Deep azure outer planet with strong winds' }
];

const planets = planetConfigs.map(cfg => {
  const tex = buildTexture(cfg.key);
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(cfg.r, 48, 48),
    new THREE.MeshStandardMaterial({
      map: tex,
      bumpMap: tex,
      bumpScale: 0.07,
      roughness: 0.78,
      metalness: 0.05
    })
  );

  let clouds = null;
  if (cfg.hasClouds) {
    clouds = new THREE.Mesh(
      new THREE.SphereGeometry(cfg.r * 1.022, 40, 40),
      new THREE.MeshStandardMaterial({
        map: buildTexture('clouds'),
        transparent: true,
        opacity: 0.85,
        depthWrite: false
      })
    );
    mesh.add(clouds);

    // Subtle blue atmospheric glow around Earth
    const atmo = new THREE.Mesh(
      new THREE.SphereGeometry(cfg.r * 1.065, 36, 36),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.18 })
    );
    mesh.add(atmo);
  }

  let moon = null;
  if (cfg.hasMoon) {
    moon = new THREE.Mesh(
      new THREE.SphereGeometry(0.55, 24, 24),
      new THREE.MeshStandardMaterial({ map: buildTexture('moon'), bumpMap: buildTexture('moon'), bumpScale: 0.05, roughness: 0.9 })
    );
    scene.add(moon);
  }

  if (cfg.hasRings) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(cfg.r * 1.32, cfg.r * 2.35, 72),
      new THREE.MeshBasicMaterial({ color: 0xe6cfa1, side: THREE.DoubleSide, transparent: true, opacity: 0.72 })
    );
    ring.rotation.x = Math.PI / 2.25;
    mesh.add(ring);
  }

  const orbitLine = new THREE.Mesh(
    new THREE.RingGeometry(cfg.dist - 0.12, cfg.dist + 0.12, 140),
    new THREE.MeshBasicMaterial({ color: 0x1e293b, side: THREE.DoubleSide })
  );
  orbitLine.rotation.x = Math.PI / 2;
  scene.add(orbitLine, mesh);

  return { ...cfg, mesh, clouds, moon, angle: Math.random() * Math.PI * 2, moonAngle: 0 };
});

// Asteroid Belt between Mars and Jupiter
const beltGeo = new THREE.BufferGeometry();
const beltPos = new Float32Array(1200 * 3);
for (let i = 0; i < 1200; i++) {
  const a = Math.random() * Math.PI * 2;
  const rad = 46 + (Math.random() - 0.5) * 4.5;
  beltPos[i * 3] = Math.cos(a) * rad;
  beltPos[i * 3 + 1] = (Math.random() - 0.5) * 1.6;
  beltPos[i * 3 + 2] = Math.sin(a) * rad;
}
beltGeo.setAttribute('position', new THREE.BufferAttribute(beltPos, 3));
const asteroidBelt = new THREE.Points(beltGeo, new THREE.PointsMaterial({ color: 0x94a3b8, size: 0.35 }));
scene.add(asteroidBelt);

let paused = false;
let selectedPlanet = null;

function togglePause() {
  paused = !paused;
  document.getElementById('pauseBtn').textContent = paused ? 'Resume Orbit' : 'Pause Orbit';
}

function resetView() {
  selectedPlanet = null;
  document.querySelectorAll('.dock button').forEach(b => b.classList.remove('active'));
  document.getElementById('statusText').textContent = 'Solar System Overview • Drag to Rotate';
}

// Planet Selector Buttons
const dock = document.getElementById('planetDock');
planets.forEach(p => {
  const btn = document.createElement('button');
  btn.textContent = p.name;
  btn.onclick = () => {
    selectedPlanet = p;
    document.querySelectorAll('.dock button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('statusText').textContent = `${p.name}: ${p.info}`;
  };
  dock.appendChild(btn);
});

function animate() {
  requestAnimationFrame(animate);
  sun.rotation.y += 0.0025;
  asteroidBelt.rotation.y += 0.0012;

  planets.forEach(p => {
    if (!paused) {
      p.angle += p.speed;
      p.mesh.rotation.y += 0.012;
      if (p.clouds) p.clouds.rotation.y += 0.017;
    }
    p.mesh.position.set(Math.cos(p.angle) * p.dist, 0, Math.sin(p.angle) * p.dist);

    if (p.moon) {
      if (!paused) p.moonAngle += 0.045;
      p.moon.position.set(
        p.mesh.position.x + Math.cos(p.moonAngle) * 4.2,
        Math.sin(p.moonAngle * 0.5) * 0.6,
        p.mesh.position.z + Math.sin(p.moonAngle) * 4.2
      );
      p.moon.rotation.y += 0.01;
    }
  });

  if (selectedPlanet) {
    const targetPos = selectedPlanet.mesh.position;
    controls.target.lerp(targetPos, 0.08);
    const camGoal = new THREE.Vector3(
      targetPos.x + selectedPlanet.r * 3.8,
      targetPos.y + selectedPlanet.r * 1.8,
      targetPos.z + selectedPlanet.r * 3.8
    );
    camera.position.lerp(camGoal, 0.045);
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

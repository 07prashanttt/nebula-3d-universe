const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 3000);
camera.position.set(0, 48, 115);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Procedural Realistic Planet Texture Generator
function createPlanetTexture(type) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const ctx = c.getContext('2d');

  if (type === 'sun') {
    const g = ctx.createRadialGradient(256, 128, 10, 256, 128, 256);
    g.addColorStop(0, '#fff7ed'); g.addColorStop(0.5, '#f97316'); g.addColorStop(1, '#dc2626');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 512, 256);
    for (let i = 0; i < 600; i++) {
      ctx.fillStyle = `rgba(255, 230, 120, ${Math.random() * 0.25})`;
      ctx.beginPath(); ctx.arc(Math.random() * 512, Math.random() * 256, Math.random() * 14, 0, Math.PI * 2); ctx.fill();
    }
  } else if (type === 'earth') {
    ctx.fillStyle = '#0369a1'; ctx.fillRect(0, 0, 512, 256);
    ctx.fillStyle = '#15803d';
    for (let i = 0; i < 45; i++) {
      ctx.beginPath();
      ctx.ellipse(Math.random() * 512, 40 + Math.random() * 176, 18 + Math.random() * 45, 10 + Math.random() * 25, Math.random(), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    for (let i = 0; i < 80; i++) {
      ctx.fillRect(Math.random() * 512, Math.random() * 256, 30 + Math.random() * 60, 4);
    }
  } else if (type === 'jupiter' || type === 'saturn') {
    const bands = type === 'jupiter'
      ? ['#d6c3a5', '#a16207', '#f5f5f4', '#9a3412', '#e7e5e4', '#78350f']
      : ['#fef3c7', '#eab308', '#fde68a', '#ca8a04', '#fef9c3'];
    for (let y = 0; y < 256; y += 8) {
      ctx.fillStyle = bands[(y / 8) % bands.length];
      ctx.fillRect(0, y, 512, 9);
    }
    if (type === 'jupiter') {
      ctx.fillStyle = '#b91c1c';
      ctx.beginPath(); ctx.ellipse(320, 165, 28, 15, 0, 0, Math.PI * 2); ctx.fill();
    }
  } else if (type === 'mars') {
    ctx.fillStyle = '#b91c1c'; ctx.fillRect(0, 0, 512, 256);
    for (let i = 0; i < 220; i++) {
      ctx.fillStyle = i % 2 ? 'rgba(69,10,10,0.35)' : 'rgba(251,146,60,0.25)';
      ctx.beginPath(); ctx.arc(Math.random() * 512, Math.random() * 256, 3 + Math.random() * 16, 0, Math.PI * 2); ctx.fill();
    }
  } else {
    const base = { mercury: '#78716c', venus: '#d97706', uranus: '#38bdf8', neptune: '#1d4ed8' }[type];
    ctx.fillStyle = base; ctx.fillRect(0, 0, 512, 256);
    for (let i = 0; i < 180; i++) {
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.beginPath(); ctx.arc(Math.random() * 512, Math.random() * 256, 4 + Math.random() * 18, 0, Math.PI * 2); ctx.fill();
    }
  }
  return new THREE.CanvasTexture(c);
}

// Deep Space Stars
const starGeo = new THREE.BufferGeometry();
const starPos = new Float32Array(5000 * 3);
for (let i = 0; i < 15000; i++) starPos[i] = (Math.random() - 0.5) * 1600;
starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.9 })));

// Sun + Glow Aura
const sun = new THREE.Mesh(
  new THREE.SphereGeometry(9, 48, 48),
  new THREE.MeshBasicMaterial({ map: createPlanetTexture('sun') })
);
const sunGlow = new THREE.Mesh(
  new THREE.SphereGeometry(11.2, 32, 32),
  new THREE.MeshBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.22 })
);
scene.add(sun, sunGlow);
scene.add(new THREE.PointLight(0xfff7ed, 2.6, 600));
scene.add(new THREE.AmbientLight(0x1e293b, 0.9));

const specs = [
  { name: 'Mercury', r: 1.2, dist: 16, speed: 0.018, info: 'Closest rocky planet to the Sun' },
  { name: 'Venus',   r: 1.8, dist: 23, speed: 0.014, info: 'Hottest planet with thick golden clouds' },
  { name: 'Earth',   r: 2.1, dist: 31, speed: 0.011, info: 'Our home world with oceans & atmosphere', atmo: true },
  { name: 'Mars',    r: 1.6, dist: 39, speed: 0.009, info: 'The Red Planet with giant canyons' },
  { name: 'Jupiter', r: 4.6, dist: 53, speed: 0.006, info: 'Gas giant with the Great Red Spot' },
  { name: 'Saturn',  r: 3.9, dist: 70, speed: 0.0045, info: 'Famous for its icy multi-band ring system', ring: true },
  { name: 'Uranus',  r: 2.7, dist: 85, speed: 0.0032, info: 'Ice giant rotating on its side' },
  { name: 'Neptune', r: 2.6, dist: 98, speed: 0.0025, info: 'Deep blue supersonic wind world' }
];

const planets = specs.map(s => {
  const tex = createPlanetTexture(s.name.toLowerCase());
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(s.r, 40, 40),
    new THREE.MeshStandardMaterial({ map: tex, bumpMap: tex, bumpScale: 0.06, roughness: 0.75 })
  );

  if (s.atmo) {
    mesh.add(new THREE.Mesh(
      new THREE.SphereGeometry(s.r * 1.07, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.22 })
    ));
  }

  if (s.ring) {
    const ringGeo = new THREE.RingGeometry(s.r * 1.35, s.r * 2.35, 64);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xfde68a, side: THREE.DoubleSide, transparent: true, opacity: 0.75 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2.3;
    mesh.add(ring);
  }

  const orbit = new THREE.Mesh(
    new THREE.RingGeometry(s.dist - 0.12, s.dist + 0.12, 120),
    new THREE.MeshBasicMaterial({ color: 0x1e293b, side: THREE.DoubleSide })
  );
  orbit.rotation.x = Math.PI / 2;
  scene.add(orbit, mesh);

  return { ...s, mesh, angle: Math.random() * Math.PI * 2 };
});

// Bottom Planet Selector Bar
let focusTarget = null;
const bar = document.getElementById('planetBar');
const overviewBtn = document.createElement('button');
overviewBtn.textContent = 'Overview';
overviewBtn.className = 'active';
overviewBtn.onclick = () => {
  focusTarget = null;
  document.querySelectorAll('.planet-bar button').forEach(b => b.classList.remove('active'));
  overviewBtn.classList.add('active');
  document.getElementById('planetInfo').textContent = 'Solar System Overview — Drag to Rotate';
};
bar.appendChild(overviewBtn);

planets.forEach(p => {
  const btn = document.createElement('button');
  btn.textContent = p.name;
  btn.onclick = () => {
    focusTarget = p;
    document.querySelectorAll('.planet-bar button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('planetInfo').textContent = `${p.name}: ${p.info}`;
  };
  bar.appendChild(btn);
});

function animate() {
  requestAnimationFrame(animate);
  sun.rotation.y += 0.003;
  planets.forEach(p => {
    p.angle += p.speed;
    p.mesh.position.set(Math.cos(p.angle) * p.dist, 0, Math.sin(p.angle) * p.dist);
    p.mesh.rotation.y += 0.015;
  });

  if (focusTarget) {
    const pos = focusTarget.mesh.position;
    controls.target.lerp(pos, 0.08);
    const desiredCam = new THREE.Vector3(pos.x + focusTarget.r * 3.5, pos.y + focusTarget.r * 2, pos.z + focusTarget.r * 3.5);
    camera.position.lerp(desiredCam, 0.05);
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

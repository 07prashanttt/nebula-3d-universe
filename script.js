const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 2000);
camera.position.set(0, 35, 75);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Starfield
const starGeo = new THREE.BufferGeometry();
const starPos = new Float32Array(3000 * 3);
for (let i = 0; i < 9000; i++) starPos[i] = (Math.random() - 0.5) * 900;
starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.7 })));

// Sun
const sun = new THREE.Mesh(
  new THREE.SphereGeometry(7, 32, 32),
  new THREE.MeshBasicMaterial({ color: 0xffaa00 })
);
scene.add(sun);
scene.add(new THREE.PointLight(0xffffff, 2.5, 400));
scene.add(new THREE.AmbientLight(0x222244));

const planetData = [
  { r: 1.3, dist: 14, speed: 0.02, color: 0x94a3b8 },
  { r: 2.0, dist: 21, speed: 0.015, color: 0xf59e0b },
  { r: 2.3, dist: 29, speed: 0.011, color: 0x3b82f6 },
  { r: 1.8, dist: 37, speed: 0.008, color: 0xef4444 },
  { r: 4.2, dist: 50, speed: 0.005, color: 0xd97706, ring: true }
];

const planets = planetData.map(p => {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(p.r, 32, 32),
    new THREE.MeshStandardMaterial({ color: p.color, roughness: 0.5 })
  );
  if (p.ring) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(p.r + 1.5, p.r + 3.8, 48),
      new THREE.MeshBasicMaterial({ color: 0xfde68a, side: THREE.DoubleSide })
    );
    ring.rotation.x = Math.PI / 2.4;
    mesh.add(ring);
  }
  const orbit = new THREE.RingGeometry(p.dist - 0.1, p.dist + 0.1, 90);
  const orbitMesh = new THREE.Mesh(orbit, new THREE.MeshBasicMaterial({ color: 0x1e293b, side: THREE.DoubleSide }));
  orbitMesh.rotation.x = Math.PI / 2;
  scene.add(orbitMesh);
  scene.add(mesh);
  return { mesh, ...p, angle: Math.random() * Math.PI * 2 };
});

function animate() {
  requestAnimationFrame(animate);
  sun.rotation.y += 0.004;
  planets.forEach(p => {
    p.angle += p.speed;
    p.mesh.position.set(Math.cos(p.angle) * p.dist, 0, Math.sin(p.angle) * p.dist);
    p.mesh.rotation.y += 0.02;
  });
  controls.update();
  renderer.render(scene, camera);
}
animate();
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/loaders/GLTFLoader.js';

// DOM Elements
const canvas = document.getElementById('gameCanvas');
const clockLabel = document.getElementById('clockLabel');
const stateLabel = document.getElementById('stateLabel');
const healthLabel = document.getElementById('healthLabel');
const rakeHitsLabel = document.getElementById('rakeHitsLabel');

// Three.js Setup
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x081017);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowShadowMap;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x081017, 12, 38);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 5.8, 11);

// Lighting
const hemi = new THREE.HemisphereLight(0xbfe3ff, 0x0b1623, 1.3);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xfff4d3, 1.5);
sun.position.set(8, 10, 7);
sun.castShadow = true;
sun.shadow.mapSize.width = 1024;
sun.shadow.mapSize.height = 1024;
sun.shadow.camera.left = -20;
sun.shadow.camera.right = 20;
sun.shadow.camera.top = 20;
sun.shadow.camera.bottom = -20;
sun.shadow.camera.near = 0.1;
sun.shadow.camera.far = 40;
scene.add(sun);

// Environment
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(60, 60),
  new THREE.MeshStandardMaterial({ 
    color: 0x1f2d1f, 
    roughness: 1,
    metalness: 0
  })
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.25;
ground.receiveShadow = true;
scene.add(ground);

const skyGlow = new THREE.Mesh(
  new THREE.SphereGeometry(120, 32, 32),
  new THREE.MeshBasicMaterial({ color: 0x0c2033, side: THREE.BackSide })
);
scene.add(skyGlow);

// Player State
const player = {
  mesh: null,
  spawn: new THREE.Vector3(0, 0, 6),
  velocity: new THREE.Vector3(),
  health: 100,
  maxHealth: 100,
  state: 'idle',
  facing: 1,
  attackTimer: 0,
  parryTimer: 0,
  dash: 0,
  targetHits: 0,
  alive: true
};

// Rake State
const rake = {
  mesh: null,
  mixer: null,
  actions: {},
  spawn: new THREE.Vector3(0, 0, -16),
  target: 'player',
  targetHitCount: 0,
  state: 'retreat',
  hitCooldown: 0,
  attackWindow: 0,
  health: 100,
  maxHealth: 100,
  alive: true
};

// Clock State
const clock = {
  time: 18,
  minutes: 0,
  lastFrame: 0
};

let currentAnimation = 'idle';
let attackQueued = false;
let parryQueued = false;
let gameRunning = false;

// Utility Functions
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function formatClock(hourFloat) {
  const hour = Math.floor(hourFloat) % 24;
  const minute = Math.floor((hourFloat - Math.floor(hourFloat)) * 60);
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function isNight() {
  return clock.time >= 18 || clock.time < 6;
}

// Animation Management
function setAnimation(name) {
  if (!rake.actions || !rake.actions[name]) return;
  const anims = rake.actions;
  Object.keys(anims).forEach((key) => {
    const action = anims[key];
    if (key === name) {
      if (!action.isRunning()) action.play();
    } else {
      if (action.isRunning()) action.stop();
    }
  });
  currentAnimation = name;
}

function resolveAnimationNames(animationNames) {
  const list = animationNames.map((x) => x.toLowerCase());

  const find = (patterns) => {
    for (const pattern of patterns) {
      const idx = list.findIndex((name) => name.includes(pattern));
      if (idx >= 0) return animationNames[idx];
    }
    return null;
  };

  return {
    attack: find(['attack', 'strike', 'slash', 'hit', 'bite', 'claw']),
    walk: find(['walk', 'walking', 'run', 'running', 'move', 'locomotion']),
    parry: find(['parry', 'guard', 'block', 'dodge', 'evade']),
    idle: find(['idle', 'stand', 'stance', 'rest'])
  };
}

// Model Loading
function loadModel() {
  const loader = new GLTFLoader();

  return new Promise((resolve, reject) => {
    loader.load(
      chrome.runtime.getURL('models/rake.glb'),
      (gltf) => {
        const model = gltf.scene;

        model.scale.setScalar(0.9);
        model.position.set(rake.spawn.x, rake.spawn.y, rake.spawn.z);
        model.rotation.y = Math.PI;
        model.castShadow = true;
        model.receiveShadow = true;

        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        scene.add(model);

        const mixer = new THREE.AnimationMixer(model);
        rake.mesh = model;
        rake.mixer = mixer;

        const animationNames = gltf.animations.map((clip) => clip.name);
        console.log('Available animations:', animationNames);
        
        const clipMap = resolveAnimationNames(animationNames);

        const actions = {};
        for (const [key, value] of Object.entries(clipMap)) {
          if (!value) continue;

          const clip = gltf.animations.find((a) => a.name === value);
          if (!clip) continue;
          actions[key] = mixer.clipAction(clip);
          actions[key].clampWhenFinished = false;
        }

        rake.actions = actions;

        // Warn if critical animations are missing
        if (!rake.actions.walk) {
          console.warn('⚠️ No walk animation found in the GLB');
        }
        if (!rake.actions.attack) {
          console.warn('⚠️ No attack animation found in the GLB');
        }
        if (!rake.actions.parry) {
          console.warn('⚠️ No parry animation found in the GLB');
        }

        console.log('✓ Model loaded successfully');
        resolve();
      },
      undefined,
      (err) => {
        console.error('✗ Model loading error:', err);
        reject(err);
      }
    );
  });
}

// Player Mesh
function createPlayerMesh() {
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.7, 1.4, 4, 10),
    new THREE.MeshStandardMaterial({ 
      color: 0x7ad1ff, 
      emissive: 0x103c5e, 
      roughness: 0.6,
      metalness: 0.2
    })
  );
  body.position.set(player.spawn.x, 0.9, player.spawn.z);
  body.castShadow = true;
  body.receiveShadow = true;
  scene.add(body);
  player.mesh = body;
}

// Environment Updates
function setSkyByClock() {
  const dayRatio = (clock.time >= 6 && clock.time < 18) ? 1 : 0;
  const skyColor = new THREE.Color().lerpColors(
    new THREE.Color(0x0a1222),
    new THREE.Color(0x8ec5ff),
    dayRatio
  );
  scene.background = skyColor;
  scene.fog.color.copy(skyColor);
  skyGlow.material.color.set(dayRatio ? 0x9bcfff : 0x060d18);

  sun.intensity = dayRatio ? 1.8 : 0.3;
  hemi.intensity = dayRatio ? 1.2 : 0.7;
}

function updateClock(dt) {
  clock.time += dt * 0.15;
  if (clock.time >= 24) clock.time -= 24;
  clock.minutes = clock.time;

  clockLabel.textContent = formatClock(clock.time);
  
  const night = isNight();
  stateLabel.textContent = night ? 'Night Hunt' : 'Day Retreat';
  stateLabel.setAttribute('data-night', night ? 'true' : 'false');
  
  setSkyByClock();
}

// Player Update Logic
function updatePlayer(dt) {
  if (!player.alive) return;

  const move = new THREE.Vector3(
    (keys.d ? 1 : 0) - (keys.a ? 1 : 0),
    0,
    (keys.s ? 1 : 0) - (keys.w ? 1 : 0)
  );

  if (move.lengthSq() > 0) {
    move.normalize();
    player.facing = move.x >= 0 ? 1 : -1;
    player.mesh.position.addScaledVector(move, dt * 4.5);
    player.mesh.position.x = clamp(player.mesh.position.x, -12, 12);
    player.mesh.position.z = clamp(player.mesh.position.z, -12, 12);
    player.state = 'walk';
  } else {
    player.state = 'idle';
  }

  if (player.attackTimer > 0) player.attackTimer -= dt;
  if (player.parryTimer > 0) player.parryTimer -= dt;

  // Player Attack Logic
  if (rake.mesh && player.mesh.position.distanceTo(rake.mesh.position) < 4.2 && player.attackTimer <= 0 && attackQueued) {
    player.attackTimer = 0.45;
    attackQueued = false;

    const hitDistance = player.mesh.position.distanceTo(rake.mesh.position);
    if (hitDistance < 3.8) {
      rake.targetHitCount += 1;
      rake.hitCooldown = 0.6;
      rake.health -= 15;

      if (rake.targetHitCount >= 2) {
        rake.target = rake.target === 'player' ? 'decoy' : 'player';
        rake.targetHitCount = 0;
      }

      console.log(`🎯 Player hit rake! (${rake.health} HP remaining)`);
    }
  }

  // Parry Logic
  if (player.parryTimer <= 0 && parryQueued) {
    player.parryTimer = 0.7;
    parryQueued = false;
    if (rake.mesh && rake.mesh.position.distanceTo(player.mesh.position) < 3) {
      rakeParrySuccess();
    }
  }

  // Check if player is dead
  if (player.health <= 0) {
    player.alive = false;
    console.log('☠️ Player defeated!');
  }
}

function rakeParrySuccess() {
  if (!rake.actions.parry) return;
  setAnimation('parry');
  rake.hitCooldown = 0.8;
  rake.state = 'retreat';
  console.log('🛡️ Parry successful!');
}

// Rake Update Logic
function updateRake(dt) {
  if (!rake.mesh || !rake.mixer || !rake.alive) return;

  rake.mixer.update(dt);

  if (rake.hitCooldown > 0) rake.hitCooldown -= dt;

  const playerPos = player.mesh.position.clone();

  // Daytime: Retreat to spawn
  if (!isNight()) {
    rake.state = 'retreat';
    const retreatTarget = new THREE.Vector3(rake.spawn.x, 0, rake.spawn.z);
    const dir = retreatTarget.clone().sub(rake.mesh.position);

    if (dir.lengthSq() > 0.05) {
      dir.normalize();
      rake.mesh.position.addScaledVector(dir, dt * 2.2);
      rake.mesh.rotation.y = Math.atan2(dir.x, dir.z);
      setAnimation('walk');
    } else {
      setAnimation('idle');
    }

    return;
  }

  // Nighttime: Hunt
  rake.state = 'hunt';

  let targetPos = playerPos;
  if (rake.target === 'decoy') {
    targetPos = new THREE.Vector3(6, 0, 2);
  }

  const dir = targetPos.clone().sub(rake.mesh.position);
  const distToTarget = dir.length();

  if (distToTarget > 0.2) {
    dir.normalize();
    rake.mesh.position.addScaledVector(dir, dt * 2.8);
    rake.mesh.rotation.y = Math.atan2(dir.x, dir.z);
    setAnimation('walk');
  } else if (rake.target === 'player') {
    setAnimation('attack');
  }

  // Rake Damage Logic
  if (rake.target === 'player' && rake.mesh.position.distanceTo(playerPos) < 2.4 && rake.hitCooldown <= 0 && player.alive) {
    player.health = Math.max(0, player.health - 12);
    rake.hitCooldown = 1.1;
    console.log(`🪓 Rake attacked player! (${player.health} HP remaining)`);
  }

  // Check if rake is dead
  if (rake.health <= 0) {
    rake.alive = false;
    setAnimation('idle');
    console.log('✓ Rake defeated!');
  }
}

// Input Handling
const keys = {
  w: false,
  a: false,
  s: false,
  d: false
};

window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  
  if (key === 'w') keys.w = true;
  if (key === 'a') keys.a = true;
  if (key === 's') keys.s = true;
  if (key === 'd') keys.d = true;

  if (event.key === ' ') {
    event.preventDefault();
    parryQueued = true;
  }
  if (event.key === 'e' || event.key === 'E' || event.key === 'Enter') {
    attackQueued = true;
  }
});

window.addEventListener('keyup', (event) => {
  const key = event.key.toLowerCase();
  
  if (key === 'w') keys.w = false;
  if (key === 'a') keys.a = false;
  if (key === 's') keys.s = false;
  if (key === 'd') keys.d = false;
});

// Window Resize Handling
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// HUD Updates
function updateHUD() {
  // Health bar color coding
  const healthPercent = (player.health / player.maxHealth) * 100;
  if (healthPercent > 50) {
    healthLabel.setAttribute('data-health-good', 'true');
    healthLabel.removeAttribute('data-health-warning');
  } else if (healthPercent > 20) {
    healthLabel.removeAttribute('data-health-good');
    healthLabel.setAttribute('data-health-warning', 'true');
  } else {
    healthLabel.removeAttribute('data-health-good');
    healthLabel.removeAttribute('data-health-warning');
  }

  healthLabel.textContent = String(Math.max(0, player.health));
  rakeHitsLabel.textContent = String(rake.targetHitCount);

  // Game over check
  if (!player.alive) {
    stateLabel.textContent = 'GAME OVER';
    stateLabel.style.color = '#ff5e75';
  }
}

// Initialize Game
async function boot() {
  try {
    console.log('🚀 Initializing Rake Survival...');
    
    createPlayerMesh();
    await loadModel();

    if (rake.actions && rake.actions.walk) {
      setAnimation('walk');
    } else {
      setAnimation('idle');
    }

    // Reset positions
    player.mesh.position.copy(player.spawn);
    rake.mesh.position.copy(rake.spawn);
    rake.mesh.rotation.y = Math.PI;

    gameRunning = true;
    console.log('✓ Game ready!');

    animate();
  } catch (error) {
    console.error('✗ Boot failed:', error);
  }
}

// Animation Loop
function animate() {
  requestAnimationFrame(animate);

  if (!gameRunning) return;

  const now = performance.now();
  const dt = Math.min(0.033, (now - (animate.last || now)) / 1000);
  animate.last = now;

  updateClock(dt);
  updatePlayer(dt);
  updateRake(dt);
  updateHUD();

  renderer.render(scene, camera);
}

// Start the game
boot();

// Export for debugging
window.gameState = { player, rake, clock, isNight };

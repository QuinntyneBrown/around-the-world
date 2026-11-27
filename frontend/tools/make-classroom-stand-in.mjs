// Builds the stand-in for the classroom's Blender exports (docs/adr/0028) from three.js
// primitives. The scratch glTF files go to .cache/classroom-stand-in/. Run from frontend/: `npm run classroom:stand-in`.
//
// - classroom.glb: `floor`, `rug`, `path-dot`, `desk`, `shadow` and one `landmark-<country>`
//   for each of the 24 countries of the tour (domain's tour/countries.ts).
// - cast.glb: `kid-zuri`, `kid-kenji`, `kid-nia`, `kid-milo` (with his robot `bolt`), `kid-pip`
//   and `kid-classmate`, each standing on its origin and facing +z.
//
// Lengths are in metres. Materials are named by role (`kid-body`, `desk-top`, ...): the game
// colours them from the design tokens when it draws them, so the colours here are fallbacks.
// Parts named `*-detail` are left out at the lowest level of detail.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

const roomBase = process.argv[2] === '--room-base';
const out = roomBase
  ? process.argv[3]
  : join(dirname(fileURLToPath(import.meta.url)), '../../.cache/classroom-stand-in');

// GLTFExporter reads its binary output with the browser's FileReader.
globalThis.FileReader ??= class {
  readAsArrayBuffer(blob) {
    void blob.arrayBuffer().then((buffer) => {
      this.result = buffer;
      this.onloadend?.();
    });
  }
};

const materials = new Map();
/** One shared material per role. */
function material(name, color, extra = {}) {
  if (!materials.has(name)) {
    materials.set(
      name,
      new THREE.MeshStandardMaterial({ name, color, roughness: 1, metalness: 0, ...extra }),
    );
  }
  return materials.get(name);
}

function mesh(name, geometry, mat, position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1]) {
  // Nothing is textured, so the stand-in keeps no texture coordinates.
  if (geometry.hasAttribute('uv')) geometry.deleteAttribute('uv');
  const part = new THREE.Mesh(geometry, mat);
  part.name = name;
  part.position.set(...position);
  part.rotation.set(...rotation);
  part.scale.set(...scale);
  return part;
}

function group(name, ...children) {
  const node = new THREE.Group();
  node.name = name;
  node.add(...children);
  return node;
}

// Parts of the same shape share one geometry, which the file then holds once.
const geometries = new Map();
function shape(kind, make, ...size) {
  const key = `${kind}:${size.join(',')}`;
  if (!geometries.has(key)) geometries.set(key, make(...size));
  return geometries.get(key);
}
const box = (...size) => shape('box', (w, h, d) => new THREE.BoxGeometry(w, h, d), ...size);
const cylinder = (top, bottom, h, segments = 10) =>
  shape('cylinder', (...s) => new THREE.CylinderGeometry(...s), top, bottom, h, segments);
const sphere = (r, segments = 12) =>
  shape(
    'sphere',
    (radius, n) => new THREE.SphereGeometry(radius, n, Math.ceil(n / 2)),
    r,
    segments,
  );
const cone = (r, h, segments = 10) =>
  shape('cone', (...s) => new THREE.ConeGeometry(...s), r, h, segments);
const capsule = (r, length) =>
  shape('capsule', (radius, l) => new THREE.CapsuleGeometry(radius, l, 3, 10), r, length);
const torus = (r, tube, arc = Math.PI * 2) =>
  shape('torus', (...s) => new THREE.TorusGeometry(s[0], s[1], 6, 20, s[2]), r, tube, arc);

// ---- The room ----------------------------------------------------------------------------

function room() {
  const floor = group(
    'floor',
    mesh(
      'floor-top',
      box(8.6, 0.12, 8.6),
      material('floor', '#ffffff'),
      [0, -0.06, 0],
      [0, Math.PI / 4, 0],
    ),
    mesh(
      'floor-edge',
      box(8.7, 0.12, 8.7),
      material('floor-edge', '#7cc0ff'),
      [0, -0.13, 0],
      [0, Math.PI / 4, 0],
    ),
  );
  const land = (name, color, x, z, sx, sz) =>
    mesh(
      `${name}-detail`,
      cylinder(1, 1, 0.012, 20),
      material(name, color),
      [x, 0.022, z],
      [0, 0.4, 0],
      [sx, 1, sz],
    );
  const rug = group(
    'rug',
    mesh(
      'rug-deep',
      cylinder(2.5, 2.5, 0.016, 40),
      material('rug-deep', '#0a6fd1'),
      [0, 0.006, 0.06],
    ),
    mesh('rug-top', cylinder(2.5, 2.5, 0.02, 40), material('rug', '#1e9bff'), [0, 0.01, 0]),
    mesh(
      'rug-ring-detail',
      torus(1.7, 0.012),
      material('rug-line', '#8fd0ff'),
      [0, 0.022, 0],
      [Math.PI / 2, 0, 0],
    ),
    mesh(
      'rug-ring-inner-detail',
      torus(0.9, 0.012),
      material('rug-line', '#8fd0ff'),
      [0, 0.022, 0],
      [Math.PI / 2, 0, 0],
    ),
    land('land-1', '#22c768', -1.0, -0.9, 0.5, 0.35),
    land('land-2', '#ffc83d', 0.1, -0.6, 0.3, 0.55),
    land('land-3', '#ff4f6d', 1.2, -0.8, 0.6, 0.3),
    land('land-4', '#9b5cff', 1.5, 0.6, 0.3, 0.25),
  );
  const pathDot = mesh(
    'path-dot',
    cylinder(0.035, 0.035, 0.012, 8),
    material('path', '#ffffff'),
    [0, 0.03, 0],
  );
  const leg = (x, z) =>
    mesh('desk-leg', cylinder(0.022, 0.022, 0.32, 8), material('desk-leg', '#7d8bbd'), [
      x,
      0.16,
      z,
    ]);
  const desk = group(
    'desk',
    mesh('desk-top', box(0.68, 0.06, 0.42), material('desk-top', '#ffe27a'), [0, 0.37, 0]),
    mesh('desk-apron', box(0.6, 0.08, 0.34), material('desk-side', '#f2b705'), [0, 0.3, 0]),
    leg(-0.28, -0.15),
    leg(0.28, -0.15),
    leg(-0.28, 0.15),
    leg(0.28, 0.15),
  );
  const shadow = mesh(
    'shadow',
    cylinder(0.4, 0.4, 0.004, 24),
    material('shadow', '#1b2559', { transparent: true, opacity: 0.16 }),
    [0, 0.004, 0],
  );
  return [floor, rug, pathDot, desk, shadow, ...landmarks()];
}

// Each landmark is a souvenir on its desk: at most 0.3 m across and 0.36 m tall, on its origin.
function landmarks() {
  const stone = material('landmark-stone', '#d8c8a8');
  const sand = material('landmark-sand', '#f2c46d');
  const iron = material('landmark-iron', '#7a6a5a');
  const white = material('landmark-white', '#f4f6fb');
  const green = material('landmark-green', '#5bbf7a');
  const copper = material('landmark-copper', '#6fc7b4');
  const red = material('landmark-red', '#d94a3a');
  const gold = material('landmark-gold', '#f2b705');
  const snow = material('landmark-snow', '#ffffff');
  const blue = material('landmark-blue', '#3f7fd9');
  const purple = material('landmark-purple', '#9b5cff');
  const dark = material('landmark-dark', '#4a4f63');
  const make = (country, ...parts) =>
    group(`landmark-${country.toLowerCase().replace(/[^a-z]/g, '')}`, ...parts);
  const tower = (m, r, h, y = 0) => mesh('part', cylinder(r * 0.6, r, h, 10), m, [0, y + h / 2, 0]);

  return [
    make(
      'France',
      mesh('part', cone(0.12, 0.34, 4), iron, [0, 0.17, 0]),
      mesh('part-detail', box(0.16, 0.02, 0.16), iron, [0, 0.1, 0]),
    ),
    make(
      'Egypt',
      mesh('part', cone(0.15, 0.2, 4), sand, [0, 0.1, 0]),
      mesh('part-detail', cone(0.08, 0.11, 4), sand, [0.12, 0.055, -0.06]),
    ),
    make(
      'Japan',
      mesh('part', cone(0.15, 0.22, 16), blue, [0, 0.11, 0]),
      mesh('part-detail', cone(0.06, 0.07, 16), snow, [0, 0.195, 0]),
    ),
    make(
      'UK',
      mesh('part', box(0.08, 0.28, 0.08), stone, [0, 0.14, 0]),
      mesh('part-detail', cone(0.06, 0.08, 4), dark, [0, 0.32, 0]),
    ),
    make('Italy', mesh('part', cylinder(0.06, 0.06, 0.3, 12), white, [0, 0.15, 0], [0, 0, 0.12])),
    make(
      'USA',
      mesh('part', cylinder(0.05, 0.07, 0.22, 10), copper, [0, 0.11, 0]),
      mesh('part-detail', cylinder(0.012, 0.012, 0.1, 6), copper, [0.05, 0.27, 0]),
    ),
    make(
      'Brazil',
      mesh('part', box(0.04, 0.26, 0.04), white, [0, 0.13, 0]),
      mesh('part', box(0.24, 0.035, 0.035), white, [0, 0.22, 0]),
    ),
    make(
      'India',
      mesh('part', box(0.2, 0.1, 0.2), white, [0, 0.05, 0]),
      mesh('part', sphere(0.08), white, [0, 0.15, 0]),
    ),
    make(
      'Kenya',
      mesh('part', cone(0.15, 0.24, 7), green, [0, 0.12, 0]),
      mesh('part-detail', cone(0.05, 0.06, 7), snow, [0, 0.21, 0]),
    ),
    make(
      'China',
      mesh('part', box(0.28, 0.06, 0.05), stone, [0, 0.03, 0]),
      mesh('part-detail', box(0.06, 0.1, 0.06), stone, [0.1, 0.05, 0]),
    ),
    make(
      'Australia',
      mesh('part', sphere(0.12, 12), white, [0, 0.02, 0], [0, 0, 0], [1, 1, 0.6]),
      mesh('part-detail', sphere(0.08, 12), white, [0.09, 0.0, 0.03], [0, 0, 0], [1, 1, 0.6]),
    ),
    make(
      'Peru',
      mesh('part', box(0.22, 0.06, 0.18), stone, [0, 0.03, 0]),
      mesh('part', box(0.14, 0.06, 0.12), stone, [0, 0.09, 0]),
    ),
    make(
      'Mexico',
      mesh('part', cone(0.14, 0.2, 4), stone, [0, 0.1, 0]),
      mesh('part-detail', box(0.06, 0.05, 0.06), stone, [0, 0.21, 0]),
    ),
    make(
      'Norway',
      mesh('part', torus(0.11, 0.015, Math.PI), green, [0, 0.06, 0]),
      mesh('part-detail', torus(0.08, 0.012, Math.PI), purple, [0, 0.06, 0]),
    ),
    make(
      'Greece',
      mesh('part', box(0.26, 0.03, 0.14), white, [0, 0.2, 0]),
      ...[-0.1, -0.035, 0.035, 0.1].map((x) =>
        mesh('part', cylinder(0.015, 0.015, 0.18, 8), white, [x, 0.09, 0]),
      ),
    ),
    make(
      'Canada',
      tower(stone, 0.03, 0.32),
      mesh('part-detail', sphere(0.05, 10), stone, [0, 0.24, 0]),
    ),
    make(
      'Spain',
      ...[-0.07, 0, 0.07].map((x, i) =>
        mesh('part', cone(0.035, 0.24 + (i === 1 ? 0.08 : 0), 8), sand, [
          x,
          0.12 + (i === 1 ? 0.04 : 0),
          0,
        ]),
      ),
    ),
    make(
      'Russia',
      mesh('part', cylinder(0.05, 0.05, 0.14, 10), red, [0, 0.07, 0]),
      mesh('part', sphere(0.07, 10), green, [0, 0.18, 0], [0, 0, 0], [1, 1.3, 1]),
      mesh('part-detail', sphere(0.04, 8), gold, [0.09, 0.12, 0]),
    ),
    make(
      'Thailand',
      mesh('part', box(0.2, 0.06, 0.14), gold, [0, 0.03, 0]),
      mesh('part', cone(0.06, 0.22, 8), gold, [0, 0.17, 0]),
    ),
    make(
      'Turkey',
      mesh('part', sphere(0.1, 12), stone, [0, 0.06, 0]),
      mesh('part-detail', cylinder(0.012, 0.012, 0.24, 6), stone, [0.13, 0.12, 0]),
    ),
    make('Morocco', mesh('part', box(0.08, 0.32, 0.08), copper, [0, 0.16, 0])),
    make(
      'Iceland',
      mesh('part', cylinder(0.08, 0.1, 0.03, 12), stone, [0, 0.015, 0]),
      mesh('part', cylinder(0.015, 0.04, 0.26, 8), snow, [0, 0.15, 0]),
    ),
    make(
      'Korea',
      mesh('part', box(0.24, 0.08, 0.14), red, [0, 0.04, 0]),
      mesh('part', cone(0.18, 0.08, 4), dark, [0, 0.12, 0], [0, Math.PI / 4, 0]),
    ),
    make(
      'Chile',
      mesh('part', box(0.08, 0.22, 0.07), dark, [-0.06, 0.11, 0]),
      mesh('part-detail', box(0.07, 0.18, 0.06), dark, [0.07, 0.09, 0]),
    ),
  ];
}

// ---- The cast ------------------------------------------------------------------------------

/** The bean every kid shares: body, legs, arms, visor and smile, in the kid's colour. */
function bean(kid, body, deep) {
  const bodyMat = material(`kid-body:${kid}`, body);
  bodyMat.name = 'kid-body';
  const deepMat = material(`kid-deep:${kid}`, deep);
  deepMat.name = 'kid-deep';
  return [
    mesh('body', capsule(0.2, 0.26), bodyMat, [0, 0.36, 0]),
    mesh('leg', capsule(0.055, 0.06), deepMat, [-0.08, 0.07, 0]),
    mesh('leg', capsule(0.055, 0.06), deepMat, [0.08, 0.07, 0]),
    mesh('arm', capsule(0.05, 0.14), deepMat, [-0.23, 0.36, 0], [0, 0, 0.25]),
    mesh('arm', capsule(0.05, 0.14), deepMat, [0.23, 0.36, 0], [0, 0, -0.25]),
    mesh(
      'visor',
      sphere(0.1, 16),
      material('visor', '#bfe9ff'),
      [0.03, 0.5, 0.15],
      [0, 0, 0],
      [1.25, 0.7, 0.6],
    ),
    mesh(
      'smile-detail',
      torus(0.07, 0.01, Math.PI),
      material('outline', '#1b2559'),
      [0, 0.33, 0.195],
      [0, 0, Math.PI],
    ),
  ];
}

function cast() {
  const hair = material('hair', '#3a2418');
  const white = material('white', '#ffffff');
  const metal = material('metal', '#9aa3b5');
  const metalLight = material('metal-light', '#c2c8d6');
  const outline = material('outline', '#1b2559');
  const kid = (id, body, deep, ...accessory) =>
    group(`kid-${id}`, ...bean(id, body, deep), ...accessory);

  const bolt = group(
    'bolt',
    mesh('bolt-body', box(0.16, 0.14, 0.12), metalLight, [0, 0.13, 0]),
    mesh('bolt-base', box(0.11, 0.05, 0.09), metal, [0, 0.035, 0]),
    mesh('bolt-eye', sphere(0.018, 8), outline, [-0.035, 0.15, 0.062]),
    mesh('bolt-eye', sphere(0.018, 8), outline, [0.035, 0.15, 0.062]),
    mesh('bolt-antenna-detail', cylinder(0.006, 0.006, 0.07, 6), outline, [0, 0.235, 0]),
  );
  bolt.position.set(0.4, 0, 0.05);

  return [
    kid(
      'zuri',
      '#ffc83d',
      '#f2a900',
      mesh('hair', sphere(0.07, 10), hair, [-0.1, 0.62, 0]),
      mesh('hair', sphere(0.075, 10), hair, [0, 0.66, 0]),
      mesh('hair', sphere(0.07, 10), hair, [0.1, 0.62, 0]),
      group(
        'pencil',
        mesh(
          'pencil-wood',
          cylinder(0.025, 0.025, 0.26, 6),
          material('pencil', '#ffd77a'),
          [0, 0.13, 0],
        ),
        mesh(
          'pencil-eraser',
          cylinder(0.026, 0.026, 0.05, 6),
          material('eraser', '#ff8fb1'),
          [0, 0.28, 0],
        ),
      )
        .translateX(-0.3)
        .translateY(0.4),
    ),
    kid(
      'kenji',
      '#1e9bff',
      '#0a6fd1',
      mesh('glasses', torus(0.045, 0.01), outline, [-0.02, 0.5, 0.21]),
      mesh('glasses', torus(0.045, 0.01), outline, [0.09, 0.5, 0.21]),
      mesh('backpack', box(0.24, 0.26, 0.1), material('pack', '#0a6fd1'), [0, 0.38, -0.22]),
    ),
    kid(
      'nia',
      '#ff4f6d',
      '#d92e4f',
      mesh('headband', torus(0.19, 0.025), white, [0, 0.58, 0], [Math.PI / 2, 0, 0]),
      mesh('ponytail', capsule(0.045, 0.12), hair, [-0.18, 0.52, -0.1], [0, 0, 0.6]),
    ),
    kid(
      'milo',
      '#22c768',
      '#0e7a3c',
      mesh('helmet', sphere(0.205, 16), metal, [0, 0.52, 0], [0, 0, 0], [1, 0.75, 1]),
      mesh('helmet-band', torus(0.2, 0.025), metalLight, [0, 0.52, 0], [Math.PI / 2, 0, 0]),
      bolt,
    ),
    kid(
      'pip',
      '#9b5cff',
      '#7a3ae0',
      mesh(
        'plane',
        cone(0.08, 0.26, 3),
        white,
        [0.05, 0.86, 0],
        [Math.PI / 2, 0, -0.3],
        [1, 1, 0.3],
      ),
    ),
    kid('classmate', '#a0a8bd', '#8a93a8'),
  ];
}

async function write(name, nodes) {
  const scene = new THREE.Scene();
  scene.add(...nodes);
  const glb = await new GLTFExporter().parseAsync(scene, { binary: true });
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, name), Buffer.from(glb));
  console.log(`${name}: ${(glb.byteLength / 1024).toFixed(1)} kB`);
}

await write('classroom.glb', room());
materials.clear();
geometries.clear();
if (!roomBase) await write('cast.glb', cast());

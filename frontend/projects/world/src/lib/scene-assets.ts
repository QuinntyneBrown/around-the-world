import {
  AnimationClip,
  type Material,
  type Mesh,
  MeshLambertMaterial,
  type MeshStandardMaterial,
  type Object3D,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { type SceneTemplates } from './classroom-scene';
import { type Palette } from './palette';
import { releaseTree } from './release';

/**
 * Where the classroom's scenes are, on the game's own origin (L2-036 criterion 5): glTF binary
 * files exported from Blender (docs/adr/0028). Relative to the document, so they follow the game's base href.
 */
export const SCENE_PATHS = {
  room: 'classroom/classroom.glb',
  cast: 'classroom/cast.glb',
} as const;

/**
 * Loads both scenes. Each material becomes the cheap Lambert form of itself, coloured from the
 * design tokens by its name (docs/adr/0028); the scene's own colour stays where no token is
 * set. When the signal aborts, whatever arrived is disposed and the promise rejects.
 */
export async function loadScenes(palette: Palette, signal: AbortSignal): Promise<SceneTemplates> {
  const loader = new GLTFLoader();
  const loaded = await Promise.allSettled([
    loader.loadAsync(SCENE_PATHS.room),
    loader.loadAsync(SCENE_PATHS.cast),
  ]);
  const scenes = loaded.flatMap((result) =>
    result.status === 'fulfilled' ? [result.value.scene] : [],
  );
  if (scenes.length < loaded.length || signal.aborted) {
    for (const scene of scenes) releaseTree(scene);
    throw new Error('A scene of the classroom did not load');
  }
  const [room, cast] = scenes.map((scene) => cheapen(scene, palette));
  const walks = new Map<string, AnimationClip>();
  const castFile = loaded[1];
  if (castFile.status === 'fulfilled') {
    for (const root of cast.children) {
      const kid = root.name.replace(/^kid-/, '');
      const tracks = castFile.value.animations.flatMap((clip) =>
        clip.tracks.filter((track) => track.name.startsWith(kid + '_')),
      );
      if (tracks.length) walks.set(kid, new AnimationClip('walk', -1, tracks));
    }
  }
  return { room, cast, walks };
}

/** Swaps every material for a Lambert one of the same name and colour, and disposes the old. */
function cheapen(scene: Object3D, palette: Palette): Object3D {
  const swapped = new Map<Material, Material>();
  scene.traverse((node) => {
    const mesh = node as Mesh;
    if (!mesh.isMesh) return;
    const old = mesh.material as MeshStandardMaterial;
    let cheap = swapped.get(old);
    if (!cheap) {
      const lambert = new MeshLambertMaterial({
        name: old.name,
        color: old.color,
        map: old.map,
        vertexColors: old.vertexColors,
        transparent: old.transparent,
        opacity: old.opacity,
        depthWrite: !old.transparent,
      });
      const colour = palette.material(old.name);
      if (colour) lambert.color.setStyle(colour);
      swapped.set(old, lambert);
      old.dispose();
      cheap = lambert;
    }
    mesh.material = cheap;
  });
  return scene;
}

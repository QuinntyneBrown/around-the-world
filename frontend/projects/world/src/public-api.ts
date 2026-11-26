/*
 * Public API of @atw/world: the 3D classroom's renderer, drawn with Three.js. It depends on
 * @atw/api only, and `game` reaches it only through a dynamic `import()` bound to
 * `CLASSROOM_RENDERER`, so Three.js is in none of the initial chunks (L2-047 criterion 2).
 */
import { type ClassroomRenderer } from '@atw/api';
import { ThreeClassroomRenderer } from './lib/three-classroom-renderer';

export { ThreeClassroomRenderer } from './lib/three-classroom-renderer';

/** A new renderer for one screen's canvas. */
export function createClassroomRenderer(): ClassroomRenderer {
  return new ThreeClassroomRenderer();
}

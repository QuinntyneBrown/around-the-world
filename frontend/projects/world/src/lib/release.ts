import { type Material, type Object3D, type Texture } from 'three';

/**
 * Disposes every geometry, material and texture under a node (L2-048 criterion 3). A part
 * shared by several meshes is disposed once; disposing it twice does no harm either.
 */
export function releaseTree(root: Object3D): void {
  const released = new Set<object>();
  root.traverse((node) => {
    const mesh = node as Partial<{
      geometry: { dispose(): void };
      material: Material | Material[];
    }>;
    if (mesh.geometry && !released.has(mesh.geometry)) {
      released.add(mesh.geometry);
      mesh.geometry.dispose();
    }
    const materials = Array.isArray(mesh.material)
      ? mesh.material
      : mesh.material
        ? [mesh.material]
        : [];
    for (const material of materials) releaseMaterial(material, released);
  });
}

/** Disposes a material and every texture it holds. */
export function releaseMaterial(material: Material, released = new Set<object>()): void {
  if (released.has(material)) return;
  released.add(material);
  for (const value of Object.values(material)) {
    const texture = value as Partial<Texture> | null;
    if (texture && typeof texture === 'object' && texture.isTexture && !released.has(texture)) {
      released.add(texture);
      texture.dispose?.();
    }
  }
  material.dispose();
}

import { Group, Mesh, MeshLambertMaterial, Texture } from 'three';
import { releaseTree } from './release';

it('releases a decoded face shared by two materials when leaving the classroom', () => {
  const close = vi.fn();
  const texture = new Texture({ close } as unknown as ImageBitmap);
  const root = new Group();
  root.add(new Mesh(undefined, new MeshLambertMaterial({ map: texture })));
  root.add(new Mesh(undefined, new MeshLambertMaterial({ map: texture })));
  releaseTree(root);
  expect(close).toHaveBeenCalledTimes(1);
});

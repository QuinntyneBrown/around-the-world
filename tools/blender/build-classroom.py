"""Furnish the perspective classroom. The orthographic map uses the open tabletop.

Run blender -b -P tools/blender/build-classroom.py from the repository root.
The script preserves the named desk, rug and landmark templates in classroom.glb.
"""

import bpy
import math
import random
import re
import subprocess
import tempfile
from pathlib import Path

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
target = Path("frontend/projects/game/public/classroom/classroom.glb").resolve()
# Rebuild the shared landmark and desk templates from their original model source.
with tempfile.TemporaryDirectory() as directory:
    subprocess.run(
        ["node", "tools/make-classroom-stand-in.mjs", "--room-base", directory],
        cwd="frontend",
        check=True,
    )
    bpy.ops.import_scene.gltf(filepath=str(Path(directory) / "classroom.glb"))

# Use exactly the curved land outlines in the map illustration. The SVG plan
# projects floor depth at half scale, so undo that projection for the rug.
for obj in list(bpy.data.objects["rug"].children):
    if obj.name.startswith("land-"):
        bpy.data.objects.remove(obj, do_unlink=True)
map_art = Path(
    "frontend/projects/components/src/lib/world-map/world-map.html"
).read_text()
for number, (shade, path_data) in enumerate(
    re.findall(r'class="art-(land-\d)"\s+d="([^"]+)"', map_art)
):
    coords = list(map(float, re.findall(r"-?\d+(?:\.\d+)?", path_data)))
    x, y = coords[:2]
    points = [(x, y)]
    for i in range(2, len(coords), 4):
        cx, cy, dx, dy = coords[i : i + 4]
        for sample in range(1, 9):
            t = sample / 8
            points.append(
                (
                    x + 2 * (1 - t) * t * cx + t * t * dx,
                    y + 2 * (1 - t) * t * cy + t * t * dy,
                )
            )
        x, y = x + dx, y + dy
    if math.dist(points[0], points[-1]) < 0.001:
        points.pop()
    mesh = bpy.data.meshes.new("embroidered continent")
    mesh.from_pydata(
        [((x - 600) / 100, (402 - y) / 50, 0.031) for x, y in points],
        [],
        [tuple(range(len(points)))],
    )
    mesh.update()
    if mesh.polygons[0].normal.z < 0:
        mesh.polygons[0].flip()
    mesh.materials.append(bpy.data.materials[shade])
    obj = bpy.data.objects.new(f"continent-{number}", mesh)
    scene.collection.objects.link(obj)
    obj.parent = bpy.data.objects["rug"]
pieces = []
materials = {}
rng = random.Random(14)


def paint(obj, shade):
    if shade not in materials:
        material = bpy.data.materials.new("classroom-" + shade)
        rgb = [((n / 255 + 0.055) / 1.055) ** 2.4 for n in bytes.fromhex(shade)]
        material.diffuse_color = (*rgb, 1)
        materials[shade] = material
    obj.data.materials.append(materials[shade])
    pieces.append(obj)
    return obj


def block(at, size, shade, bevel=0.035):
    bpy.ops.mesh.primitive_cube_add(size=1, location=at)
    obj = bpy.context.object
    obj.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    edge = obj.modifiers.new("rounded joinery", "BEVEL")
    edge.width = min(bevel, min(size) * 0.23)
    edge.segments = 2
    bpy.ops.object.modifier_apply(modifier=edge.name)
    return paint(obj, shade)


def globe(at, size, shade):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=10, location=at)
    obj = bpy.context.object
    obj.scale = size
    for poly in obj.data.polygons:
        poly.use_smooth = True
    return paint(obj, shade)


# Soft green boards, warm skirting and daylight from tall windows.
for i in range(30):
    block(
        ((i - 14.5) * 0.58, 0, -0.076),
        (0.573, 18, 0.14),
        rng.choice(["A5D1B7", "B1D9C3", "B9DCC7", "A3CBB1"]),
    )
block((0, 6.8, 2.5), (18, 0.22, 5.1), "B4D8D6")
block((0, 6.55, 0.17), (18, 0.18, 0.34), "DCAB74")
for x in [-6.8, -4.2]:
    block((x, 6.61, 3.05), (2.5, 0.18, 3.45), "D49A65")
    block((x, 6.48, 3.05), (2.23, 0.12, 3.17), "DBEEF2")
    for dx in [-0.93, 0, 0.93]:
        block((x + dx, 6.37, 3.05), (0.075, 0.09, 3.25), "E5B783")
    block((x, 6.38, 3.4), (2.35, 0.1, 0.09), "E5B783")
    block((x, 6.31, 1.38), (2.72, 0.47, 0.14), "DAA878")
block((2.7, 6.52, 3.12), (4.5, 0.24, 2.4), "D89D67")
block((2.7, 6.36, 3.12), (4.28, 0.13, 2.18), "386B61")
block((2.7, 6.23, 1.95), (4.6, 0.34, 0.12), "E0B17C")
for x in [1.7, 2, 2.25]:
    block((x, 6.04, 2.05), (0.17, 0.06, 0.06), "FDE7BB")
# Open cubbies, books and a classroom globe.
for x in [-1.2, 5.9]:
    for h in [0.18, 0.87, 1.56]:
        block((x, 6.02, h), (2.2, 0.75, 0.13), "D2A06F")
    for dx in [-1.04, 1.04]:
        block((x + dx, 6.02, 0.88), (0.12, 0.75, 1.57), "B8845E")
    for row in [0.26, 0.95]:
        for n in range(8):
            height = rng.uniform(0.29, 0.53)
            book = block(
                (x - 0.85 + n * 0.19, 5.84, row + height / 2),
                (0.13, 0.34, height),
                rng.choice(["D46255", "519D9D", "DEAA5B", "6594B7", "82975F"]),
            )
            book.rotation_euler.y = rng.uniform(-0.1, 0.1)
    globe((x, 6.01, 2.12), (0.36, 0.36, 0.36), "54A8BE")
    globe((x - 0.16, 5.76, 2.12), (0.12, 0.09, 0.17), "81AF6A")
    block((x, 6, 1.7), (0.43, 0.38, 0.12), "C89760")
# Pinboard and small pieces of pinned artwork.
block((7, 6.52, 3.03), (2.7, 0.17, 2.09), "D8AD7A")
for i in range(4):
    x, y = 6.45 + (i % 2) * 1.05, 2.61 + (i // 2) * 0.85
    block((x, 6.34, y), (0.68, 0.07, 0.65), "FAE8C9")
    globe((x, 6.28, y), (0.19, 0.035, 0.2), ["E5946C", "75B59D", "78ACCD", "E8C16C"][i])

# Bake a single vertex-colour material for the set to keep browser draw calls bounded.
for obj in pieces:
    colour = obj.data.materials[0].diffuse_color
    layer = obj.data.color_attributes.new(
        name="Paint", type="BYTE_COLOR", domain="POINT"
    )
    for entry in layer.data:
        entry.color = colour
    obj.data.materials.clear()
bpy.ops.object.select_all(action="DESELECT")
for obj in pieces:
    obj.select_set(True)
bpy.context.view_layer.objects.active = pieces[0]
bpy.ops.object.join()
interior = bpy.context.object
interior.name = "classroom-interior"
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
material = bpy.data.materials.new("painted-classroom")
material.use_nodes = True
paint_node = material.node_tree.nodes.new("ShaderNodeVertexColor")
paint_node.layer_name = "Paint"
material.node_tree.links.new(
    paint_node.outputs["Color"],
    material.node_tree.nodes["Principled BSDF"].inputs["Base Color"],
)
interior.data.materials.append(material)
bpy.ops.export_scene.gltf(filepath=str(target), export_animations=False)

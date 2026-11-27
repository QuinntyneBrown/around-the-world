"""Project the approved Character Sheet face onto the front of a sculpted head.

Bounds are fractions of the existing full-resolution portraits, from temple to
temple and hairline to chin. The rear cranium, ears, hair and hat remain modeled.
"""

import bpy
import math
from pathlib import Path
import numpy as np

PORTRAITS = {
    # left, top, right, bottom
    "zuri": (0.391, 0.245, 0.739, 0.615),
    "kenji": (0.309, 0.269, 0.694, 0.610),
    "nia": (0.321, 0.211, 0.676, 0.622),
    "milo": (0.329, 0.271, 0.697, 0.574),
    "pip": (0.337, 0.267, 0.682, 0.615),
}


def portrait_face(kid, parent):
    source = Path("frontend/projects/game/public/img") / f"kid-{kid}-stage.jpg"
    image = bpy.data.images.load(str(source.resolve()))
    width, height = image.size
    left, top, right, bottom = PORTRAITS[kid]
    raw = np.empty(width * height * 4, dtype=np.float32)
    image.pixels.foreach_get(raw)
    original = raw.reshape(height, width, 4)
    # Blender images are bottom-up. Keep just the facial crop in a small local atlas.
    pixels = original[
        np.linspace((1 - bottom) * height, (1 - top) * height, 256).astype(int)[
            :, None
        ],
        np.linspace(left * width, right * width, 256).astype(int),
    ]
    # Replace flat stage colour at a temple with the nearest painted skin or hair.
    # The full portraits have different blue, green, red, violet and yellow stages.
    backdrop = original[height // 2, 2, :3]
    mask = np.linalg.norm(pixels[:, :, :3] - backdrop, axis=2) < 0.19
    for row in range(256):
        good = np.flatnonzero(~mask[row])
        if len(good):
            for col in np.flatnonzero(mask[row]):
                pixels[row, col] = pixels[row, good[np.argmin(abs(good - col))]]
    face_image = bpy.data.images.new(kid + "-face", width=256, height=256, alpha=False)
    face_image.pixels.foreach_set(np.ascontiguousarray(pixels).ravel())
    face_image.pack()
    bpy.data.images.remove(image)
    mat = bpy.data.materials.new(kid + "-portrait")
    mat.use_nodes = True
    tex = mat.node_tree.nodes.new("ShaderNodeTexImage")
    tex.image = face_image
    surface = mat.node_tree.nodes.get("Principled BSDF")
    mat.node_tree.links.new(tex.outputs["Color"], surface.inputs["Base Color"])
    surface.inputs["Roughness"].default_value = 0.81
    vertices, faces, uvs = [], [], []
    across, down = 32, 24
    for j in range(down + 1):
        latitude = (j / down - 0.5) * math.pi * 0.98
        v = math.sin(latitude)
        for i in range(across + 1):
            yaw = (i / across - 0.5) * math.pi
            u = math.sin(yaw) * math.cos(latitude)
            x = 0.186 * u
            z = 0.635 + 0.185 * v
            front = math.cos(yaw) * math.cos(latitude)
            # A softly projecting nose and cheeks give the portrait a three-quarter profile.
            nose = 0.033 * math.exp(-((u / 0.20) ** 2 + ((v + 0.12) / 0.21) ** 2))
            cheek = 0.012 * math.exp(
                -(((abs(u) - 0.44) / 0.28) ** 2) - ((v + 0.18) / 0.24) ** 2
            )
            vertices.append((x, -(0.157 * front + 0.002 + nose + cheek), z))
            uvs.append((0.5 + 0.5 * u, 0.5 + 0.5 * v))
            if i and j:
                a = j * (across + 1) + i
                faces.append((a - across - 2, a - across - 1, a, a - 1))
    mesh = bpy.data.meshes.new(kid + "_face")
    mesh.from_pydata(vertices, [], faces)
    mesh.materials.append(mat)
    layer = mesh.uv_layers.new(name="Portrait")
    for polygon in mesh.polygons:
        polygon.use_smooth = True
        for loop in polygon.loop_indices:
            layer.data[loop].uv = uvs[mesh.loops[loop].vertex_index]
    obj = bpy.data.objects.new(kid + "_face", mesh)
    bpy.context.collection.objects.link(obj)
    obj.parent = parent

"""Build the classroom-scale cast and its loopable walk in Blender.

Run from the repository root: blender -b -P tools/blender/build-cast.py
Each rigid limb is a separate animated mesh. All pieces share one vertex-colour
material so the classroom can draw a whole dressed character in five batches.
"""

import bpy
import math
import random
import json
import struct
import tempfile
import shutil
from pathlib import Path
from mathutils import Vector, Matrix
import runpy

portrait_face = runpy.run_path(str(Path(__file__).with_name("portrait-face.py")))[
    "portrait_face"
]

TAU = math.tau
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.frame_start, scene.frame_end, scene.render.fps = 1, 25, 24
material = bpy.data.materials.new("painted-clay")
material.use_nodes = True
surface = material.node_tree.nodes.get("Principled BSDF")
colours = material.node_tree.nodes.new("ShaderNodeVertexColor")
colours.layer_name = "Paint"
material.node_tree.links.new(colours.outputs["Color"], surface.inputs["Base Color"])
surface.inputs["Roughness"].default_value = 0.63


def linear(hex_colour):
    channels = bytes.fromhex(hex_colour)
    return [
        ((v / 255 + 0.055) / 1.055) ** 2.4 if v > 10 else v / 3294.6 for v in channels
    ] + [1]


class Sculpt:
    """Accumulate ellipsoids and round swept strokes into a single smooth mesh."""

    def __init__(self):
        self.vertices, self.faces, self.paint = [], [], []

    def oval(self, at, size, colour, tilt=0, segments=12, rings=8):
        base = len(self.vertices)
        rotation = Matrix.Rotation(tilt, 3, "Y")
        for row in range(rings + 1):
            lat = math.pi * row / rings
            for col in range(segments):
                lon = TAU * col / segments
                offset = Vector(
                    (
                        size[0] * math.sin(lat) * math.cos(lon),
                        size[1] * math.sin(lat) * math.sin(lon),
                        size[2] * math.cos(lat),
                    )
                )
                self.vertices.append(Vector(at) + rotation @ offset)
                self.paint.append(linear(colour))
        for row in range(rings):
            for col in range(segments):
                a = base + row * segments + col
                b = base + row * segments + (col + 1) % segments
                self.faces.append((a, a + segments, b + segments, b))

    def stroke(self, points, radius, colour):
        points = [Vector(p) for p in points]
        base = len(self.vertices)
        for i, point in enumerate(points):
            tangent = (
                points[min(i + 1, len(points) - 1)] - points[max(0, i - 1)]
            ).normalized()
            normal = tangent.cross(Vector((0, 1, 0)))
            if normal.length < 0.01:
                normal = tangent.cross(Vector((1, 0, 0)))
            normal.normalize()
            side = tangent.cross(normal)
            for k in range(8):
                a = k * TAU / 8
                self.vertices.append(
                    point + radius * (math.cos(a) * normal + math.sin(a) * side)
                )
                self.paint.append(linear(colour))
        for i in range(len(points) - 1):
            for k in range(8):
                a = base + i * 8 + k
                b = base + i * 8 + (k + 1) % 8
                self.faces.append((a, b, b + 8, a + 8))

    def finish(self, name, parent):
        mesh = bpy.data.meshes.new(name)
        mesh.from_pydata(self.vertices, [], self.faces)
        mesh.materials.append(material)
        for polygon in mesh.polygons:
            polygon.use_smooth = True
        paint = mesh.color_attributes.new(
            name="Paint", type="BYTE_COLOR", domain="POINT"
        )
        for entry, rgba in zip(paint.data, self.paint):
            entry.color = rgba
        obj = bpy.data.objects.new(name, mesh)
        scene.collection.objects.link(obj)
        obj.parent = parent
        return obj


REST = {}

CAST = [
    ("zuri", "94593D", "302022", "FFC83D", "4A5067"),
    ("kenji", "E8B389", "29272D", "2878AD", "354661"),
    ("nia", "A5684C", "382729", "E64761", "3E455F"),
    ("milo", "EAC4A7", "73513E", "42995D", "55505A"),
    ("pip", "F2C3A3", "75462E", "9758C9", "5C4776"),
    ("classmate", "BF8C68", "493B35", "8595AE", "42516A"),
]


def head(body, kid, skin, hair, shirt):
    z = 0.635
    body.oval((0, 0, z), (0.185, 0.154, 0.19), skin, segments=24, rings=16)
    for sign in [-1, 1]:
        body.oval((sign * 0.175, -0.005, z - 0.005), (0.039, 0.034, 0.058), skin)
        body.oval((sign * 0.185, -0.028, z - 0.005), (0.022, 0.011, 0.034), "BC8066")
        if kid == "classmate":
            x = sign * 0.067
            body.oval(
                (x, -0.139, z + 0.011), (0.044, 0.020, 0.040), "FFF2DE", sign * 0.08
            )
            body.oval((x, -0.155, z + 0.012), (0.026, 0.012, 0.031), "775038")
            body.oval((x, -0.164, z + 0.014), (0.017, 0.008, 0.023), "291E22")
            body.oval((x - 0.007, -0.171, z + 0.025), (0.007, 0.004, 0.007), "FFF9E8")
            body.stroke(
                [
                    (x - 0.035, -0.139, z + 0.061),
                    (x - 0.008, -0.153, z + 0.073),
                    (x + 0.03, -0.140, z + 0.066),
                ],
                0.009,
                hair,
            )
    if kid == "classmate":
        # A soft cheek plane and a shallow open smile give expression at card distance.
        for side in [-1, 1]:
            body.oval((side * 0.098, -0.109, z - 0.031), (0.043, 0.023, 0.030), skin)
        body.oval((0, -0.140, z - 0.065), (0.046, 0.012, 0.021), "814141")
        body.oval((0, -0.152, z - 0.058), (0.035, 0.005, 0.006), "FFF0D8")
        body.oval((0, -0.155, z - 0.024), (0.031, 0.033, 0.027), skin)
        body.stroke(
            [
                (-0.055, -0.139, z - 0.058),
                (-0.03, -0.148, z - 0.070),
                (0, -0.151, z - 0.073),
                (0.031, -0.147, z - 0.067),
                (0.055, -0.136, z - 0.054),
            ],
            0.007,
            "79443E",
        )
    body.oval((0, 0.023, z + 0.093), (0.188, 0.151, 0.125), hair)
    rng = random.Random(kid)
    if kid in ("zuri", "nia"):
        layers = (
            [(17, 0.166, 0.73), (14, 0.13, 0.79), (9, 0.073, 0.831)]
            if kid == "zuri"
            else [(15, 0.154, 0.747)]
        )
        for count, r, height in layers:
            for i in range(count):
                a = TAU * i / count
                puff = 0.048 + rng.random() * 0.014 if kid == "zuri" else 0.034
                body.oval(
                    (
                        r * math.cos(a),
                        r * 0.83 * math.sin(a) + 0.022,
                        height + rng.uniform(-0.017, 0.017),
                    ),
                    (puff, puff, puff * 1.12),
                    rng.choice([hair, "443034", "342429"]),
                )
        if kid == "zuri":
            for side in [-1, 1]:
                for row in range(4):
                    for col in range(3):
                        body.oval(
                            (
                                side * (0.153 + rng.uniform(0, 0.025)),
                                0.005 + col * 0.052,
                                0.736 - row * 0.038 + rng.uniform(-0.01, 0.01),
                            ),
                            (0.047, 0.052, 0.049),
                            rng.choice(["372329", "442C2A", "51332C"]),
                        )
        if kid == "nia":
            for sign in [-1, 1]:
                for i in range(6):
                    body.oval(
                        (sign * (0.16 + 0.008 * i), 0.067, 0.68 - i * 0.041),
                        (0.043 - i * 0.003, 0.043 - i * 0.003, 0.053),
                        hair,
                    )
            band = [
                (
                    0.176 * math.cos(t),
                    0.143 * math.sin(t),
                    0.751 + 0.024 * math.cos(t) ** 2,
                )
                for t in [TAU * i / 32 for i in range(33)]
            ]
            body.stroke(band, 0.016, shirt)
    else:
        for i in range(11):
            a = i * TAU / 11
            body.oval(
                (
                    0.142 * math.cos(a),
                    0.11 * math.sin(a),
                    0.758 + rng.uniform(-0.012, 0.012),
                ),
                (0.052, 0.052, 0.09),
                hair,
                rng.uniform(-0.8, 0.8),
            )
    if kid == "milo":
        body.oval((0, 0.014, 0.801), (0.204, 0.179, 0.14), "8C9189")
        for i in range(28):
            angle = TAU * i / 28
            rib = [
                (
                    0.204 * math.cos(angle) * math.cos(t),
                    0.014 + 0.179 * math.sin(angle) * math.cos(t),
                    0.801 + 0.141 * math.sin(t),
                )
                for t in [j * 1.48 / 12 for j in range(13)]
            ]
            body.stroke(rib, 0.0035, "A4A598")
        for i in range(32):
            a = TAU * i / 32
            body.oval(
                (0.192 * math.cos(a), 0.169 * math.sin(a) + 0.012, 0.777),
                (0.018, 0.017, 0.035),
                "9EA099",
            )


def build(kid, skin, hair, shirt, pants):
    root = bpy.data.objects.new("kid-" + kid, None)
    scene.collection.objects.link(root)
    body = Sculpt()
    body.oval(
        (0, 0.005, 0.362), (0.147, 0.111, 0.176), "E7A068" if kid == "kenji" else shirt
    )
    if kid == "kenji":
        for z in [0.32, 0.37, 0.415]:
            a = math.sqrt(1 - ((z - 0.362) / 0.176) ** 2)
            body.stroke(
                [
                    (0.147 * a * math.cos(t), 0.005 + 0.111 * a * math.sin(t), z)
                    for t in [TAU * j / 32 for j in range(33)]
                ],
                0.009,
                "F2C38F",
            )
    if kid == "nia":
        body.stroke(
            [
                (-0.072, -0.063, 0.471),
                (-0.044, -0.088, 0.444),
                (0, -0.093, 0.439),
                (0.044, -0.088, 0.444),
                (0.072, -0.063, 0.471),
            ],
            0.008,
            "FFE3D6",
        )
    if kid in ("zuri", "pip"):
        body.stroke(
            [
                (-0.073, -0.089, 0.314),
                (-0.052, -0.100, 0.329),
                (0.050, -0.100, 0.329),
                (0.073, -0.089, 0.314),
            ],
            0.004,
            "B77F41" if kid == "zuri" else "765398",
        )

    body.oval((0, 0, 0.491), (0.066, 0.064, 0.059), skin)
    if kid in ("zuri", "pip", "milo"):
        body.oval((0, 0.04, 0.477), (0.138, 0.097, 0.045), shirt)
        for side in [-1, 1]:
            body.stroke(
                [(side * 0.031, -0.079, 0.475), (side * 0.039, -0.102, 0.39)],
                0.005,
                "F7E6C9",
            )
    if kid == "kenji":
        for x in [-0.095, 0.095]:
            body.oval((x, -0.064, 0.4), (0.027, 0.036, 0.095), "3A7474", x)
        body.oval((0, 0.086, 0.375), (0.139, 0.09, 0.14), "3E7675")
    head(body, kid, skin, hair, shirt)
    if kid != "classmate":
        portrait_face(kid, root)
    body.finish(kid + "_body", root)
    for side in [-1, 1]:
        x = side * 0.082
        thigh_length, shin_length = 0.116, 0.115
        thigh = Sculpt()
        thigh.oval((0, 0, -0.052), (0.057, 0.059, 0.084), pants)
        hip = thigh.finish(f"{kid}_hip_{side}", root)
        hip.location = (x, 0, 0.251)
        calf = Sculpt()
        calf.oval((0, 0, -0.046), (0.047, 0.049, 0.077), pants)
        knee = calf.finish(f"{kid}_knee_{side}", hip)
        knee.location.z = -thigh_length
        shoe = Sculpt()
        shoe.oval(
            (0, -0.019, 0.004),
            (0.060, 0.083, 0.039),
            "F3D05B" if kid == "pip" else shirt,
        )
        shoe.oval((0, -0.023, -0.022), (0.062, 0.086, 0.016), "FAE6CD")
        for y in [-0.035, -0.054]:
            shoe.stroke(
                [(-0.028, y, 0.030), (0.026, y - 0.005, 0.030)], 0.005, "FFF1CF"
            )
        foot = shoe.finish(f"{kid}_shoe_{side}", root)
        foot.location.x = x
        arm = Sculpt()
        arm.oval(
            (side * 0.018, 0, -0.061),
            (0.048, 0.054, 0.087),
            skin if kid == "nia" else shirt,
            -side * 0.16,
        )
        arm.oval((side * 0.034, -0.007, -0.146), (0.042, 0.047, 0.059), skin)
        arm.oval(
            (side * 0.012, -0.038, -0.143), (0.018, 0.022, 0.030), skin, -side * 0.24
        )
        if side == -1 and kid == "zuri":
            arm.stroke(
                [(0.038, -0.015, -0.195), (-0.045, -0.053, 0.048)], 0.012, "FFBA3B"
            )
            arm.stroke(
                [(-0.045, -0.053, 0.048), (-0.048, -0.055, 0.062)], 0.007, "3A2A2A"
            )
        if side == -1 and kid == "pip":
            arm.stroke(
                [
                    (-0.113, -0.124, -0.083),
                    (0.024, 0.045, -0.126),
                    (-0.124, -0.012, -0.13),
                    (-0.113, -0.124, -0.083),
                ],
                0.011,
                "FFF7E9",
            )
            arm.oval((-0.046, -0.035, -0.115), (0.077, 0.058, 0.009), "FFF7E9", -0.17)
        if side == 1 and kid == "milo":
            arm.oval((0.024, -0.056, -0.218), (0.048, 0.037, 0.041), "BAC1BB")
            for dx in [-0.030, 0.030]:
                arm.oval((0.024 + dx, -0.067, -0.252), (0.023, 0.032, 0.015), "6C756E")
            arm.oval((0.024, -0.060, -0.14), (0.07, 0.048, 0.064), "9CA59E")
            arm.oval((0.024, -0.103, -0.139), (0.053, 0.014, 0.035), "394747")
            for dx in [-0.022, 0.022]:
                arm.oval((0.024 + dx, -0.116, -0.135), (0.011, 0.005, 0.011), "A6F38B")
            arm.stroke(
                [(0.025, -0.06, -0.084), (0.035, -0.06, -0.049)], 0.006, "525953"
            )
        hand = arm.finish(f"{kid}_arm_{side}", root)
        hand.location = (side * 0.132, 0.003, 0.454)
        # Solve a two-link leg at each sample. The hip stays attached to the
        # torso while the planted shoe supports the moving body.
        for frame in range(0, 26):
            phase = (frame - 1) / 24 * TAU
            stride = side * math.cos(phase) if frame else 0
            lift = 0.046 * max(0, -side * math.sin(phase)) ** 2 if frame else 0
            pitch = -0.22 * stride
            sole = min(
                v.y * math.sin(pitch) + v.z * math.cos(pitch) for v in shoe.vertices
            )
            foot.location.y = -0.10 * stride
            foot.location.z = -sole + lift
            foot.rotation_euler.x = pitch
            drop = hip.location.z - foot.location.z
            reach = math.hypot(drop, foot.location.y)
            cosine = (thigh_length**2 + reach**2 - shin_length**2) / (
                2 * thigh_length * reach
            )
            thigh_angle = math.atan2(foot.location.y, drop) - math.acos(
                min(1, max(-1, cosine))
            )
            hip.rotation_euler.x = thigh_angle
            knee.rotation_euler.x = (
                math.atan2(
                    foot.location.y - thigh_length * math.sin(thigh_angle),
                    drop - thigh_length * math.cos(thigh_angle),
                )
                - thigh_angle
            )
            hand.rotation_euler.x = 0.58 * stride
            for obj in (hip, knee, foot, hand):
                if frame == 0:
                    REST[obj.name] = dict(
                        translation=[obj.location.x, obj.location.z, -obj.location.y],
                        rotation=[
                            math.sin(obj.rotation_euler.x / 2),
                            0,
                            0,
                            math.cos(obj.rotation_euler.x / 2),
                        ],
                    )
                else:
                    obj.keyframe_insert(data_path="rotation_euler", frame=frame)
                    if obj == foot:
                        obj.keyframe_insert(data_path="location", frame=frame)
        for obj in (hip, knee, foot, hand):
            obj.animation_data.action.name = obj.name + "_stride"


for definition in CAST:
    build(*definition)
scene.frame_set(1)
target = Path("frontend/projects/game/public/classroom/cast.glb").resolve()
# Keep the geometry binary and the five small face maps on the game's origin.
# Embedded GLB textures would require blob URLs under the deployed CSP.
with tempfile.TemporaryDirectory() as directory:
    folder = Path(directory)
    bpy.ops.export_scene.gltf(
        filepath=str(folder / "cast.gltf"),
        export_format="GLTF_SEPARATE",
        export_texture_dir="faces",
        export_image_format="JPEG",
        export_jpeg_quality=88,
        export_animation_mode="SCENE",
        export_frame_range=True,
    )
    doc = json.loads((folder / "cast.gltf").read_text())
    for node in doc["nodes"]:
        if node.get("name") in REST:
            node.update(REST[node["name"]])
    data = (folder / doc["buffers"][0].pop("uri")).read_bytes()
    shutil.copytree(folder / "faces", target.parent / "faces", dirs_exist_ok=True)
    manifest = json.dumps(doc, separators=(",", ":")).encode()
    manifest += b" " * (-len(manifest) % 4)
    data += b"\0" * (-len(data) % 4)
    target.write_bytes(
        struct.pack("<4sII", b"glTF", 2, 28 + len(manifest) + len(data))
        + struct.pack("<I4s", len(manifest), b"JSON")
        + manifest
        + struct.pack("<I4s", len(data), b"BIN\0")
        + data
    )

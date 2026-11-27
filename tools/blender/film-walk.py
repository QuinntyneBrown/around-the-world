"""Render a side view of the shipping walk for the game-plan film."""

import bpy
import math
from pathlib import Path
from mathutils import Vector

root = Path(__file__).resolve().parents[2]
cache = root / ".cache/game-plan/stride"
cache.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
bpy.ops.import_scene.gltf(
    filepath=str(root / "frontend/projects/game/public/classroom/cast.glb")
)
kid = bpy.data.objects["kid-zuri"]
for obj in list(scene.objects):
    if obj != kid and obj not in kid.children_recursive:
        obj.hide_render = True
for part in kid.children_recursive:
    if part.animation_data:
        anim = part.animation_data
        strip = anim.nla_tracks[0].strips[0]
        anim.action = strip.action
        anim.action_slot = strip.action_slot
        anim.use_nla = False
        curves = anim.action.layers[0].strips[0].channelbag(anim.action_slot).fcurves
        for curve in curves:
            curve.modifiers.new("CYCLES")
kid.rotation_mode = "XYZ"
kid.rotation_euler.z = math.radians(62)
direction = Vector((math.sin(kid.rotation_euler.z), -math.cos(kid.rotation_euler.z), 0))
# Five steps in two and a half seconds. Keep the supporting shoe planted.
for frame in range(1, 62):
    scene.frame_set(frame)
    half_stride = (frame - 1) / 12
    steps = math.floor(half_stride)
    fraction = half_stride - steps
    distance = 0.2 * steps + 0.1 * (1 - math.cos(math.pi * fraction))
    kid.location = direction * (distance - 0.50)
    kid.keyframe_insert(data_path="location", frame=frame)
scene.frame_end = 61
scene.render.fps = 24


def material(name, rgb):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    surface = mat.node_tree.nodes["Principled BSDF"]
    surface.inputs["Base Color"].default_value = (*rgb, 1)
    surface.inputs["Roughness"].default_value = 0.72
    mat.diffuse_color = (*rgb, 1)
    return mat


def panel(name, pos, scale, mat):
    bpy.ops.mesh.primitive_cube_add(size=1, location=pos)
    ob = bpy.context.object
    ob.name = name
    ob.dimensions = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    bevel = ob.modifiers.new("Soft edges", "BEVEL")
    bevel.width = 0.012
    bevel.segments = 3
    ob.data.materials.append(mat)
    return ob


floor = material("Mint floor", (0.39, 0.68, 0.57))
cream = material("Warm ivory", (0.94, 0.85, 0.63))
panel("Floor", (0, 0, -0.061), (18, 18, 0.12), floor)
for i in range(-9, 10):
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=24, radius=0.031, depth=0.006, location=(i * 0.19, 0.01, 0.001)
    )
    bpy.context.object.data.materials.append(cream)
panel("Wall", (0, 2.4, 1.2), (12, 0.15, 2.6), material("Sky", (0.49, 0.76, 0.82)))
wood = material("Joinery", (0.62, 0.35, 0.16))
panel("Chalkboard frame", (1, 2.2, 1.2), (2.25, 0.1, 0.9), wood)
panel(
    "Chalkboard",
    (1, 2.13, 1.2),
    (2.17, 0.06, 0.82),
    material("Slate", (0.04, 0.20, 0.18)),
)
for x in [-1.8, -0.9]:
    panel("Window", (x, 2.22, 1.32), (0.8, 0.08, 1.4), wood)
    panel(
        "Glass",
        (x, 2.16, 1.32),
        (0.73, 0.06, 1.32),
        material("Daylight", (0.91, 0.95, 0.90)),
    )
    panel("Mullion", (x, 2.09, 1.32), (0.033, 0.04, 1.32), wood)
    panel("Mullion", (x, 2.09, 1.42), (0.76, 0.04, 0.038), wood)
for x in [-1.1, 0.75]:
    panel("Desk top", (x, 0.8, 0.4), (0.75, 0.44, 0.065), wood)
    for dx in [-0.29, 0.29]:
        for dy in [-0.15, 0.15]:
            panel("Desk leg", (x + dx, 0.8 + dy, 0.19), (0.045, 0.045, 0.38), wood)
cam = bpy.data.objects.new("Walk camera", bpy.data.cameras.new("Walk camera"))
scene.collection.objects.link(cam)
scene.camera = cam
cam.location = (0.58, -2.7, 0.78)
cam.rotation_euler = (
    (Vector((0, 0, 0.45)) - cam.location).to_track_quat("-Z", "Y").to_euler()
)
cam.data.lens = 56
cam.data.dof.use_dof = True
cam.data.dof.focus_distance = 2.77
cam.data.dof.aperture_fstop = 3.5


def softbox(name, location, power, size, color):
    data = bpy.data.lights.new(name, "AREA")
    data.energy = power
    data.shape = "DISK"
    data.size = size
    data.color = color
    obj = bpy.data.objects.new(name, data)
    scene.collection.objects.link(obj)
    obj.location = location
    obj.rotation_euler = (
        (Vector((0, 0, 0.4)) - obj.location).to_track_quat("-Z", "Y").to_euler()
    )


softbox("Afternoon window", (-2, -2.4, 3.5), 320, 2.2, (1, 0.89, 0.72))
softbox("Sky fill", (2, -1.4, 2), 130, 2, (0.76, 0.88, 1))
softbox("Hair light", (1, 1, 2.5), 210, 1.4, (1, 0.82, 0.55))
scene.world = bpy.data.worlds.new("Studio")
scene.world.color = (0.23, 0.27, 0.29)
scene.render.engine = "CYCLES"
scene.cycles.samples = 8
scene.cycles.use_denoising = True
scene.render.resolution_x = 960
scene.render.resolution_y = 676
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.filepath = str(cache / "frame-")
scene.frame_set(1)
bpy.ops.render.render(animation=True)

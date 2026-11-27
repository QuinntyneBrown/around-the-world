"""Sample the shipped glTF at 20 instants per kid and check contact and toe clearance."""

from pathlib import Path
import bpy

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
bpy.ops.import_scene.gltf(
    filepath=str(Path("frontend/projects/game/public/classroom/cast.glb").resolve())
)
for obj in scene.objects:
    if obj.animation_data:
        anim = obj.animation_data
        strip = anim.nla_tracks[0].strips[0]
        anim.action = strip.action
        anim.action_slot = strip.action_slot
        anim.use_nla = False
for root in [o for o in scene.objects if o.name.startswith("kid-")]:
    kid = root.name[4:]
    shoes = [bpy.data.objects[f"{kid}_shoe_{side}"] for side in [-1, 1]]
    raised = [0, 0]
    worst = 0
    for i in range(20):
        time = 1 + i * 24 / 20
        scene.frame_set(int(time), subframe=time % 1)
        soles = [
            min((shoe.matrix_world @ v.co).z for v in shoe.data.vertices)
            for shoe in shoes
        ]
        worst = max(worst, abs(min(soles)))
        assert abs(min(soles)) < 0.002, (kid, time, soles)
        for side, z in enumerate(soles):
            if z > 0.02:
                raised[side] += 1
    assert min(raised) >= 4, (kid, raised)
    print(
        f"{kid}: 20 samples, supported within {worst * 1000:.2f} mm, clear swing samples {raised}"
    )

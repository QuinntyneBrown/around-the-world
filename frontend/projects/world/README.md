# @atw/world

The 3D classroom's renderer, drawn with Three.js
(`docs/detailed-designs/classroom/draw-classroom/`, `docs/adr/0028`). It depends on `@atw/api`
only, and `game` imports it dynamically, through `CLASSROOM_RENDERER`, when a screen first draws
the classroom: Three.js and the renderer are in none of the initial chunks.

- `ThreeClassroomRenderer`: the WebGL renderer, its one animation loop (paused while the page is
  hidden), and the release of everything it acquired.
- `ClassroomScene`: the floor, the rug, the dotted path and the ring of desks, each with its
  country's landmark, and a `KidCharacter` for each figure.
- `KidCharacter`: one kid in the kid's colour, with the five animations.
- `QualityScaler`: steps the detail down below 30 frames a second.
- `RoomPlan`: the room's measures, shared with World Map's drawn room.
- `loadScenes`: the two glTF scenes from the game's own origin (`classroom/*.glb`).

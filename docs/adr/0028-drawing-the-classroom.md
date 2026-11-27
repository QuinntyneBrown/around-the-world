# 0028. Drawing the classroom: the scenes' format and paths, the stand-in, the countries, one plan for the room, the hop's look and the detail's steps

- **Status:** Accepted
- **Date:** 2026-11-26

## Context

`L2-036` asks for the classroom as a 3D scene of a ring of desks, each with its country's
landmark, loaded when first needed, with a still picture and words on a device that cannot draw
it, and its detail scaled back below 30 frames a second. `L2-037` asks for the cast as animated
characters. `docs/detailed-designs/classroom/draw-classroom/` leaves `<TO SUPPLY>` the format
and paths of the exported scenes, which countries and landmarks a tour holds, the look of the
hop's movement, and the order, size and floor of the detail's steps. The original implementation used generated primitives until the Blender cast and furnishings were available.

The design draws World Map's room in the 3D scene and its name tags, plaques and messages as
interface (`tour/travel-round-ring`), but journey 05 built the whole room as an SVG drawing,
`WorldMap` in `@atw/components`, whose labels sit at the positions `RoomLayout` computes
(ADR 0023). The design also proposes a `ClassroomBackdrop` component and a skeleton on World Map
while the classroom loads, and its contract plays animations by `KidId`, though two players of a
room may share a kid (`L2-013`).

## Decision

- **Format and paths.** The classroom's scenes are glTF 2.0 binary files on the game's own
  origin (`L2-036` criterion 5), in `frontend/projects/game/public/classroom/`, served at
  `classroom/classroom.glb` and `classroom/cast.glb` relative to the base href.
  - `classroom.glb` holds the parts the ring is built from: `floor`, `rug`, `path-dot`, `desk`,
    `shadow` (a baked blob shadow) and `landmark-<country>` for each country (the country's name
    in lower case, letters only: `landmark-usa`), each standing on its origin, in metres.
  - `cast.glb` holds `kid-zuri`, `kid-kenji`, `kid-nia`, `kid-milo`, `kid-pip` and
    `kid-classmate`, each standing on its origin and facing +z, with the kid's one accessory
    (Zuri's pencil and puffs, Kenji's glasses and backpack, Nia's headband and ponytail, Milo's
    helmet, Pip's paper plane); `kid-milo` holds his robot `bolt` (`L2-037` criterion 3).
  - Materials are named by role (`kid-body`, `kid-deep`, `desk-top`, `floor`, `hair`, ...).
    The renderer colours each from the design tokens read on its canvas (`--color-kid-*`,
    `--color-classmate`, `--palette-art-*`), the same tokens World Map's drawn room uses, so a
    colour lives in one place; a material with no token keeps the scene's colour (the
    landmarks). Every material is drawn as a Lambert material, the cheap form of lighting.
  - A part whose name ends in `-detail` (a smile, a rug's rings, a landmark's small parts) is
    left out at the low level of detail.
- **Blender production assets.** The Blender scripts in `tools/blender/` build the furnished room and six cast models. Vertex colours retain the skin, clothing and accessory colours in a single material per kid. Each kid has four animated limbs with keyframes exported in glTF. The browser plays the Blender walk in step with distance travelled and releases its animation mixer with the figure. The separate overhead view keeps the desk layout, rug and country landmarks visible. Duel frames its two players across their desk.
- **Countries and landmarks.** A tour of n desks holds the first n of the 24 countries of
  `domain`'s `tour/countries.ts`, desk 1 first, each with the landmark that list gives it (the
  mocks' cast, ADR 0022): France to Peru for 12, and Mexico to Chile after them for 24. Home's
  classroom is the default tour's 12 desks, with Zuri travelling beside desk 2, Kenji holding
  it, and Nia, Milo and Pip at desks 12, 3 and 11, each idle (`ClassroomStates.atRest`). The
  list is the cast, not a rule (`AGENTS.md`).
- **One plan for the room.** The desks stand on a circle of 4.2 m round the rug, desk 1 at the
  front and the others clockwise; a seated kid stands 0.36 m behind its desk and the dotted path
  is the circle moved 0.76 m to the front. World Map looks down at 30° with an orthographic
  camera at 100 px a metre, so the circle is drawn as `RoomLayout`'s ellipse (420 by 210 px
  round 600, 402 in a plan of 1200 by 760) and the camera frames the same rectangle of the plan
  as the SVG's `viewBox`, with `meet` for the whole room and `slice` for the zoom to the child's
  kid. `RoomPlan` in `@atw/world` and `RoomLayout` in `@atw/components` hold the same numbers;
  `components` may import no value from another library, so a change to one is made in both.
- **World Map over the 3D room.** World Map keeps `WorldMap`: while the classroom loads, the
  drawn room stands in for it (it already shows every position, so the design's skeleton is not
  needed), and once the classroom is drawn, `WorldMap` with `labelsOnly` draws only its name
  tags and plaques, over the 3D room. On a device that cannot draw it, World Map shows the still
  picture named "A picture of the classroom" and the alert "The map is having a rest", as the
  mock `world-map/error` draws, with the standings still giving every position.
- **Behind the interface.** Home's view looks at the whole ring from the front; Duel's from
  outside the ring over the desk of the duel, with the duellists in front and the room behind,
  under Duel's scrim. The kids turn to face the camera behind the interface and face the front
  on World Map.
- **The contract.** `ClassroomRenderer` is `mount(canvas)`, `show(state, view)` and
  `dispose()`. What each kid is doing is part of the state: each `ClassroomFigure` carries its
  player id (not its kid), its spot, its animation and, for a hop, where it hops from. Duel's
  state gives the traveller and the desk holder `thinking` while the card is open, then the
  winner `winCheer` and the other `soClose` (both `soClose` when nobody answered); World Map's
  gives the move it shows as a hop from where the figure was. Everyone else is `idle`.
- **The canvas directive.** In place of a `ClassroomBackdrop` component, the page places a
  `<canvas atwClassroom>` (`ClassroomCanvas`, in `game`) in its own markup, beside its still
  picture, so the mocks' classes (`home__picture`, `duel__scene`, `world-map__fallback`) stay
  the page's. The directive loads the renderer through `CLASSROOM_RENDERER` once the screen is
  shown, emits `drawn` or `still`, picks World Map's zoom below 768 px (`L2-034` criterion 5)
  and disposes the renderer with the canvas. The page fades the canvas in over the picture.
- **Walking between desks.** The traveller follows the dotted ring in six steps over 1.4 seconds, as in the Magic Patterns World Map frame, facing the direction of travel with alternating footfalls. A kid changing seats walks directly to the seat. Reduced motion uses the 200 ms fade in ADR 0029.
- **The detail's steps.** `QualityScaler` measures windows of 2 seconds; below 30 frames a
  second it takes the next step and measures again. The steps are: resolution 1.5 (never above
  the device's), shadow map, full detail; resolution 1; blob shadows in place of the 512 px
  shadow map; small decorations left out and resolution 0.75; resolution 0.5. The last step
  still draws the whole classroom: the classroom never gives up for the still picture because
  it is slow. A gap of more than a second (a hidden page) is a pause, not a slow frame. The
  detail never steps back up, and the step a device reaches is where the next screen with the
  classroom starts in that visit.
- **Release.** `dispose()` cancels the `requestAnimationFrame` loop, removes the
  `visibilitychange` listener and the `ResizeObserver`, disposes every geometry, material and
  texture of both scenes and every material the scene made, disposes the renderer (and its
  shadow map's render target) and loses the WebGL context, so the device gets the memory back
  at once. The loop pauses while the page is hidden. The `world` chunk stays loaded; the scenes
  are fetched again (from the browser's cache) by the next screen, so nothing is held between
  screens.
- **Tests.** The fixture's `classroom` holds back or refuses the scenes, takes WebGL away
  (`cannotDraw()`), and counts the WebGL contexts not yet lost (`openContexts()`); the
  classroom itself is drawn by Chromium's own WebGL (SwiftShader where there is no GPU). The
  scene, the cast, the plan and the scaler have unit tests in `@atw/world`, under jsdom with no
  WebGL.

## Consequences

- The game loads the Blender exports at the original paths. Each portrait uses a small texture cropped from the approved Character Sheet and fitted to its sculpted head. The texture files are served on the game origin. On scene teardown the renderer releases both the GPU texture and its decoded bitmap.
- The `world` library joins the dependency direction (`game` → `world` → `api`), enforced by
  ESLint, as `AGENTS.md` already describes it. Since `game` reaches it only through `import()`,
  ESLint's boundaries now count a dynamic `import()` as a dependency too, so no other library
  can reach `world` that way. Three.js and the renderer are one lazy chunk of
  about 640 kB raw; the initial bundle grew by 0.15 kB, for the token and its loader.
- World Map's labels and the 3D room agree only while `RoomPlan` and `RoomLayout` agree.
- Every behaviour spec that opens Home, Duel or World Map now draws the classroom with
  SwiftShader; the scaler steps the detail down there, which keeps the specs' cost small.

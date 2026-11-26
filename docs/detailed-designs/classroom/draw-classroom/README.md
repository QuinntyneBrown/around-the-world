# Draw the classroom

## Overview

Around the World is the classroom flash-card game as a web game for children aged 10 to 12. The
classroom is a ring of desks, and each desk is a country with its landmark. This feature draws
that classroom as a 3D scene and draws the cast in it. Home and Duel show the classroom behind
the interface, World Map shows it from above, and no other screen shows a classroom.

- **classroom** — 3D scene of a ring of desks, built in Blender and drawn with Three.js
- **desk** — one place in the ring; each desk is a different country with its landmark
- **kid** — one of the five children a player picks: Zuri (yellow), Kenji (blue), Nia (red), Milo (green, with his robot Bolt) and Pip (purple)
- **cast** — the five kids as animated 3D characters
- **further classmate** — classmate who is not one of the five kids
- **interface** — panels, buttons and text of a screen, drawn in front of the classroom
- **still picture** — flat image of the classroom shown when the 3D scene is absent
- **renderer** — code that draws the classroom on a canvas

The classroom is decoration with a job: it shows where everyone sits and who is travelling. It
is never something the game waits for. The interface is usable before the classroom arrives, a
still picture stands in on a device that cannot draw it, and its detail is scaled back until
it draws smoothly on a low-power device.

The feature sits in the `classroom` subsystem. `classroom/play-motion-and-sound` owns when a
hop, a cheer or a "so close" plays; this feature owns the scene those animations play in. The
positions it draws come from `tour/travel-round-ring`.

## Description

The slice is not built yet; the components below are the ones the design introduces. The slice
runs wholly on the device and has no backend part. Every asset of the classroom is requested
from the game's own origin (`L2-036` criterion 5, `L2-041` criterion 4).

Contract and types in the `api` library (`@atw/api`):

- **`ClassroomRenderer`** — contract of the renderer.
  - `mount(canvas, view): Promise<void>` loads the scenes and starts drawing; it rejects when
    the device has no WebGL or a scene fails to load.
  - `show(state: ClassroomState): void` places the kids at their desks.
  - `play(kid: KidId, animation: KidAnimation): Promise<void>` plays one animation.
  - `dispose(): void` stops the animation loop and disposes every geometry, material, texture,
    render target and the renderer itself (`L2-048` criterion 3).
- **`CLASSROOM_RENDERER`** — token bound in `game`'s `app.config.ts` to a loader,
  `() => Promise<ClassroomRenderer>`, that imports `@atw/world` dynamically. The binding holds
  no reference to Three.js, so the renderer and its scenes are in none of the initial chunks
  (`L2-036` criterion 2, `L2-047` criterion 2).
- **`ClassroomState`** — the desks in order from desk 1, each with its country, and for each
  desk who is seated at it: one of the five kids, a further classmate, or nobody. Exactly one
  desk is empty, apart from the desk of each player removed from a game with friends, which
  stays empty (`L2-007` criterion 6). The state also holds the traveller, the desk it stands
  beside and the kid of the device's own player. It holds no nickname.
- **`KidAnimation`** — `idle`, `thinking`, `hop`, `winCheer`, `soClose` (`L2-037`
  criterion 2).
- **`ClassroomView`** — which part of the room a screen shows: `behind`, the classroom behind
  the interface of Home and Duel; `fromAbove`, the whole room on World Map from 768 px; or
  `fromAboveZoomed`, World Map zoomed to the player's own kid and filling the screen below
  768 px (`L2-034` criterion 5).

In the `world` library (`@atw/world`), which depends on `api` only:

- **`ThreeClassroomRenderer`** — implementation of `ClassroomRenderer` with Three.js. It
  creates the WebGL renderer on the canvas it is given, runs one `requestAnimationFrame` loop
  and delegates the content to `ClassroomScene`. It pauses the loop while the page is hidden.
- **`ClassroomScene`** — loads the classroom built in Blender and lays out the ring: one desk
  for each country of the tour, each with its landmark (`L2-036` criterion 1, `L2-007`
  criterion 1). The format of the exported scenes and their paths are `<TO SUPPLY>`.
  - *Countries and landmarks.* The cast of the mocks runs from desk 1: France, Egypt, Japan,
    UK, Italy, USA, Brazil, India, Kenya, China, Australia and Peru, then Mexico, Norway,
    Greece, Canada, Spain, Russia, Thailand, Turkey, Morocco, Iceland, Korea and Chile for a
    tour of 24 (`docs/mocks/README.md`). The mocks name one landmark, the Statue of Liberty
    for USA. The list is the cast, not a rule; which countries a tour holds, and the landmark
    of each, are `<TO SUPPLY>`.
  - *From above.* World Map shows a floor, a rug that is a world map, the ring of desks and a
    dotted path. Each desk holder is at their desk, and the traveller stands beside a desk,
    on the path (`L2-034` criterion 1). The desk the traveller is at and the next stop are
    lit. The name tags, the country plaques and the messages over the room are interface and
    belong to `tour/travel-round-ring`.
  - *Behind the interface.* On Duel the classroom sits behind a scrim, which keeps the
    interface over it readable. On Home it fills the area `player/find-way-through-screens`
    gives it.
- **`KidCharacter`** — one kid in the scene: the kid's model, the kid's colour and the five
  animations. Milo's `KidCharacter` always includes his robot Bolt (`L2-037` criterion 3). The
  brief for the 3D characters is the *Character Sheet* that `AGENTS.md` names.
  - *On World Map.* Each kid is a small bean-bodied character in the kid's colour with the
    kid's one accessory (`L2-037` criterion 5). The name tag over it, which gives the kid's
    name, or "You" for the player, is interface and belongs to `tour/travel-round-ring`. The
    `hop` animation moves the traveller along the dotted path to the next desk;
    `classroom/play-motion-and-sound` gives its time (`L2-038` criterion 1). The mocks draw
    the kid before and after the hop and leave the movement between to this design
    (`docs/mocks/README.md`, departure 10). The look of that movement is `<TO SUPPLY>`.
  - *Further classmate.* On World Map a further classmate is a plain bean-bodied character
    in a calmer colour, with no accessory and no name tag (`L2-037` criterion 6).
- **`QualityScaler`** — measures the frame rate of the loop. When the classroom draws below
  30 frames a second for 2 seconds, it steps the detail down, through resolution, shadows and
  level of detail, and measures again until the classroom draws at 30 or more (`L2-036`
  criterion 4). The order and the size of the steps, the lowest step, and whether detail is
  ever stepped back up are `<TO SUPPLY>`. The cheap form of a technique (baked lighting, lower
  resolution, fewer samples, level of detail) is chosen before the technique is dropped.

In the `game` application:

- **`ClassroomBackdrop`** — component each screen that shows the classroom places behind its
  interface: `HomePage` and `DuelPage` with the view `behind`, and `WorldMapPage` with a view
  from above (`L2-036` criterion 6). No other page places it, so no other screen loads any
  part of the `world` library. It injects `CLASSROOM_RENDERER`; a presentation component
  cannot, so it lives in the application. It takes a `ClassroomState` and a `ClassroomView`
  as inputs and exposes `status`: `loading`, `drawn` or `still`.
  1. On Home and Duel it renders the still picture at once, so the screen has a background
     from its first frame. On World Map a skeleton in the shape of the room stands in, the
     header reads "Drawing the classroom…" and the standings are skeletons (`L2-031`
     criterion 4).
  2. After the screen is usable, it calls the loader and `mount`. The interface never waits
     for either (`L2-036` criterion 2).
  3. When `mount` resolves, the canvas fades in.
  4. When the loader or `mount` rejects, the still picture stands in for as long as the
     screen does, and the game is fully playable (`L2-036` criterion 3). The screen says so
     in words, as a status and not as an alert. Home reads "The 3D classroom is having a
     rest" and "You're seeing a picture of it instead. The game plays just the same." World
     Map reads "The map is having a rest" and "The standings below still show where everyone
     is, and the game carries on.", and its standings still give every position. The mocks
     draw no such words on Duel.
  5. When the component is destroyed, it calls `dispose()` and drops the canvas. A `mount`
     still in progress is abandoned and disposed when it settles.

  The still pictures are `scene-classroom.jpg`, for Home and World Map, and `scene-duel.jpg`,
  for Duel; the mocks hold both in `docs/mocks/assets/img/`. On Home and Duel the canvas and
  the still picture are hidden from assistive technology. On World Map the room is one image
  whose label gives the tour length, where the player is and who is travelling, and the still
  picture is named "A picture of the classroom". Everything the classroom shows is also
  carried by the interface in words.

Colours of the cast. Each kid has one colour: Zuri yellow, Kenji blue, Nia red, Milo green and
Pip purple (`L2-037` criterion 1). The colours are design tokens in
`docs/design-system/tokens/tokens.css` and are read by role, never as a hex value in a
component. Each kid has a bright colour, a deeper shade of it and a tag pair. The bright colour
is for marks: the kid's place on the world ring, the timer bar and the background of the kid's
picture. Button faces and name tags use the deeper shade with white text, and yellow keeps navy
text, because white text on the bright colours has too little contrast (`docs/mocks/README.md`,
departures 1 and 2). A further classmate has a calmer colour of its own. The screens around the
classroom use light sky blue backgrounds, white panels and navy text. The contrast of each pair
is measured in `docs/design-system/tokens/contrast-pairs.json` (`L2-051` criterion 6).

`KidTag` uses the kid's tag pair for the name tag, `WorldRing` the bright colour for the kid's
place on the world ring, `TimerBar` the bright colour for the timer bar, and `KidCharacter` the
kid's colour for the character. Wherever a kid's colour carries a state, a name or a label
carries the same state (`L2-037` criterion 4): the tag shows the kid's name, and beside the
world ring and the timer bar the Duel screen names the traveller and the desk holder in words.

Memory. The classroom is the heaviest thing the game allocates. Entering and leaving a screen
with the classroom 20 times shall leave the heap no more than 10% above its size after the
first time (`L2-048` criterion 4); that heap check runs only when a person asks for it.

The classroom follows the mocks `docs/mocks/pages/home/` (states `default`, `loading`, `error`),
`docs/mocks/pages/duel/` (every state, behind its scrim) and `docs/mocks/pages/world-map/`
(states `default`, `hop`, `sit`, `desk-holder`, `short`, `long`, `loading`, `error`). In the
mocks a picture stands in for the 3D classroom.

## Requirements

The feature realizes the following level-2 (L2) requirements. Each L2 requirement refines a
level-1 (L1) requirement, cited by identifier.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-036` | `L1-010` | The 3D classroom: the classroom shall be a 3D scene of a ring of desks, each with its country's landmark, drawn behind the interface; its renderer and scenes shall be loaded when first needed and not in the initial bundle, with the interface usable before they arrive; on a device that cannot draw it, a still picture shall stand in, the screen shall say so in words (Home: "The 3D classroom is having a rest"; World Map: "The map is having a rest", with the standings still giving every position) and the game shall be fully playable; its detail shall be scaled back when it draws below 30 frames a second for 2 seconds; its assets shall come from the game's own origin; Home and Duel shall show the classroom behind the interface, World Map shall show the classroom from above, and the other screens shall show no classroom. |
| `L2-037` | `L1-010` | The cast: each of the five kids shall have one colour (Zuri yellow, Kenji blue, Nia red, Milo green, Pip purple), used for their name tag, their place on the world ring and their timer bar; a kid in the classroom shall have the matching animation for each moment (idle, thinking, hop, win cheer and "so close"); Milo shall be shown with his robot Bolt; a name or a label shall carry any state a kid's colour carries; on World Map a kid shall be a small bean-bodied character in the kid's colour with the kid's one accessory, under a name tag that gives the kid's name, or "You" for the player; on World Map a classmate who is not one of the five kids shall be a plain bean-bodied character in a calmer colour, with no accessory and no name tag. |

## Diagrams

### System context

A child sees the classroom in Around the World. The slice involves no other system: the
classroom's assets come from the game's own origin.

![C4 system context for drawing the classroom](diagrams/c4-context.png)

### Containers

The `game` application loads the `world` library and the classroom's assets from its own
origin when the classroom is first needed. The diagram shows no backend container, because the
slice makes no request to `AroundTheWorld.Api`.

![C4 container view for drawing the classroom](diagrams/c4-container.png)

### Components

`ClassroomBackdrop` shows the still picture, then loads `ThreeClassroomRenderer` through
`CLASSROOM_RENDERER`. The renderer delegates the ring and the cast to `ClassroomScene` and
`KidCharacter`, and `QualityScaler` adjusts its detail.

![C4 component view for drawing the classroom](diagrams/c4-component.png)

### Class structure

`ThreeClassroomRenderer` realizes `ClassroomRenderer` and owns one `ClassroomScene` and one
`QualityScaler`. The scene owns one `KidCharacter` for each kid or further classmate shown, and
each `DeskState` names who holds the desk, with exactly one desk empty.

![Class diagram for drawing the classroom](diagrams/class-structure.png)

### Behaviour — draw the classroom on a screen

Home, Duel and World Map place `ClassroomBackdrop`; the sequence is the same for each, with
the view the screen asks for. A still picture or a skeleton is shown first and the interface is
usable at once. The renderer arrives later. A device that cannot draw the scene keeps the still
picture, Home and World Map say so in words, and leaving the screen disposes everything.

![Sequence diagram for drawing the classroom](diagrams/sequence-draw-classroom.png)

### Behaviour — scale the detail back

`QualityScaler` measures each frame and steps the detail down after 2 seconds below 30 frames
a second, until the classroom draws at 30 or more.

![Sequence diagram for scaling the detail back](diagrams/sequence-scale-detail-back.png)

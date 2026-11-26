# 0013. Home's and Pick Your Kid's loading and error states follow their pictures

- **Status:** Accepted
- **Date:** 2026-11-26

## Context

The mocks draw a loading state for Home ("Getting your kid…") and Pick Your Kid ("Getting the
kids…"), and an error state for Pick Your Kid ("The kids' pictures didn't load"). The kid and
the nickname are read synchronously from the device (ADR 0011), so the only thing that arrives
is the pictures: the classroom's still picture on Home until journey 09 draws the 3D classroom,
and the five kids' portraits. `L2-015` criterion 2 asks that an unavailable or unreadable
storage shows no error, so a storage failure cannot be Pick Your Kid's error state.

## Decision

- The pictures are files of `game` (`public/img/`), copied from `docs/mocks/assets/img/`.
- `PictureLoader` (`PICTURE_LOADER`, `@atw/api`) preloads a list of pictures and resolves
  `loaded` when every one has arrived, or `failed` when one could not. Its browser
  implementation, `BrowserPictureLoader` in `game`, uses `Image.decode()` and drops each
  `Image`'s source when its `AbortSignal` fires, so leaving a screen releases what it started.
- Pick Your Kid shows its loading state until the five portraits arrive, and its error state
  (drawn kids, "Try the pictures again") when one fails; a kid can still be picked and
  confirmed. Home shows the chip's skeleton and the classroom's skeleton until the kid's
  portrait and the classroom's picture arrive, with "Play" usable throughout.
- A storage that is unavailable or unreadable gives the defaults and no error (ADR 0011). It
  never shows Pick Your Kid's error state, which belongs to the pictures. This departs from
  journey 02's prompt ("A storage failure shows Pick Your Kid's error state") in favour of the
  requirement.
- Home's error state ("The 3D classroom is having a rest") is the failure of the 3D classroom,
  which journey 09 draws; until then nothing can fail, and the state is built with it.

## Consequences

The specs drive both states by holding or refusing the pictures' requests on localhost. The
`played` state ("Play again") reads `Visit.tourFinished`, which the Podium sets in journey 06.

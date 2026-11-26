# 0011. The player's record is one versioned JSON entry in `localStorage`

- **Status:** Accepted
- **Date:** 2026-11-26

## Context

`docs/detailed-designs/player/pick-kid/` left the browser's storage mechanism and the name of
its key `<TO SUPPLY>`. `L2-015` keeps the kid, the nickname, the setup, the sound setting and
the way of answering on the device and nowhere else, and asks the game to start with the
defaults and no error when the storage is unavailable or unreadable. The record is a few dozen
bytes, read once when the game opens.

## Decision

- `LocalPlayerStorage` keeps the record in `window.localStorage` under the one key
  `atw.player`, as JSON: `{ "version": 1, "kid": "zuri", "nickname": { "adjective": 0,
  "animal": 0 } }`. The nickname is kept as its two list indexes, never as text.
- The storage is reached through the injection token `DEVICE_STORAGE` (`@atw/api`), whose
  factory returns `localStorage`, or `null` when reading it throws (a blocked or private
  browser). The unit tests give it an in-memory `Storage`.
- `read()` checks each field on its own and returns the default for any it cannot read: a kid
  that is not one of the five ids becomes no kid, and a nickname that is not two whole indexes
  inside the lists becomes a newly generated one (`L2-014` criterion 4). A record of another
  `version`, unreadable JSON or a storage that throws gives the defaults. Nothing is shown to
  the child (`L2-015` criterion 2).
- `write()` replaces the whole entry and ignores a failure (a full or blocked storage).
- The record holds the kid and the nickname now. The setup (journey 03), the way of answering
  (journey 07) and the sound setting (journey 10) join it as fields of version 1 when their
  journeys keep them; a missing field reads as its default, so no migration is needed.

`localStorage` rather than IndexedDB: the record is tiny, read once at start, and a synchronous
read lets Home know at once whether a kid is kept, so "Play" leads to the right screen with no
wait (`L2-031` criterion 3).

## Consequences

A child's kid and nickname survive closing the browser and stay on that browser only. The
behaviour specs seed and inspect the entry through the shared fixture's `device` fixture,
never through a selector in a spec.

# 0040. Keeping children safe: the Content Security Policy, a nickname that cannot be built, and the audits

- **Status:** Accepted
- **Date:** 2026-11-27

## Context

Journey 20 proves the safety rules of `L1-012` across everything journeys 01 to 19 built, and
closes the gaps it finds (`L2-040`, `L2-041`, `L2-042`, `L2-046`).
`docs/detailed-designs/platform/keep-children-safe/` left the Content Security Policy's host and
text to supply. Much was already in place and proven feature by feature: nicknames are generated
and never typed (journey 02), answers go to a room as numbers and stickers as ids (journeys 14
and 15), the connection token is held in memory (ADR 0031), speech is recognised on the device
(ADR 0025), no model prompt holds the child (ADR 0030), telemetry is scrubbed (ADR 0037) and the
shared fixture fails any spec whose page asks for anything off localhost (ADR 0006).

The audit found three gaps:

1. **No Content Security Policy.** Nothing in the browser itself refused a request to another
   origin; only the fixture's guard did, and only in the specs.
2. **A nickname that is not two list indexes was shown as "undefined undefined".** The Lobby,
   Duel, World Map and the Podium built a nickname's words by indexing the lists with whatever
   the room sent. The backend refuses such a nickname (`L2-044` criterion 1), but the device did
   not check, so a broken or hostile backend could put words on the screen that were not built
   from the lists.
3. **The build's inline script.** Angular's production build inlines the critical CSS with
   Beasties, which adds an inline `<script>` to switch the full stylesheet on. A policy whose
   `script-src` is the own origin refuses it, so the stylesheet would never apply.

## Decision

**The policy travels with the build, as a `<meta http-equiv>` in `index.html`.** The host that
serves `game` is not chosen (`docs/operations/settings.md`: static files), so a header would be a
duty each host could forget; the meta element applies wherever the build is served, and the
specs prove the very file a child loads. Its text:

```
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self';
font-src 'self'; media-src 'self';
connect-src 'self' https://*.service.signalr.net wss://*.service.signalr.net;
object-src 'none'; base-uri 'self'; form-action 'none'
```

- **`connect-src`** allows the own origin (the API under `/api/`, the hub under `/hubs/`, as
  `'self'` also matches `ws:`/`wss:` on the same host) and Azure SignalR Service's endpoints.
  The service's host name is chosen per deployment, so the policy names the service's own domain
  rather than one endpoint; it is part of the deployed backend and not a third party (ADR 0037).
- **`style-src 'unsafe-inline'`.** Angular adds each component's styles as a `<style>` element
  while the game runs. A nonce (`ngCspNonce`) needs a server that writes a new one into every
  response, which a static host cannot, and a hash cannot name styles made at run time. Inline
  styles can fetch nothing: a `url()` in one still answers to `img-src` and `font-src`, so
  nothing can leave the device through them.
- **`img-src 'self'`.** The 3D scenes carry no textures that the loader turns into `blob:`
  addresses; a scene that does will need `blob:` added here.
- **A header beside it.** A meta element cannot carry `frame-ancestors`. The host should also
  send `Content-Security-Policy: frame-ancestors 'none'`, so no other site frames the game
  (`docs/operations/settings.md`). It is a recommendation for the deployment, outside what a
  spec on localhost can prove.

**Critical CSS is not inlined** (`optimization.styles.inlineCritical: false` in the production
configuration), so the build writes no inline script. The global stylesheet is 20.86 kB, 3.35 kB
compressed; the game draws nothing until `main` has run, which is fetched beside it, so loading
it as a plain stylesheet costs no visible time. Journey 18's specs (Home's Largest Contentful
Paint on a phone on 4G, the first flash card within 20 seconds) stay green. Angular's `autoCsp`
was considered and not taken: it is experimental, and it replaces `<script src>` with a loader
script, which hides `main` from the browser's preload scanner.

**A nickname that is not two indexes inside the lists is never shown: the kid's name stands
in.** `NicknameGenerator.nameOf(player)` gives the nickname's words when the nickname is two whole
indexes inside the lists, and the kid's name otherwise; the Lobby, its messages, Duel, World Map,
a received sticker, "{nickname} dropped out." and the Podium name every player of a room through
it. It is the same text slot in the same component, so no mock changes.

**The audits are behaviour specs**, in `frontend/e2e/specs/keep-children-safe.spec.ts`:

- a request from the page to another origin (data, a stream of events, a picture, a script, a
  font) is refused by the browser under the policy before it leaves (the `@critical` spec CI
  runs);
- the scripts, fonts, pictures and 3D scenes of a solo tour come from the own origin;
- a whole game with friends (typing the code, Mic Check, watching and a sticker, a shouted
  answer, leaving) sends the backend and the room's connection only closed values and the
  connection token: every frame the game sent is read, every string in it must be a code, a kid,
  a setup word, a hub method or SignalR's own word, and no word the child said nor her nickname
  appears anywhere;
- shouted answers are heard on the device (every recognition session sets `processLocally`),
  no recorder is made, nothing heard is kept, nothing is sent, and the microphone is released;
- a nickname sent as markup is shown as the kid's name, and nothing of it is shown or run;
- every state of the sweeps' registry (ADR 0039) has no field but the room code, and no control
  asks for an account, a sign-in, an email address, an age, a real name or money; addresses such
  as `/sign-in` and `/shop` are Not Found;
- words in a model's reply are never shown, said aloud, kept or sent.

The shared fixture gains what these watch: the frames the game sent on the room's connections,
the recognition sessions started off the device, the recorders made and what was given to speech
synthesis. Playwright's WebSocket routing stands in for the page's `WebSocket`, so the browser's
own `connect-src` check of a WebSocket cannot be watched in a spec; `EventSource` stands for it,
under the same directive, and the fixture still fails any spec whose page opens a WebSocket off
localhost.

The backend's acceptance tests (`StoredRoomTests`) play a whole game with friends from devices
behind the ingress that name their browser and address, then read every column of every row of
the store through the converters that write them: a room is its code, setup, game and last
activity, a player their nickname's indexes, kid, position and token (with the host mark, the
time of joining and the connection's id and absence of ADR 0036), and no value holds the
device's address, its browser or a nickname as words. Once every player leaves the Podium, no
row of the room or its players is left.

Each audit that held at its first run was broken by hand once (an answer sent with its words,
recognition off the device, a stored extra column) and failed for that reason.

## Consequences

- A change that fetches from another origin fails in the browser, not only in the specs; a new
  origin needs this ADR amended and the policy changed in the same change.
- The initial bundle is unchanged (`main` 253.53 kB, initial total 274.39 kB).
- A deployed host adds `frame-ancestors 'none'` as a header; `docs/operations/settings.md` says so.
- These are behaviour tests: none scans code for banned APIs (`AGENTS.md`).

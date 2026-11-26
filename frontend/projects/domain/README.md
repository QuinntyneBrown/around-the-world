# @atw/domain

The game and its rules. It depends on `@atw/api` only.

- `questions/`: making a flash card.
- `tour/`: Game Setup's rules (`GameSetupRules`), who wins a duel and the freeze after a wrong
  answer (`Duel`), the game's clock (`GameClock`), the ring, the hop and the sit (`Tour`, with
  its `Standings` and each player's `Passport`), a duel between two classmates
  (`ClassmatesDuel`), the solo game (`SoloGame`), and how a tour ends and its players are
  placed (`Tour.ending`, `Tour.result`, `timeLimitMs`), and what the 3D classroom shows on each
  screen (`ClassroomStates`: the ring at rest on Home, and the tour with each kid's animation).
- `classmates/`: each classmate's profile and agent; the only code that touches the on-device model.
- `voice/`: the only code that touches the microphone or speech recognition.
- `storage/`: the kid, the nickname and the setup kept on the device.

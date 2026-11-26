# @atw/domain

The game and its rules. It depends on `@atw/api` only.

- `questions/`: making a flash card.
- `tour/`: Game Setup's rules (`GameSetupRules`), the solo game (`SoloGame`), and later who wins
  a duel, the hop, the freeze after a wrong answer, how a tour ends.
- `classmates/`: each classmate's profile and agent; the only code that touches the on-device model.
- `voice/`: the only code that touches the microphone or speech recognition.
- `storage/`: the kid, the nickname and the setup kept on the device.

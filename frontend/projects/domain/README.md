# @atw/domain

The game and its rules. It depends on `@atw/api` only.

- `questions/`: making a flash card.
- `tour/`: who wins a duel, the hop, the freeze after a wrong answer, how a tour ends.
- `classmates/`: each classmate's profile and agent; the only code that touches the on-device model.
- `voice/`: the only code that touches the microphone or speech recognition.
- `storage/`: the nickname and kid kept on the device.

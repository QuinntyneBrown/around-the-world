import { ApiError } from '@atw/api';
import { type IconName } from '@atw/components';

/** Why Room could not join the code. */
export type JoinRefusal =
  'not-found' | 'full' | 'started' | 'rate-limited' | 'unreachable' | 'error';

/** What Room says for each refusal, in a child's words, with its icon (docs/mocks/pages/room/). */
export const JOIN_REFUSAL_WORDS: Record<JoinRefusal, { words: string; icon: IconName }> = {
  'not-found': { words: 'Hmm, no room with that code. Check the letters?', icon: 'alert' },
  full: { words: 'That room is full (8 kids max).', icon: 'alert' },
  started: { words: 'That game already started. Ask for the next one!', icon: 'alert' },
  'rate-limited': { words: 'That’s a lot of tries! Wait a moment, then try again.', icon: 'clock' },
  unreachable: {
    words: 'We can’t reach the game right now. Check the internet and try again.',
    icon: 'wifi-off',
  },
  error: { words: 'Something went wrong on our side. Try again in a moment.', icon: 'alert' },
};

/**
 * The refusal a failed join puts Room in (L2-023 criteria 4 to 6 and 9, L2-045 criterion 2):
 * every other code, and anything that is not an `ApiError`, is the generic `error`
 * (L2-054 criterion 2, docs/adr/0032-joining-a-room-and-the-lobby.md).
 */
export function joinRefusal(failure: unknown): JoinRefusal {
  if (!(failure instanceof ApiError)) return 'error';
  switch (failure.code) {
    case 'room_not_found':
      return 'not-found';
    case 'room_full':
      return 'full';
    case 'game_started':
      return 'started';
    case 'rate_limited':
      return 'rate-limited';
    case 'backend_unreachable':
      return 'unreachable';
    default:
      return 'error';
  }
}

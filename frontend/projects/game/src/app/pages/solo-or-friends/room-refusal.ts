import { ApiError } from '@atw/api';

/** What Solo Or Friends shows after "Make a room" failed. */
export type RoomRefusal = 'rate-limited' | 'error';

/**
 * The state a failure of "Make a room" puts Solo Or Friends in: a rate limit, or the error
 * state, whose words serve every other code too (L2-022 criteria 3 and 4, L2-054 criterion 2,
 * docs/adr/0031-making-a-room.md).
 */
export function roomRefusal(failure: unknown): RoomRefusal {
  return failure instanceof ApiError && failure.code === 'rate_limited' ? 'rate-limited' : 'error';
}

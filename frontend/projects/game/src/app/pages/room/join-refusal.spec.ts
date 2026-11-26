import { ApiError } from '@atw/api';
import { joinRefusal } from './join-refusal';

describe('joinRefusal (L2-023, L2-045 criterion 2, L2-054 criterion 2)', () => {
  it.each([
    ['room_not_found', 'not-found'],
    ['room_full', 'full'],
    ['game_started', 'started'],
    ['rate_limited', 'rate-limited'],
    ['backend_unreachable', 'unreachable'],
    ['invalid_code', 'error'],
    ['unknown', 'error'],
  ])('puts Room in the state of %s: %s', (code, refusal) => {
    expect(joinRefusal(new ApiError(code, 400))).toBe(refusal);
  });

  it('treats anything that is not a refusal of the backend as the generic error', () => {
    expect(joinRefusal(new Error('broken'))).toBe('error');
  });
});

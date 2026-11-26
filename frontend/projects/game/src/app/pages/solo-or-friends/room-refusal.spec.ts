import { ApiError } from '@atw/api';
import { roomRefusal } from './room-refusal';

describe('roomRefusal', () => {
  it.each([
    [new ApiError('rate_limited', 429), 'rate-limited'],
    [new ApiError('backend_unreachable', 0), 'error'],
    [new ApiError('no_free_code', 503), 'error'],
    [new ApiError('invalid_kid', 400), 'error'],
    [new ApiError('unknown', 500), 'error'],
    [new Error('anything else'), 'error'],
  ])('shows %o as %s', (failure, state) => {
    expect(roomRefusal(failure)).toBe(state);
  });
});

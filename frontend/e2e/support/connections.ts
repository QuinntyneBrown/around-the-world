import { type Connection } from '../fixtures/test';

/**
 * "A typical school connection" (L2-031 criterion 1): 10 Mbit/s down, 5 Mbit/s up and 40 ms of
 * delay (docs/detailed-designs/player/find-way-through-screens/, docs/adr/0038).
 */
export const SCHOOL_CONNECTION: Connection = { downMbps: 10, upMbps: 5, latencyMs: 40 };

/**
 * "A mid-range phone on a 4G connection" (L2-047 criterion 4): Lighthouse's mobile profile, a
 * slow 4G of 1.6 Mbit/s down, 0.75 Mbit/s up and 150 ms of delay, with the processor
 * four times slower (docs/adr/0038).
 */
export const PHONE_ON_4G: Connection = { downMbps: 1.6, upMbps: 0.75, latencyMs: 150 };
export const MID_RANGE_PHONE_SLOWDOWN = 4;

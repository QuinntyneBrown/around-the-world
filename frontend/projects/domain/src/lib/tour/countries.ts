/**
 * The countries of the desks, in order round the ring: desk n holds the nth, and a tour takes
 * the first 6, 12 or 24 (docs/adr/0020-solo-duel-clock-and-states.md). They are the mocks'.
 */
export const COUNTRIES = [
  'France',
  'Egypt',
  'Japan',
  'UK',
  'Italy',
  'USA',
  'Brazil',
  'India',
  'Kenya',
  'China',
  'Australia',
  'Peru',
  'Mexico',
  'Norway',
  'Greece',
  'Canada',
  'Spain',
  'Russia',
  'Thailand',
  'Turkey',
  'Morocco',
  'Iceland',
  'Korea',
  'Chile',
] as const;

/** The country of desk n, numbered from 1. */
export function countryOfDesk(desk: number): string {
  return COUNTRIES[desk - 1];
}

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

/** Each country's landmark, for its desk and its passport stamp (docs/adr/0022). The mocks'. */
const LANDMARKS: Record<(typeof COUNTRIES)[number], string> = {
  France: 'Eiffel Tower',
  Egypt: 'Pyramids of Giza',
  Japan: 'Mount Fuji',
  UK: 'Big Ben',
  Italy: 'Leaning Tower of Pisa',
  USA: 'Statue of Liberty',
  Brazil: 'Christ the Redeemer',
  India: 'Taj Mahal',
  Kenya: 'Mount Kenya',
  China: 'Great Wall',
  Australia: 'Sydney Opera House',
  Peru: 'Machu Picchu',
  Mexico: 'Chichén Itzá',
  Norway: 'Northern Lights',
  Greece: 'Parthenon',
  Canada: 'CN Tower',
  Spain: 'Sagrada Família',
  Russia: 'Saint Basil’s Cathedral',
  Thailand: 'Grand Palace',
  Turkey: 'Hagia Sophia',
  Morocco: 'Hassan II Mosque',
  Iceland: 'Geysir',
  Korea: 'Gyeongbokgung Palace',
  Chile: 'Easter Island heads',
};

/** The landmark of desk n, numbered from 1. */
export function landmarkOfDesk(desk: number): string {
  return LANDMARKS[COUNTRIES[desk - 1]];
}

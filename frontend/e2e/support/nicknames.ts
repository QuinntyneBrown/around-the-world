/** The two fixed lists of L2-014, for reading a nickname the game shows as words. */
export const ADJECTIVES = [
  'Speedy',
  'Mighty',
  'Clever',
  'Bouncy',
  'Sneaky',
  'Brave',
  'Zippy',
  'Jolly',
  'Cosmic',
  'Turbo',
];
export const ANIMALS = [
  'Otter',
  'Panda',
  'Falcon',
  'Gecko',
  'Llama',
  'Narwhal',
  'Koala',
  'Fox',
  'Penguin',
  'Yak',
];

/** One adjective and one animal from the lists, and nothing else. */
export const A_NICKNAME = new RegExp(`^(${ADJECTIVES.join('|')}) (${ANIMALS.join('|')})$`);

/** The list indexes of a nickname shown as words: "Speedy Otter" is 0 and 0. */
export function indexesOf(words: string): { adjective: number; animal: number } {
  const [adjective, animal] = words.trim().split(' ');
  return { adjective: ADJECTIVES.indexOf(adjective), animal: ANIMALS.indexOf(animal) };
}

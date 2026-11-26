import { type Nickname } from '@atw/api';

/** The adjectives of L2-014, in order: a nickname's `adjective` is an index into it. */
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
] as const;

/** The animals of L2-014, in order: a nickname's `animal` is an index into it. */
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
] as const;

/**
 * Makes and checks nicknames from the two fixed lists of ten (L2-014): 100 nicknames, each two
 * list indexes. A nickname is never typed, so nothing a child writes is ever kept or sent.
 * A pure helper: `game`'s composition root provides one, with `Math.random`.
 */
export class NicknameGenerator {
  /** @param random a number in [0, 1), as `Math.random` gives. */
  constructor(private readonly random: () => number = Math.random) {}

  /** A nickname chosen at random. */
  generate(): Nickname {
    return { adjective: this.pick(ADJECTIVES.length), animal: this.pick(ANIMALS.length) };
  }

  /** A nickname chosen at random that differs from the current one (L2-014 criterion 2). */
  generateOtherThan(current: Nickname): Nickname {
    // One of the 99 others, each as likely: skip past the current one's place.
    const size = ADJECTIVES.length * ANIMALS.length;
    const currentPlace = current.adjective * ANIMALS.length + current.animal;
    let place = this.pick(size - 1);
    if (place >= currentPlace) place += 1;
    return { adjective: Math.floor(place / ANIMALS.length), animal: place % ANIMALS.length };
  }

  /** Whether a value, read from anywhere, is two whole indexes inside the lists. */
  isValid(value: unknown): value is Nickname {
    if (typeof value !== 'object' || value === null) return false;
    const { adjective, animal } = value as Record<string, unknown>;
    return inRange(adjective, ADJECTIVES.length) && inRange(animal, ANIMALS.length);
  }

  /** The nickname as the words a child reads: "Speedy Otter". */
  words(nickname: Nickname): string {
    return `${ADJECTIVES[nickname.adjective]} ${ANIMALS[nickname.animal]}`;
  }

  private pick(size: number): number {
    return Math.min(size - 1, Math.floor(this.random() * size));
  }
}

function inRange(value: unknown, size: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < size;
}

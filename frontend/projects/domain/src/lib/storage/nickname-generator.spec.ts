import { ADJECTIVES, ANIMALS, NicknameGenerator } from './nickname-generator';

describe('NicknameGenerator', () => {
  it('holds the two lists of ten that L2-014 gives', () => {
    expect(ADJECTIVES).toEqual([
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
    ]);
    expect(ANIMALS).toEqual([
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
    ]);
  });

  it.each([
    [0, { adjective: 0, animal: 0 }, 'Speedy Otter'],
    [0.999999, { adjective: 9, animal: 9 }, 'Turbo Yak'],
    [0.5, { adjective: 5, animal: 5 }, 'Brave Narwhal'],
  ])('generates from the lists with the random number %s', (random, nickname, words) => {
    const generator = new NicknameGenerator(() => random);
    expect(generator.generate()).toEqual(nickname);
    expect(generator.words(nickname)).toBe(words);
  });

  it.each([
    [{ adjective: 0, animal: 0 }, 0, { adjective: 0, animal: 1 }],
    [{ adjective: 3, animal: 4 }, 0, { adjective: 0, animal: 0 }],
    [{ adjective: 9, animal: 9 }, 0.999999, { adjective: 9, animal: 8 }],
    [{ adjective: 0, animal: 5 }, 0.05, { adjective: 0, animal: 4 }],
    [{ adjective: 0, animal: 5 }, 0.051, { adjective: 0, animal: 6 }],
  ])('generates another than %o with the random number %s', (current, random, other) => {
    const generator = new NicknameGenerator(() => random);
    expect(generator.generateOtherThan(current)).toEqual(other);
  });

  it('never generates the current nickname, whatever the random number', () => {
    const current = { adjective: 4, animal: 7 };
    for (let step = 0; step < 1000; step += 1) {
      const generator = new NicknameGenerator(() => step / 1000);
      expect(generator.generateOtherThan(current)).not.toEqual(current);
    }
  });

  it.each([
    [{ adjective: 0, animal: 0 }, true],
    [{ adjective: 9, animal: 9 }, true],
    [{ adjective: 10, animal: 0 }, false],
    [{ adjective: 0, animal: -1 }, false],
    [{ adjective: 1.5, animal: 0 }, false],
    [{ adjective: '1', animal: 0 }, false],
    [{ adjective: 1 }, false],
    ['Speedy Otter', false],
    [null, false],
    [undefined, false],
  ])('checks %o as valid: %s', (value, valid) => {
    expect(new NicknameGenerator().isValid(value)).toBe(valid);
  });
});

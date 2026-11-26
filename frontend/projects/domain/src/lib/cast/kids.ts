import { type Kid, type KidId } from '@atw/api';

/** The five kids, in the order Pick Your Kid offers them, as L2-013 gives them. */
export const KIDS: readonly Kid[] = [
  {
    id: 'zuri',
    name: 'Zuri',
    tagline: 'First to shout it!',
    description: 'Bold and loud. Zuri holds her pencil like a sword and never waits to be asked.',
    picture: 'img/kid-zuri.jpg',
  },
  {
    id: 'kenji',
    name: 'Kenji',
    tagline: 'Collects every country',
    description: 'The planner. Kenji pins a badge on his backpack for every desk he reaches.',
    picture: 'img/kid-kenji.jpg',
  },
  {
    id: 'nia',
    name: 'Nia',
    tagline: 'Fastest feet in class',
    description: 'The sprinter. Nia is always mid-jump and already halfway to the next desk.',
    picture: 'img/kid-nia.jpg',
  },
  {
    id: 'milo',
    name: 'Milo',
    tagline: 'Quiet. Then BOOM.',
    description: 'Shy but brilliant. His robot pal Bolt beeps when Milo nails a tricky one.',
    picture: 'img/kid-milo.jpg',
  },
  {
    id: 'pip',
    name: 'Pip',
    tagline: 'Flies to every desk',
    description: 'The dreamer. Pip throws a paper plane ahead to every new country.',
    picture: 'img/kid-pip.jpg',
  },
];

/** The kid with this id. */
export function kidById(id: KidId): Kid {
  const kid = KIDS.find((candidate) => candidate.id === id);
  if (!kid) throw new Error(`No kid ${id}`);
  return kid;
}

import { KID_IDS, type KidId, type TourLength } from '@atw/api';
import { FURTHER_PROFILES, KID_PROFILES, type ClassmateProfile } from './classmate-profile';

/** A classmate seated at a desk at the start of a tour. */
export interface SeatedClassmate {
  readonly desk: number;
  readonly profile: ClassmateProfile;
}

/**
 * Builds the class of a solo tour (L2-007, L2-019 criterion 3, L2-020 criterion 1, ADR 0019):
 * one classmate at each desk from 2 to the tour length, desk 1 being the traveller's own. The
 * four kids the child did not pick sit spread evenly from desk 2, and further classmates hold
 * the desks between them. The same kid and tour length give the same class.
 */
export const ClassFactory = {
  build(picked: KidId, tourLength: TourLength): SeatedClassmate[] {
    const count = tourLength - 1;
    const kids = KID_IDS.filter((kid) => kid !== picked);
    const kidDesks = new Map<number, KidId>(
      kids.map((kid, index) => [2 + Math.floor((index * count) / kids.length), kid]),
    );
    let further = 0;
    const seated: SeatedClassmate[] = [];
    for (let desk = 2; desk <= tourLength; desk++) {
      const kid = kidDesks.get(desk);
      const profile: ClassmateProfile = kid
        ? { id: kid, ...KID_PROFILES[kid] }
        : {
            id: `classmate-${desk}`,
            kid: null,
            ...FURTHER_PROFILES[further++ % FURTHER_PROFILES.length],
          };
      seated.push({ desk, profile });
    }
    return seated;
  },
};

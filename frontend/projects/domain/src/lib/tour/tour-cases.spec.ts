import { type FlashCard } from '@atw/api';
import cases from '../../../../../../docs/specs/tour-cases.json';
import { Duel, type DuelSide } from './duel';
import { Tour } from './tour';

/**
 * The table of cases the device's rules and the server's both play
 * (docs/specs/tour-cases.json, docs/adr/0033-deciding-a-game-on-the-server.md): a rule changed
 * on one side alone fails the other's run.
 */
const PLAYERS = { traveller: 'T', deskHolder: 'H', other: 'O' } as const;

interface AnswerStep {
  readonly by: keyof typeof PLAYERS;
  readonly value: number;
  readonly atMs: number;
  readonly result: string;
}

interface TimeOutStep {
  readonly timeOut: true;
  readonly result: boolean;
}

describe('The shared table of duels', () => {
  for (const duelCase of cases.duels) {
    it(duelCase.id, () => {
      const duel = new Duel(duelCase.card as FlashCard, { traveller: 'T', deskHolder: 'H' });
      for (const step of duelCase.steps as (AnswerStep | TimeOutStep)[]) {
        if ('timeOut' in step) expect(duel.timeOut()).toBe(step.result);
        else expect(duel.give(PLAYERS[step.by], step.value, step.atMs)).toBe(step.result);
      }
      expect(duel.outcome).toBe(duelCase.outcome);
      expect(duel.winner).toBe(duelCase.winner);
    });
  }
});

describe('The shared table of tours', () => {
  for (const tourCase of cases.tours) {
    it(tourCase.id, () => {
      const endsAtMs = 'endsAtMs' in tourCase ? tourCase.endsAtMs : Number.POSITIVE_INFINITY;
      const tour = Tour.start(
        tourCase.tourLength,
        'T',
        tourCase.seated.map((desk) => ({ desk, player: `P${desk}` })),
        endsAtMs,
      );
      for (const duel of tourCase.duels) {
        const move = tour.applyDuel(duel.winner as DuelSide, duel.atMs);
        if ('move' in duel) expect(move).toEqual(duel.move);
      }
      const then = tourCase.then;
      expect(tour.traveller).toBe(then.traveller);
      expect(tour.desk).toBe(then.desk);
      if ('holders' in then) {
        const holders = Array.from({ length: tourCase.tourLength }, (_, i) => tour.holderOf(i + 1));
        expect(holders).toEqual(then.holders);
      }
      for (const [player, distance] of Object.entries(
        ('distances' in then ? then.distances : {}) as Record<string, number>,
      )) {
        expect(tour.distanceOf(player), `distance of ${player}`).toBe(distance);
      }
      for (const [player, stamps] of Object.entries(
        ('stamps' in then ? then.stamps : {}) as Record<string, number[]>,
      )) {
        expect(tour.stampsOf(player), `stamps of ${player}`).toEqual(stamps);
      }
      if ('ordered' in then)
        expect(tour.ordered().map(({ player }) => player)).toEqual(then.ordered);
      expect(tour.ending(then.endingAtMs)).toBe(then.ending);
    });
  }
});

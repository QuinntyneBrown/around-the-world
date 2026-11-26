import { type DuelState, type FlashCard } from '@atw/api';
import { type FlashCardTone } from '@atw/components';

const SIGNS: Record<FlashCard['kind'], string> = { times: '×', plus: '+', minus: '−', divide: '÷' };
const SIGN_WORDS: Record<FlashCard['kind'], string> = {
  times: 'times',
  plus: 'plus',
  minus: 'minus',
  divide: 'divided by',
};

/** The line under a flash card's sum. */
export interface CardLine {
  readonly result?: string;
  readonly emphasis?: string;
  readonly tone: FlashCardTone;
}

/**
 * The words of the Duel screen for a duel (docs/detailed-designs/tour/play-duel/): the sum,
 * the line under it, and what the live region tells a screen reader (L2-051 criterion 4).
 */
export const DuelWords = {
  /** "6 × 4". */
  sum(card: FlashCard): string {
    return `${card.left} ${SIGNS[card.kind]} ${card.right}`;
  },

  /** "6 times 4", the sum's accessible name. */
  sumInWords(card: FlashCard): string {
    return `${card.left} ${SIGN_WORDS[card.kind]} ${card.right}`;
  },

  /** Whether the device's own player won the duel. */
  youWon(duel: DuelState): boolean {
    return duel.outcome === 'won' && duel.winner === duel.role;
  },

  /** The other duellist's name, from the device's player's side. */
  rival(duel: DuelState): string {
    return duel.role === 'deskHolder' ? duel.traveller.name : duel.deskHolder.name;
  },

  /** Where a lost duel leaves the child: "You sit at Italy", or "You keep Italy" (ADR 0022). */
  yourDesk(duel: DuelState): string {
    return duel.role === 'deskHolder' ? `You keep ${duel.country}` : `You sit at ${duel.country}`;
  },

  /**
   * The quiet pill after a lost duel, which opens World Map: "You sit at Italy · Nia travels
   * on", or "You keep Italy · Kenji hops on" for the desk holder (L2-033 criteria 8 and 11).
   */
  pill(duel: DuelState): string | null {
    if (duel.outcome !== 'won' || duel.role === 'watching' || DuelWords.youWon(duel)) return null;
    const rival = DuelWords.rival(duel);
    return duel.role === 'deskHolder'
      ? `${DuelWords.yourDesk(duel)} · ${rival} hops on`
      : `${DuelWords.yourDesk(duel)} · ${rival} travels on`;
  },

  /** The line under the sum (L2-004 5, L2-005 2, L2-033 2 and 3). */
  line(duel: DuelState): CardLine {
    if (duel.outcome === 'timedOut') {
      return { result: `Time’s up! It was ${duel.answer}. Here comes a new card…`, tone: 'timeUp' };
    }
    if (duel.role === 'watching') {
      // A player who is not in the duel watches it (L2-028 criterion 1).
      return duel.outcome === 'won' && duel.winner
        ? { result: `${duel[duel.winner].name} said ${duel.answer} first.`, tone: 'plain' }
        : { result: 'Watching… your turn is next', tone: 'quiet' };
    }
    if (duel.outcome === 'won') {
      return DuelWords.youWon(duel)
        ? { result: `= ${duel.answer}`, emphasis: 'You got it!', tone: 'right' }
        : {
            result: `${DuelWords.rival(duel)} said ${duel.answer} first. So close!`,
            tone: 'plain',
          };
    }
    if (duel.frozen) return { result: `Not ${duel.wrongAnswer}! Frozen for a sec…`, tone: 'wrong' };
    return { tone: 'quiet' };
  },

  /** What the live region says (docs/detailed-designs/tour/play-duel/). */
  announcement(duel: DuelState): string {
    const sum = DuelWords.sum(duel.card);
    if (duel.outcome === 'timedOut')
      return `Time is up. It was ${duel.answer}. A new card is coming.`;
    if (duel.role === 'watching') {
      return duel.outcome === 'won' && duel.winner
        ? `${duel[duel.winner].name} said ${duel.answer} first.`
        : `You are watching. ${duel.traveller.name} against ${duel.deskHolder.name}: ${sum}.`;
    }
    if (duel.outcome === 'won') {
      return DuelWords.youWon(duel)
        ? `${sum} is ${duel.answer}. You got it!`
        : `${DuelWords.rival(duel)} said ${duel.answer} first. ${DuelWords.yourDesk(duel)}.`;
    }
    if (duel.frozen) return `Not ${duel.wrongAnswer}. Frozen for one second.`;
    return `New card: ${sum}.`;
  },
};

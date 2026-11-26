import { type FlashCard } from '@atw/api';
import { FlashCardMaker } from '../questions/flash-card-maker';

/** How long a wrong answer freezes the player who gave it (L2-004). */
export const FREEZE_MS = 1000;

/** What one answer did to a duel. */
export type AnswerResult = 'ignored' | 'wrong' | 'won';

/** Which of the two players of a duel. */
export type DuelSide = 'traveller' | 'deskHolder';

/**
 * One duel between the traveller and the desk holder over one flash card, and the only place
 * on the device where a duel is decided (docs/detailed-designs/tour/play-duel/). It reads no
 * clock: each answer brings the time it was given, so its tests need no waiting.
 */
export class Duel {
  readonly answer: number;
  private decided: { outcome: 'won'; winner: DuelSide } | { outcome: 'timedOut' } | null = null;
  private readonly frozenUntil: Record<DuelSide, number> = { traveller: 0, deskHolder: 0 };

  constructor(
    readonly card: FlashCard,
    private readonly players: Record<DuelSide, string>,
  ) {
    this.answer = FlashCardMaker.answerOf(card);
  }

  get outcome(): 'open' | 'won' | 'timedOut' {
    return this.decided?.outcome ?? 'open';
  }

  get winner(): DuelSide | null {
    return this.decided?.outcome === 'won' ? this.decided.winner : null;
  }

  /** Which side the player is on, or null when they are neither (L2-001 criterion 3). */
  sideOf(player: string): DuelSide | null {
    if (player === this.players.traveller) return 'traveller';
    if (player === this.players.deskHolder) return 'deskHolder';
    return null;
  }

  /** Whether the player is frozen at that time. */
  isFrozen(player: string, atMs: number): boolean {
    const side = this.sideOf(player);
    return side !== null && atMs < this.frozenUntil[side];
  }

  /** When the player's freeze ends, or 0 when they were never frozen. */
  unfreezesAt(player: string): number {
    const side = this.sideOf(player);
    return side === null ? 0 : this.frozenUntil[side];
  }

  /**
   * Takes an answer given at a time: ignored from a player who is neither duellist, once the
   * duel is decided or while the player is frozen; a wrong answer freezes that player alone
   * for 1 second; the first correct answer wins (L2-001, L2-004).
   */
  give(player: string, value: number, atMs: number): AnswerResult {
    const side = this.sideOf(player);
    if (side === null || this.decided !== null || atMs < this.frozenUntil[side]) return 'ignored';
    if (value !== this.answer) {
      this.frozenUntil[side] = atMs + FREEZE_MS;
      return 'wrong';
    }
    this.decided = { outcome: 'won', winner: side };
    return 'won';
  }

  /** Closes an undecided duel with no winner when the card's time runs out (L2-005). */
  timeOut(): boolean {
    if (this.decided !== null) return false;
    this.decided = { outcome: 'timedOut' };
    return true;
  }
}

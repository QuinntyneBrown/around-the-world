import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { GAME_SESSION, type Duellist, type FlashCard as Card } from '@atw/api';
import {
  DuelHud,
  FlashCard,
  NumberPad,
  Pill,
  Screen,
  TimerBar,
  WorldRing,
  type DuelHudPlayer,
} from '@atw/components';
import { kidById } from '@atw/domain';
import { DuelWords } from './duel-words';

/**
 * Duel (docs/mocks/pages/duel/): the duel strip, the flash card and the number pad, filling
 * the screen without scrolling (L2-033). It shows the duel `GameSession` publishes and gives
 * the child's answer to it; the session decides everything (docs/detailed-designs/tour/
 * play-duel/). Until the first duel is published it is in its loading state (docs/adr/0017).
 * The stamp, the pill to World Map and Pause come with journeys 05 and 08 (docs/adr/0020).
 */
@Component({
  selector: 'atw-duel-page',
  imports: [DuelHud, FlashCard, NumberPad, Pill, Screen, TimerBar, WorldRing],
  templateUrl: './duel.html',
  styleUrl: './duel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DuelPage {
  private readonly session = inject(GAME_SESSION);

  protected readonly duel = this.session.duel;
  /** The digits typed, and the card and freeze they were typed for. */
  private readonly typed = signal<{ card?: Card; frozen?: boolean; digits: string }>({
    digits: '',
  });
  /**
   * The digits entered on the number pad: empty for a new card and when a freeze begins or
   * ends (L2-010 criterion 7); while frozen the card shows the wrong answer instead.
   */
  protected readonly entry = computed(() => {
    const typed = this.typed();
    const duel = this.duel();
    return typed.card === duel?.card && typed.frozen === duel?.frozen ? typed.digits : '';
  });
  /** What the answer box shows: the entry, the wrong answer while frozen, or nothing. */
  protected readonly answerBox = computed(() => {
    const duel = this.duel();
    if (!duel || duel.outcome !== 'open') return null;
    return duel.frozen ? String(duel.wrongAnswer ?? '') : this.entry();
  });
  protected readonly open = computed(() => this.duel()?.outcome === 'open');
  protected readonly sum = computed(() => {
    const duel = this.duel();
    return duel ? DuelWords.sum(duel.card) : undefined;
  });
  protected readonly sumLabel = computed(() => {
    const duel = this.duel();
    return duel ? DuelWords.sumInWords(duel.card) : undefined;
  });
  protected readonly line = computed(() => {
    const duel = this.duel();
    return duel ? DuelWords.line(duel) : { tone: 'quiet' as const };
  });
  protected readonly announcement = computed(() => {
    const duel = this.duel();
    return duel ? DuelWords.announcement(duel) : '';
  });
  protected readonly traveller = computed(() => this.player(this.duel()?.traveller, 'Travelling'));
  protected readonly deskHolder = computed(() => {
    const duel = this.duel();
    return this.player(duel?.deskHolder, `Holds ${duel?.country}`);
  });

  protected type(digits: string): void {
    const duel = this.duel();
    this.typed.set({ card: duel?.card, frozen: duel?.frozen, digits });
  }

  protected answer(value: number): void {
    this.session.answer(value);
  }

  private player(duellist: Duellist | undefined, role: string): DuelHudPlayer | undefined {
    if (!duellist) return undefined;
    const picture = duellist.kid === 'classmate' ? '' : kidById(duellist.kid).picture;
    return { name: duellist.name, role, kid: duellist.kid, picture };
  }
}

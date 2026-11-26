import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { GAME_SESSION, type Duellist, type FlashCard as Card } from '@atw/api';
import {
  DuelHud,
  FlashCard,
  NumberEntry,
  NumberPad,
  Pill,
  Screen,
  StampCard,
  TextButton,
  TimerBar,
  WorldRing,
  type DuelHudPlayer,
  type PadKey,
} from '@atw/components';
import { kidById } from '@atw/domain';
import { DuelWords } from './duel-words';

/**
 * Duel (docs/mocks/pages/duel/): the duel strip, the flash card and the number pad, filling
 * the screen without scrolling (L2-033). It shows the duel `GameSession` publishes and gives
 * the child's answer to it; the session decides everything (docs/detailed-designs/tour/
 * play-duel/). Until the first duel is published it is in its loading state (docs/adr/0017).
 * After a hop the passport stamp stands in place of the flash card, and after a lost duel the
 * quiet pill opens World Map (docs/adr/0022). Pause comes with journey 08.
 */
@Component({
  selector: 'atw-duel-page',
  imports: [
    DuelHud,
    FlashCard,
    NumberPad,
    Pill,
    Screen,
    StampCard,
    TextButton,
    TimerBar,
    WorldRing,
  ],
  templateUrl: './duel.html',
  styleUrl: './duel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DuelPage {
  private readonly session = inject(GAME_SESSION);

  protected readonly duel = this.session.duel;
  /** The digits typed, and the card they were typed for. */
  private readonly typed = signal<{ card?: Card; digits: string }>({
    digits: '',
  });
  /**
   * The digits entered on the number pad: empty for a new card and once an answer is given, so
   * empty when a freeze ends (L2-010 criterion 7); while frozen the card shows the wrong answer.
   */
  protected readonly entry = computed(() => {
    const typed = this.typed();
    const duel = this.duel();
    return typed.card === duel?.card ? typed.digits : '';
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
  /** The quiet pill after a lost duel (L2-033 criteria 8 and 11). */
  protected readonly pill = computed(() => {
    const duel = this.duel();
    return duel ? DuelWords.pill(duel) : null;
  });
  /** The passport stamp of a hop the child won (L2-033 criterion 7, L2-038 criterion 5). */
  protected readonly stamp = computed(() => {
    const duel = this.duel();
    const hop = duel?.hop;
    const desk = hop ? this.session.tour()?.desks[hop.to - 1] : undefined;
    if (!duel || !hop || !desk || duel.traveller.kid === 'classmate') return null;
    const kid = kidById(duel.traveller.kid).name;
    return {
      country: desk.country,
      landmark: desk.landmark,
      hop: `${kid} hops to desk ${hop.to} of ${duel.tourLength}`,
    };
  });
  protected readonly traveller = computed(() => this.player(this.duel()?.traveller, 'Travelling'));
  protected readonly deskHolder = computed(() => {
    const duel = this.duel();
    return this.player(duel?.deskHolder, `Holds ${duel?.country}`);
  });

  /** The pill after a lost duel: World Map shows what the duel did (L2-033 criterion 8). */
  protected moveOn(): void {
    this.session.continue();
  }

  /** A key of the number pad: a digit or Delete changes the entry, Go gives it (L2-010). */
  protected press(key: PadKey): void {
    const entry = this.entry();
    if (key === 'delete') return this.type(NumberEntry.removeLast(entry));
    if (key !== 'go') return this.type(NumberEntry.add(entry, key));
    const value = NumberEntry.value(entry);
    if (value === null) return;
    // The entry empties once an answer is given; while frozen the card shows the wrong answer.
    this.type('');
    this.session.answer(value);
  }

  private type(digits: string): void {
    const duel = this.duel();
    this.typed.set({ card: duel?.card, digits });
  }

  private player(duellist: Duellist | undefined, role: string): DuelHudPlayer | undefined {
    if (!duellist) return undefined;
    const picture = duellist.kid === 'classmate' ? '' : kidById(duellist.kid).picture;
    return { name: duellist.name, role, kid: duellist.kid, picture };
  }
}

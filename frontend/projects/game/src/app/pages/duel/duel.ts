import {
  ChangeDetectionStrategy,
  Component,
  computed,
  EnvironmentInjector,
  inject,
  signal,
} from '@angular/core';
import {
  GAME_SESSION,
  SOUND,
  WAY_OF_ANSWERING,
  type AnswerWay,
  type DuelState,
  type Duellist,
  type FlashCard as Card,
  type StickerId,
  type VoiceError,
} from '@atw/api';
import {
  DuelHud,
  FlashCard,
  IconButton,
  NumberEntry,
  NumberPad,
  Pill,
  Screen,
  Shout,
  StampCard,
  StickerBar,
  StickerPop,
  StickerRegion,
  TextButton,
  TimerBar,
  WorldRing,
  type DuelHudPlayer,
  type PadKey,
  type StickerChoice,
} from '@atw/components';
import { ClassroomStates, kidById, STICKERS, stickerById } from '@atw/domain';
import {
  ClassroomCanvas,
  sameClassroom,
  type ClassroomStatus,
} from '../../classroom/classroom-canvas';
import { Listening } from '../../voice/listening';
import { DuelWords } from './duel-words';

/**
 * Duel (docs/mocks/pages/duel/): the duel strip, the flash card and the number pad, filling
 * the screen without scrolling (L2-033). It shows the duel `GameSession` publishes and gives
 * the child's answer to it; the session decides everything (docs/detailed-designs/tour/
 * play-duel/). Until the first duel is published it is in its loading state (docs/adr/0017).
 * After a hop the passport stamp stands in place of the flash card, and after a lost duel the
 * quiet pill opens World Map (docs/adr/0022). With voice as the way of answering it shows
 * "Shout it!" while the child may answer, and listens exactly then; the quiet pill at the
 * bottom switches between voice and the pad (docs/detailed-designs/answering/answer-by-voice/).
 * Pause stops the game's clock and opens its dialog, whose code loads on the first press; while
 * paused nothing listens (docs/adr/0027-pausing-leaving-and-recovering.md). The 3D classroom is
 * drawn behind the scrim once it arrives, the duellists thinking, then cheering or "so close";
 * the still picture stays on a device that cannot draw it (docs/adr/0028). A key of the number
 * pad pops, and each new flash card flips in (docs/adr/0029-motion-and-sound.md).
 */
@Component({
  selector: 'atw-duel-page',
  imports: [
    ClassroomCanvas,
    DuelHud,
    FlashCard,
    IconButton,
    Listening,
    NumberPad,
    Pill,
    Screen,
    Shout,
    StampCard,
    StickerBar,
    StickerPop,
    StickerRegion,
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
  private readonly way = inject(WAY_OF_ANSWERING);
  private readonly sound = inject(SOUND);
  private readonly injector = inject(EnvironmentInjector);

  /** Pause in a solo game; a game with friends offers Leave in its place (L2-033 criterion 4). */
  protected readonly canPause = this.session.kind === 'solo';
  /** The duel in which speech recognition failed: the pad shows for it (L2-011 criterion 4). */
  private readonly failedDuel = signal<string | null>(null);

  protected readonly duel = this.session.duel;
  /** The classroom behind the card: the tour's ring, the duellists doing what the moment asks. */
  protected readonly classroom = computed(
    () => {
      const tour = this.session.tour();
      return tour ? ClassroomStates.ofTour(tour, this.duel()) : null;
    },
    { equal: sameClassroom },
  );
  protected readonly scene = signal<ClassroomStatus>('loading');
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
  /** Whether recognition failed in this duel. */
  protected readonly voiceFailed = computed(() => {
    const duel = this.duel();
    return duel !== null && this.failedDuel() === duelKey(duel);
  });
  /** Whether this duel is answered by voice. */
  protected readonly byVoice = computed(() => this.way.way() === 'voice' && !this.voiceFailed());
  /** The child's duel, with a card showing: answers and the switch are offered (L2-011 5). */
  private readonly playing = computed(() => {
    const duel = this.duel();
    return (
      duel?.outcome === 'open' &&
      duel.role !== 'watching' &&
      !this.stamp() &&
      !this.session.paused()
    );
  });
  /** The six stickers a watching player can send (L2-028 criteria 2 and 6). */
  protected readonly stickerChoices: readonly StickerChoice[] = STICKERS.map((sticker) => ({
    ...sticker,
    picture: sticker.kid === 'bolt' ? '' : kidById(sticker.kid).picture,
  }));
  /** The stickers received, with the sender's kid, the words and the sender (L2-028 3 and 7). */
  protected readonly stickers = computed(() =>
    this.session.stickers().map((shown) => ({
      key: shown.key,
      kid: shown.kid,
      picture: kidById(shown.kid).picture,
      words: stickerById(shown.sticker).words,
      from: shown.from,
    })),
  );
  /** Whether the device listens now: by voice, playing and not frozen (L2-009 criterion 5). */
  protected readonly listening = computed(
    () => this.byVoice() && this.playing() && !this.duel()?.frozen,
  );
  /** The way the quiet pill at the bottom switches to, or null when it is not offered. */
  protected readonly switchTo = computed<AnswerWay | null>(() => {
    if (!this.playing() || this.voiceFailed()) return null;
    if (this.byVoice()) return 'numberPad';
    return this.way.voiceOffered() ? 'voice' : null;
  });
  /** What the answer box shows: the entry, the wrong answer while frozen, or nothing. */
  protected readonly answerBox = computed(() => {
    const duel = this.duel();
    if (!duel || duel.outcome !== 'open' || duel.role === 'watching' || this.byVoice()) return null;
    return duel.frozen ? String(duel.wrongAnswer ?? '') : this.entry();
  });
  protected readonly open = computed(() => this.duel()?.outcome === 'open');
  /** A player of a game with friends who is not in the duel watches it (L2-028 criterion 1). */
  protected readonly watching = computed(() => this.duel()?.role === 'watching');
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
    if (!duel) return '';
    const words = DuelWords.announcement(duel);
    return this.listening() ? `${words} Shout it!` : words;
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

  /** Pause: the clock stops and the Pause dialog opens (L2-033 criterion 4). */
  protected async pause(): Promise<void> {
    const { openPause } = await import('../../dialogs/pause/open-pause');
    openPause(this.injector);
  }

  /** In a game with friends: asks first, then leaves the game (L2-033 criterion 4). */
  protected async leave(): Promise<void> {
    const { openLeaveGame } = await import('../../dialogs/leave-game/open-leave-game');
    openLeaveGame(this.injector);
  }

  /** The pill after a lost duel: World Map shows what the duel did (L2-033 criterion 8). */
  protected moveOn(): void {
    this.session.continue();
  }

  /** A watching player sends a sticker, as its id (L2-028 criterion 3). */
  protected sendSticker(sticker: StickerId): void {
    this.session.sendSticker(sticker);
  }

  /** A number the child shouted (L2-009 criteria 1 and 3). */
  protected shouted(value: number): void {
    this.session.answer(value);
  }

  /**
   * Recognition stopped during the duel: the pad shows for this duel, with the same card
   * (L2-011 criterion 4); a refused microphone also gives up voice for the visit (criterion 6).
   */
  protected voiceStopped(error: VoiceError): void {
    const duel = this.duel();
    if (duel) this.failedDuel.set(duelKey(duel));
    if (error.code === 'refused') this.way.loseVoice();
  }

  /** "Use number pad" or "Shout instead" (L2-011 criteria 1 and 2). */
  protected switchWay(way: AnswerWay): void {
    this.way.use(way);
  }

  /** A key of the number pad pops; a digit or Delete changes the entry, Go gives it (L2-010). */
  protected press(key: PadKey): void {
    this.sound.play('pop');
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

/** A duel's identity: its desk and its two duellists. */
function duelKey(duel: DuelState): string {
  return `${duel.desk}|${duel.traveller.name}|${duel.deskHolder.name}`;
}

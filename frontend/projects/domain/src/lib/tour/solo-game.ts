import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import {
  PLAYER_CHOICES,
  type DuelState,
  type Duellist,
  type GameScreen,
  type GameSession,
  type GameSetup,
  type RingPlace,
} from '@atw/api';
import { kidById } from '../cast/kids';
import { ClassFactory, type SeatedClassmate } from '../classmates/class-factory';
import { ClassPace } from '../classmates/class-pace';
import { type ClassmateAgent } from '../classmates/classmate-agent';
import { FlashCardMaker } from '../questions/flash-card-maker';
import { mathRandom } from '../questions/random-source';
import { countryOfDesk } from './countries';
import { Duel } from './duel';
import { GameClock } from './game-clock';
import { GameSetupRules } from './game-setup-rules';

/** How often the game's clock ticks, and the timer bar moves (docs/adr/0020). */
export const TICK_MS = 100;
/** How long "Time's up!" stays before the new card (L2-005 criterion 2, ADR 0020). */
export const TIME_UP_MS = 2000;
/** The device's own player in a duel. */
const YOU = 'you';

/** The duel being played: the rule, who is in it, and the timers it set. */
interface Playing {
  readonly duel: Duel;
  readonly desk: number;
  readonly holder: SeatedClassmate;
  readonly startedAt: number;
  readonly timers: number[];
}

/**
 * A solo game, played on the device against classmates with no request to the backend
 * (L2-019). The solo group provides it behind `GAME_SESSION` and destroys it when the child
 * leaves the group (docs/adr/0016-solo-game-route-group.md). It builds the class, deals each
 * flash card, gives the child's and the classmate's answers to the same `Duel`, and keeps one
 * duel at a time, never a list of those played (L2-048 criterion 5). Moving round the ring
 * comes with journey 05 (docs/adr/0020-solo-duel-clock-and-states.md).
 */
@Injectable()
export class SoloGame implements GameSession {
  private readonly choices = inject(PLAYER_CHOICES);
  private readonly started = signal<GameSetup | null>(null);
  private readonly state = signal<DuelState | null>(null);
  private readonly clock = new GameClock(() => Date.now());
  private ticking: ReturnType<typeof setInterval> | null = null;
  private destroyed = false;

  private maker: FlashCardMaker | null = null;
  private seated: SeatedClassmate[] = [];
  private agents: Map<string, ClassmateAgent> | null = null;
  private playing: Playing | null = null;
  private lostInARow = 0;

  readonly setup = this.started.asReadonly();
  readonly hasGame = computed(() => this.started() !== null);
  readonly screen = computed<GameScreen | null>(() => (this.started() ? 'duel' : null));
  readonly duel = this.state.asReadonly();

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stop());
  }

  start(setup: GameSetup): void {
    this.started.set(setup);
    const picked = this.choices.kid() ?? 'zuri';
    this.seated = ClassFactory.build(picked, setup.tourLength);
    this.maker = new FlashCardMaker(setup, mathRandom);
    this.ticking = setInterval(() => this.tick(), TICK_MS);
    // The classmates' agents load on their own; the first card never waits for them (ADR 0019).
    void import('../classmates/classmate-agent').then(({ ClassmateAgent }) => {
      if (this.destroyed) return;
      this.agents = new Map(
        this.seated.map(({ profile }) => [profile.id, new ClassmateAgent(profile, mathRandom)]),
      );
      if (this.playing) this.classmateDecides(this.playing, this.playing.startedAt);
    });
    this.deal(2);
  }

  answer(value: number): void {
    // Every classmate's answer due by now counts first (docs/adr/0020, ties).
    this.clock.tick();
    const playing = this.playing;
    if (!playing) return;
    const result = playing.duel.give(YOU, value, this.clock.now());
    if (result === 'won') return this.decide(playing);
    if (result === 'wrong') {
      this.publish(playing, { wrongAnswer: value });
      playing.timers.push(
        this.clock.after(playing.duel.unfreezesAt(YOU) - this.clock.now(), () =>
          this.publish(playing),
        ),
      );
    }
  }

  /** Deals a new flash card for a duel at the desk, with the classmate who holds it. */
  private deal(desk: number): void {
    const maker = this.maker;
    const holder = this.seated.find((classmate) => classmate.desk === desk);
    if (!maker || !holder) return;
    const duel = new Duel(maker.next(), { traveller: YOU, deskHolder: holder.profile.id });
    const playing: Playing = { duel, desk, holder, startedAt: this.clock.now(), timers: [] };
    this.playing = playing;
    playing.timers.push(this.clock.after(this.cardMs(), () => this.timeOut(playing)));
    if (this.agents) this.classmateDecides(playing, playing.startedAt);
    this.publish(playing);
  }

  /** Asks the classmate for its answer to the card, given from the time it can answer. */
  private classmateDecides(playing: Playing, fromMs: number): void {
    const agent = this.agents?.get(playing.holder.profile.id);
    if (!agent || playing.duel.outcome !== 'open') return;
    const decision = agent.decide(playing.duel.card, ClassPace.notBeforeMs(this.lostInARow));
    const atMs = Math.max(fromMs + decision.afterMs, this.clock.now());
    playing.timers.push(
      this.clock.after(atMs - this.clock.now(), () =>
        this.classmateAnswers(playing, decision.answer),
      ),
    );
  }

  private classmateAnswers(playing: Playing, value: number): void {
    const id = playing.holder.profile.id;
    const result = playing.duel.give(id, value, this.clock.now());
    if (result === 'won') return this.decide(playing);
    // A wrong answer freezes the classmate exactly as a player; it decides again after.
    if (result === 'wrong') {
      const unfreezes = playing.duel.unfreezesAt(id);
      playing.timers.push(
        this.clock.after(unfreezes - this.clock.now(), () =>
          this.classmateDecides(playing, unfreezes),
        ),
      );
    }
  }

  private timeOut(playing: Playing): void {
    if (!playing.duel.timeOut()) return;
    this.cancel(playing);
    this.publish(playing);
    playing.timers.push(this.clock.after(TIME_UP_MS, () => this.deal(playing.desk)));
  }

  private decide(playing: Playing): void {
    this.cancel(playing);
    this.lostInARow = playing.duel.winner === 'traveller' ? 0 : this.lostInARow + 1;
    this.publish(playing);
  }

  private cancel(playing: Playing): void {
    for (const timer of playing.timers.splice(0)) this.clock.cancel(timer);
  }

  private tick(): void {
    this.clock.tick();
    const playing = this.playing;
    if (playing?.duel.outcome === 'open') this.publish(playing);
  }

  private cardMs(): number {
    const setup = this.started();
    return setup ? GameSetupRules.secondsPerCard(setup.cardSpeed) * 1000 : 0;
  }

  /** Publishes the duel as the Duel screen shows it. */
  private publish(playing: Playing, change: { wrongAnswer?: number } = {}): void {
    const setup = this.started();
    if (!setup || this.playing !== playing) return;
    const { duel, desk, holder } = playing;
    const now = this.clock.now();
    const frozen = duel.outcome === 'open' && duel.isFrozen(YOU, now);
    const previous = this.state();
    const decided = duel.outcome !== 'open';
    this.state.set({
      card: duel.card,
      desk,
      tourLength: setup.tourLength,
      country: countryOfDesk(desk),
      traveller: this.you(),
      deskHolder: this.duellist(holder),
      role: 'traveller',
      secondsToAnswer: GameSetupRules.secondsPerCard(setup.cardSpeed),
      timeLeftMs: decided ? 0 : Math.max(0, this.cardMs() - (now - playing.startedAt)),
      frozen,
      wrongAnswer: frozen
        ? (change.wrongAnswer ?? (previous?.card === duel.card ? previous.wrongAnswer : null))
        : null,
      outcome: duel.outcome,
      winner: duel.winner,
      answer: decided ? duel.answer : null,
      ring: this.ring(),
    });
  }

  private you(): Duellist {
    return { name: 'You', kid: this.choices.kid() ?? 'zuri' };
  }

  private duellist({ profile }: SeatedClassmate): Duellist {
    return profile.kid
      ? { name: kidById(profile.kid).name, kid: profile.kid }
      : { name: 'Classmate', kid: 'classmate' };
  }

  /** The five kids round the ring: the device's player beside the duel's desk. */
  private ring(): RingPlace[] {
    const you: RingPlace = {
      kid: this.choices.kid() ?? 'zuri',
      desk: this.playing?.desk ?? 2,
      you: true,
    };
    const kids = this.seated.flatMap(({ desk, profile }) =>
      profile.kid ? [{ kid: profile.kid, desk, you: false }] : [],
    );
    return [...kids, you];
  }

  private stop(): void {
    this.destroyed = true;
    if (this.ticking !== null) clearInterval(this.ticking);
    this.ticking = null;
    this.clock.clear();
    this.playing = null;
  }
}

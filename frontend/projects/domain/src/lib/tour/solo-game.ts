import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import {
  PLAYER_CHOICES,
  type DeskState,
  type DuelState,
  type Duellist,
  type GameScreen,
  type GameSession,
  type GameSetup,
  type RingPlace,
  type TourMove,
  type TourEnding,
  type TourPhase,
  type TourPlayer,
  type TourResult,
  type TourState,
} from '@atw/api';
import { kidById } from '../cast/kids';
import { ClassFactory } from '../classmates/class-factory';
import { ClassPace } from '../classmates/class-pace';
import { type ClassmateAgent } from '../classmates/classmate-agent';
import { type ClassmateProfile } from '../classmates/classmate-profile';
import { FlashCardMaker } from '../questions/flash-card-maker';
import { mathRandom } from '../questions/random-source';
import { CARDS_AT_ONCE, ClassmatesDuel, type ClassmatesResult } from './classmates-duel';
import { countryOfDesk, landmarkOfDesk } from './countries';
import { Duel, type DuelSide } from './duel';
import { GameClock } from './game-clock';
import { GameSetupRules } from './game-setup-rules';
import { timeLimitMs, Tour } from './tour';

/** How often the game's clock ticks, and the timer bar moves (docs/adr/0020). */
export const TICK_MS = 100;
/** How long "Time's up!" stays before the new card (L2-005 criterion 2, ADR 0020). */
export const TIME_UP_MS = 2000;
/** How long "You got it!" stays (L2-033 criterion 7, docs/adr/0022). */
export const RIGHT_MS = 1000;
/** How long the passport stamp stays before World Map (L2-033 criterion 7, ADR 0022). */
export const STAMP_MS = 1200;
/** How long a World Map message stays before the game moves on (L2-034 criterion 9). */
export const MESSAGE_MS = 1600;
/** The device's own player. */
const YOU = 'you';

/** The duel the device's player is in: the rule, who is in it, and the timers it set. */
interface Playing {
  readonly duel: Duel;
  readonly desk: number;
  readonly traveller: string;
  readonly deskHolder: string;
  readonly startedAt: number;
  readonly timers: number[];
  /** The hop the duel earned, once applied, for its passport stamp. */
  hop: TourMove | null;
  applied: boolean;
}

/**
 * A solo game, played on the device against classmates with no request to the backend
 * (L2-019). The solo group provides it behind `GAME_SESSION` and destroys it when the child
 * leaves the group (docs/adr/0016-solo-game-route-group.md). It builds the class and the
 * `Tour`, deals each flash card of a duel the child is in, gives the child's and the
 * classmate's answers to the same `Duel`, applies each decided duel to the ring, and works out
 * the classmates' duels while the child is seated (docs/adr/0022-moving-round-the-ring.md). It
 * keeps one duel at a time, never a list of those played (L2-048 criterion 5).
 */
@Injectable()
export class SoloGame implements GameSession {
  private readonly choices = inject(PLAYER_CHOICES);
  private readonly started = signal<GameSetup | null>(null);
  private readonly state = signal<DuelState | null>(null);
  private readonly tourState = signal<TourState | null>(null);
  private readonly ended = signal<TourResult | null>(null);
  private readonly current = signal<GameScreen | null>(null);
  private readonly listeners = new Set<(screen: GameScreen) => void>();
  private readonly clock = new GameClock(() => Date.now());
  private ticking: ReturnType<typeof setInterval> | null = null;
  private destroyed = false;

  private maker: FlashCardMaker | null = null;
  private rules: Tour | null = null;
  private players = new Map<string, TourPlayer>();
  private profiles = new Map<string, ClassmateProfile>();
  private agents: Map<string, ClassmateAgent> | null = null;
  /** The agents' class, once its chunk has arrived, to make a new class's agents with. */
  private agentType: typeof ClassmateAgent | null = null;
  private playing: Playing | null = null;
  /** The wait between duels: a message, or a classmates' duel being played. */
  private waiting: number | null = null;
  private phase: TourPhase = 'duel';
  private lastMove: TourMove | null = null;
  private lostInARow = 0;
  /** How the tour ended, once a decided duel has ended it (L2-006). */
  private ending: TourEnding | null = null;

  readonly setup = this.started.asReadonly();
  readonly hasGame = computed(() => this.started() !== null);
  readonly screen = this.current.asReadonly();
  readonly duel = this.state.asReadonly();
  readonly tour = this.tourState.asReadonly();
  readonly result = this.ended.asReadonly();

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stop());
  }

  start(setup: GameSetup, options: { readonly micCheck?: boolean } = {}): void {
    if (this.ticking !== null) return;
    const loadAgents = this.started() === null;
    this.started.set(setup);
    // With Mic Check the first card waits until the child leaves it (L2-012 criterion 8).
    if (options.micCheck) this.show('mic-check');
    else this.dealFirst(setup);
    if (loadAgents) this.loadAgents();
  }

  /** Builds the tour, deals the first card and starts the clock ticking. */
  private dealFirst(setup: GameSetup): void {
    // Agents made while Mic Check showed had no class yet: they are made for this one.
    this.agents = null;
    this.begin(setup);
    this.makeAgents();
    if (this.agents && this.playing) this.classmateDecides(this.playing, this.playing.startedAt);
    this.ticking = setInterval(() => this.tick(), TICK_MS);
  }

  private loadAgents(): void {
    // The classmates' agents load on their own; the first card never waits for them (ADR 0019).
    void import('../classmates/classmate-agent').then(({ ClassmateAgent }) => {
      if (this.destroyed) return;
      this.agentType = ClassmateAgent;
      this.makeAgents();
      if (this.playing) this.classmateDecides(this.playing, this.playing.startedAt);
    });
  }

  /**
   * From the Podium: drops the ended tour, its timers and its result, and starts a new tour
   * with the same kid and setup, so with the same class (L2-035 criterion 3, ADR 0024).
   */
  playAgain(): void {
    const setup = this.started();
    if (!setup || this.phase !== 'over') return;
    this.clock.clear();
    this.waiting = null;
    this.playing = null;
    this.state.set(null);
    this.ended.set(null);
    this.begin(setup);
    this.makeAgents();
  }

  /** Builds the class and the tour, and deals the first card (L2-007). */
  private begin(setup: GameSetup): void {
    const picked = this.choices.kid() ?? 'zuri';
    const seated = ClassFactory.build(picked, setup.tourLength);
    this.players = new Map([[YOU, { id: YOU, name: 'You', kid: picked, you: true }]]);
    this.profiles = new Map();
    for (const { profile } of seated) {
      this.profiles.set(profile.id, profile);
      this.players.set(profile.id, {
        id: profile.id,
        name: profile.kid ? kidById(profile.kid).name : 'Classmate',
        kid: profile.kid ?? 'classmate',
        you: false,
      });
    }
    this.rules = Tour.start(
      setup.tourLength,
      YOU,
      seated.map(({ desk, profile }) => ({ desk, player: profile.id })),
      this.clock.now() + timeLimitMs(setup.tourLength),
    );
    this.maker = new FlashCardMaker(setup, mathRandom);
    this.lastMove = null;
    this.lostInARow = 0;
    this.ending = null;
    this.next();
  }

  /** One agent for each classmate of the class, once the agents' chunk has arrived. */
  private makeAgents(): void {
    const Agent = this.agentType;
    if (!Agent) return;
    this.agents = new Map(
      [...this.profiles.values()].map((profile) => [profile.id, new Agent(profile, mathRandom)]),
    );
  }

  answer(value: number): void {
    // Every classmate's answer due by now counts first (docs/adr/0020, ties).
    this.clock.tick();
    const playing = this.playing;
    if (!playing) return;
    const result = playing.duel.give(YOU, value, this.clock.now());
    if (result === 'won') return this.decide(playing);
    if (result === 'wrong') {
      this.publish(playing, value);
      playing.timers.push(
        this.clock.after(playing.duel.unfreezesAt(YOU) - this.clock.now(), () =>
          this.publish(playing),
        ),
      );
    }
  }

  continue(): void {
    const setup = this.started();
    // Leaving Mic Check deals the first card and starts its time (L2-012 criterion 8).
    if (this.current() === 'mic-check' && setup) return this.dealFirst(setup);
    const playing = this.playing;
    if (this.phase === 'duel' && playing && !playing.applied && this.youLost(playing)) {
      // The pill after a lost duel: World Map shows what the duel did (L2-033 criterion 8).
      return this.showMove(this.apply(playing));
    }
    // "Back to the card" (L2-034 criterion 12), or on to the Podium after the last duel.
    if (this.phase === 'over' && this.ended() === null) return this.finish();
    if (this.phase === 'moving' || this.phase === 'watching') this.backToTheCard();
  }

  watchScreen(listener: (screen: GameScreen) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Starts the next duel: one the child is in on Duel, or the classmates' on World Map. */
  private next(): void {
    const rules = this.rules;
    if (!rules) return;
    this.clock.cancel(this.waiting);
    this.waiting = null;
    this.lastMove = null;
    if (this.youAreInNextDuel(rules)) this.deal(rules);
    else this.watch(rules);
  }

  private youAreInNextDuel(rules: Tour): boolean {
    return rules.traveller === YOU || rules.holderOf(rules.desk) === YOU;
  }

  /** Deals a new flash card for the duel at the traveller's desk, which the child is in. */
  private deal(rules: Tour): void {
    const maker = this.maker;
    const deskHolder = rules.holderOf(rules.desk);
    if (!maker || !deskHolder) return;
    const traveller = rules.traveller;
    const duel = new Duel(maker.next(), { traveller, deskHolder });
    const playing: Playing = {
      duel,
      desk: rules.desk,
      traveller,
      deskHolder,
      startedAt: this.clock.now(),
      timers: [],
      hop: null,
      applied: false,
    };
    this.playing = playing;
    this.phase = 'duel';
    playing.timers.push(this.clock.after(this.cardMs(), () => this.timeOut(playing)));
    if (this.agents) this.classmateDecides(playing, playing.startedAt);
    this.publish(playing);
    this.publishTour();
    this.show('duel');
  }

  /** The classmate the child duels. */
  private rivalOf(playing: Playing): string {
    return playing.traveller === YOU ? playing.deskHolder : playing.traveller;
  }

  private sideOfYou(playing: Playing): DuelSide {
    return playing.traveller === YOU ? 'traveller' : 'deskHolder';
  }

  private youLost(playing: Playing): boolean {
    const winner = playing.duel.winner;
    return winner !== null && winner !== this.sideOfYou(playing);
  }

  /** Asks the classmate for its answer to the card, given from the time it can answer. */
  private classmateDecides(playing: Playing, fromMs: number): void {
    const agent = this.agents?.get(this.rivalOf(playing));
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
    const id = this.rivalOf(playing);
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
    playing.timers.push(
      this.clock.after(TIME_UP_MS, () => {
        if (this.rules) this.deal(this.rules);
      }),
    );
  }

  /**
   * A decided duel. Won: "You got it!" stays, then the move; after a hop the passport stamp
   * stays before World Map (L2-033 criteria 7 and 10). Lost: it waits for the pill.
   */
  private decide(playing: Playing): void {
    this.cancel(playing);
    const youWon = !this.youLost(playing);
    this.lostInARow = youWon ? 0 : this.lostInARow + 1;
    this.publish(playing);
    if (!youWon) return;
    playing.timers.push(
      this.clock.after(RIGHT_MS, () => {
        const move = this.apply(playing);
        if (move.kind !== 'hop') return this.showMove(move);
        playing.hop = move;
        this.publish(playing);
        playing.timers.push(this.clock.after(STAMP_MS, () => this.showMove(move)));
      }),
    );
  }

  /** Applies the child's decided duel to the ring, once. */
  private apply(playing: Playing): TourMove {
    playing.applied = true;
    const winner = playing.duel.winner ?? 'deskHolder';
    return (this.rules as Tour).applyDuel(winner, this.clock.now());
  }

  /**
   * World Map shows the move with its message, then the game moves on (L2-034 9): to the next
   * duel, or to the Podium when the duel ended the tour (L2-006, ADR 0024).
   */
  private showMove(move: TourMove): void {
    const rules = this.rules;
    if (!rules) return;
    this.playing = null;
    this.lastMove = move;
    this.ending = rules.ending(this.clock.now());
    this.phase = this.ending ? 'over' : 'moving';
    this.publishTour();
    this.show('world-map');
    this.waiting = this.clock.after(MESSAGE_MS, () => (this.ending ? this.finish() : this.next()));
  }

  /** Publishes how the tour ended and opens the Podium (L2-030 criterion 5, L2-035). */
  private finish(): void {
    const rules = this.rules;
    const ending = this.ending;
    if (!rules || !ending) return;
    this.clock.cancel(this.waiting);
    this.waiting = null;
    const shown = (id: string) => this.players.get(id)?.kid !== 'classmate';
    this.ended.set({
      ...rules.result(ending, YOU, shown),
      players: [...this.players.values()],
    });
    this.show('podium');
  }

  /** The child is seated: two classmates duel while World Map stays (L2-034 7). */
  private watch(rules: Tour): void {
    this.playing = null;
    this.phase = 'watching';
    this.publishTour();
    this.show('world-map');
    if (!this.agents) {
      this.waiting = this.clock.after(TICK_MS, () => this.watch(rules));
      return;
    }
    const result = this.workOutClassmates(rules);
    if (!result) {
      this.waiting = this.clock.after(CARDS_AT_ONCE * this.cardMs(), () => this.watch(rules));
      return;
    }
    this.waiting = this.clock.after(result.afterMs, () =>
      this.showMove(rules.applyDuel(result.winner, this.clock.now())),
    );
  }

  /** Plays out the classmates' duels at once until the child is in the next duel (L2-034 12). */
  private backToTheCard(): void {
    const rules = this.rules;
    if (!rules) return;
    this.clock.cancel(this.waiting);
    this.waiting = null;
    let last: TourMove | null = null;
    for (let duels = 0; duels <= 2 * rules.tourLength; duels++) {
      if (last && rules.ending(this.clock.now())) return this.showMove(last);
      if (this.youAreInNextDuel(rules)) return this.next();
      const result = this.agents ? this.workOutClassmates(rules) : null;
      if (!result) return this.watch(rules);
      last = rules.applyDuel(result.winner, this.clock.now());
    }
    this.next();
  }

  private workOutClassmates(rules: Tour): ClassmatesResult | null {
    const traveller = this.agents?.get(rules.traveller);
    const deskHolder = this.agents?.get(rules.holderOf(rules.desk) ?? '');
    const maker = this.maker;
    if (!traveller || !deskHolder || !maker) return null;
    return ClassmatesDuel.play(() => maker.next(), { traveller, deskHolder }, this.cardMs());
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

  private show(screen: GameScreen): void {
    if (this.current() === screen) return;
    this.current.set(screen);
    for (const listener of [...this.listeners]) listener(screen);
  }

  /** Publishes the duel as the Duel screen shows it. */
  private publish(playing: Playing, wrongAnswer?: number): void {
    const setup = this.started();
    if (!setup || this.playing !== playing) return;
    const { duel, desk } = playing;
    const now = this.clock.now();
    const frozen = duel.outcome === 'open' && duel.isFrozen(YOU, now);
    const previous = this.state();
    const decided = duel.outcome !== 'open';
    this.state.set({
      card: duel.card,
      desk,
      tourLength: setup.tourLength,
      country: countryOfDesk(desk),
      traveller: this.duellist(playing.traveller),
      deskHolder: this.duellist(playing.deskHolder),
      role: playing.traveller === YOU ? 'traveller' : 'deskHolder',
      secondsToAnswer: GameSetupRules.secondsPerCard(setup.cardSpeed),
      timeLeftMs: decided ? 0 : Math.max(0, this.cardMs() - (now - playing.startedAt)),
      frozen,
      wrongAnswer: frozen
        ? (wrongAnswer ?? (previous?.card === duel.card ? previous.wrongAnswer : null))
        : null,
      outcome: duel.outcome,
      winner: duel.winner,
      answer: decided ? duel.answer : null,
      ring: this.ring(),
      hop: playing.hop,
    });
  }

  /** Publishes the tour as World Map shows it (L2-034). */
  private publishTour(): void {
    const rules = this.rules;
    if (!rules) return;
    const desks: DeskState[] = Array.from({ length: rules.tourLength }, (_, index) => ({
      desk: index + 1,
      country: countryOfDesk(index + 1),
      landmark: landmarkOfDesk(index + 1),
      holder: rules.holderOf(index + 1),
    }));
    const kids = rules
      .ordered()
      .filter(({ player }) => this.players.get(player)?.kid !== 'classmate');
    this.tourState.set({
      tourLength: rules.tourLength,
      desks,
      players: [...this.players.values()],
      traveller: rules.traveller,
      travellerDesk: rules.desk,
      standings: kids.map((entry, index) => ({ place: index + 1, ...entry })),
      lastMove: this.lastMove,
      stamps: rules.stampsOf(YOU),
      phase: this.phase,
    });
  }

  private duellist(id: string): Duellist {
    const player = this.players.get(id);
    return player
      ? { name: player.name, kid: player.kid }
      : { name: 'Classmate', kid: 'classmate' };
  }

  /** The five kids round the ring: each at their desk, the traveller beside the duel's desk. */
  private ring(): RingPlace[] {
    const rules = this.rules;
    if (!rules) return [];
    const places: RingPlace[] = [];
    for (const player of this.players.values()) {
      if (player.kid === 'classmate') continue;
      places.push({
        kid: player.kid,
        desk: rules.deskOf(player.id) ?? rules.desk,
        you: player.you,
      });
    }
    // The device's own player is drawn last, over the others.
    return [...places.filter(({ you }) => !you), ...places.filter(({ you }) => you)];
  }

  private stop(): void {
    this.destroyed = true;
    if (this.ticking !== null) clearInterval(this.ticking);
    this.ticking = null;
    this.clock.clear();
    this.listeners.clear();
    this.playing = null;
  }
}

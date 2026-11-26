import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import {
  CLASSMATE_MODEL,
  PLAYER_CHOICES,
  type ClassmateModelSession,
  type DeskState,
  type DuelState,
  type Duellist,
  type GameMoment,
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
  type ConnectionNotice,
  type GameConnection,
  type ShownSticker,
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
import { loadClassmateAgent } from '../classmates/load-classmate-agent';

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
  /** The classmate's answer from its profile, until it is given or the model's replaces it. */
  profileAnswer: ProfileAnswer | null;
  /** The prompt to the classmate's model session, while it waits (docs/adr/0030). */
  asking: AbortController | null;
  /** The hop the duel earned, once applied, for its passport stamp. */
  hop: TourMove | null;
  applied: boolean;
}

/** A classmate's answer from its profile, waiting on the clock (docs/adr/0030). */
interface ProfileAnswer {
  readonly timer: number;
  /** When the classmate could answer: the card appearing, or its freeze ending. */
  readonly fromMs: number;
  readonly notBeforeMs: number;
}

/**
 * A solo game, played on the device against classmates with no request to the backend
 * (L2-019). The solo group provides it behind `GAME_SESSION` and destroys it when the child
 * leaves the group (docs/adr/0016-solo-game-route-group.md). It builds the class and the
 * `Tour`, deals each flash card of a duel the child is in, gives the child's and the
 * classmate's answers to the same `Duel`, applies each decided duel to the ring, and works out
 * the classmates' duels while the child is seated (docs/adr/0022-moving-round-the-ring.md). It
 * keeps one duel at a time, never a list of those played (L2-048 criterion 5). Where the
 * on-device model is ready it opens a session for each classmate after the first card, without
 * waiting, keeps them for the tour and destroys them when it ends or is left (L2-021,
 * docs/adr/0030-classmates-with-the-on-device-model.md).
 */
@Injectable()
export class SoloGame implements GameSession {
  private readonly choices = inject(PLAYER_CHOICES);
  private readonly model = inject(CLASSMATE_MODEL);
  private readonly started = signal<GameSetup | null>(null);
  private readonly state = signal<DuelState | null>(null);
  private readonly tourState = signal<TourState | null>(null);
  private readonly ended = signal<TourResult | null>(null);
  private readonly current = signal<GameScreen | null>(null);
  private readonly listeners = new Set<(screen: GameScreen) => void>();
  private readonly momentListeners = new Set<(moment: GameMoment) => void>();
  private readonly held = signal(false);
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
  /** The classmates' model sessions of this tour, by classmate (at most 23, ADR 0030). */
  private readonly sessions = new Map<string, ClassmateModelSession>();
  /** Counts the tours whose sessions were asked for, so a late session of an old one is let go. */
  private sessionsFor = 0;
  private playing: Playing | null = null;
  /** The wait between duels: a message, or a classmates' duel being played. */
  private waiting: number | null = null;
  private phase: TourPhase = 'duel';
  private lastMove: TourMove | null = null;
  private lostInARow = 0;
  /** How the tour ended, once a decided duel has ended it (L2-006). */
  private ending: TourEnding | null = null;

  readonly kind = 'solo' as const;
  readonly paused = this.held.asReadonly();
  readonly setup = this.started.asReadonly();
  readonly hasGame = computed(() => this.started() !== null);
  readonly screen = this.current.asReadonly();
  readonly duel = this.state.asReadonly();
  readonly tour = this.tourState.asReadonly();
  readonly result = this.ended.asReadonly();
  /** A solo game has no room to send a sticker to, and classmates send none (ADR 0030). */
  readonly stickers = signal<readonly ShownSticker[]>([]).asReadonly();
  /** A solo game is played on the device: it has no connection to lose (L2-029). */
  readonly connection = signal<GameConnection>('live').asReadonly();
  readonly notice = signal<ConnectionNotice | null>(null).asReadonly();

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stop());
  }

  start(setup: GameSetup, options: { readonly micCheck?: boolean } = {}): void {
    if (this.ticking !== null) {
      // Back from the Podium opens Game Setup, where "Go!" starts a new game (ADR 0027).
      if (this.phase !== 'over') return;
      this.dropEnded();
    }
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
    this.openSessions();
  }

  private loadAgents(): void {
    // The classmates' agents load on their own; the first card never waits for them (ADR 0019).
    void loadClassmateAgent().then(({ ClassmateAgent }) => {
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
    this.dropSessions();
    this.begin(setup);
    this.makeAgents();
    this.openSessions();
  }

  /**
   * Opens a model session for each classmate, one after another in desk order, once the first
   * card is showing and only when the model is already downloaded (L2-021 criteria 1, 4 and 5).
   * Nothing waits for it: until a classmate's session arrives it plays from its profile. The
   * first session that cannot be opened stops the opening (docs/adr/0030).
   */
  private openSessions(): void {
    const tour = ++this.sessionsFor;
    const profiles = [...this.profiles.values()];
    const current = () => !this.destroyed && this.sessionsFor === tour;
    void (async () => {
      try {
        if (!(await this.model.isReady())) return;
      } catch {
        return;
      }
      for (const profile of profiles) {
        if (!current()) return;
        let session: ClassmateModelSession;
        try {
          session = await this.model.openSession(profile);
        } catch {
          return;
        }
        if (!current()) return session.destroy();
        this.sessions.set(profile.id, session);
        this.agents?.get(profile.id)?.useSession(session);
        // A session that arrives during its classmate's duel is asked about the card at once.
        const playing = this.playing;
        if (playing && this.rivalOf(playing) === profile.id) this.askModel(playing);
      }
    })();
  }

  /** Destroys every model session of the tour (L2-021 criterion 6). */
  private dropSessions(): void {
    this.sessionsFor++;
    for (const session of this.sessions.values()) session.destroy();
    this.sessions.clear();
    for (const agent of this.agents?.values() ?? []) agent.useSession(null);
  }

  /** Drops an ended tour, its clock and its result, so a new one can start from Game Setup. */
  private dropEnded(): void {
    this.dropSessions();
    if (this.ticking !== null) clearInterval(this.ticking);
    this.ticking = null;
    this.clock.clear();
    this.waiting = null;
    this.playing = null;
    this.state.set(null);
    this.ended.set(null);
    this.current.set(null);
  }

  /**
   * Pause: the game's clock stops, so the card's time, a freeze, the classmate's answer, the
   * waits between screens and the tour's time limit all wait (L2-033 criterion 4, ADR 0027).
   */
  pause(): void {
    if (this.destroyed || this.held()) return;
    this.clock.pause();
    this.held.set(true);
  }

  /** "Keep playing": the same flash card goes on with the same time left. */
  resume(): void {
    if (!this.held()) return;
    this.clock.resume();
    this.held.set(false);
  }

  /** "Go home": a solo game is left at once; leaving the solo group then destroys it. */
  leave(): Promise<void> {
    this.stop();
    return Promise.resolve();
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
      [...this.profiles.values()].map((profile) => {
        const agent = new Agent(profile, mathRandom);
        agent.useSession(this.sessions.get(profile.id) ?? null);
        return [profile.id, agent];
      }),
    );
  }

  sendSticker(): void {
    // Stickers are sent in a game with friends only (L2-028).
  }

  answer(value: number): void {
    // An answer given while paused does not count (L2-033 criterion 4).
    if (this.held()) return;
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

  watchMoments(listener: (moment: GameMoment) => void): () => void {
    this.momentListeners.add(listener);
    return () => this.momentListeners.delete(listener);
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
      profileAnswer: null,
      asking: null,
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

  /**
   * Asks the classmate for its answer to the card, given from the time it can answer: its
   * profile fixes the answer and the time first, then its model session, if it has one, may
   * replace them before that time (L2-021 criterion 3, docs/adr/0030).
   */
  private classmateDecides(playing: Playing, fromMs: number): void {
    const agent = this.agents?.get(this.rivalOf(playing));
    if (!agent || playing.duel.outcome !== 'open') return;
    const notBeforeMs = ClassPace.notBeforeMs(this.lostInARow);
    const decision = agent.decide(playing.duel.card, notBeforeMs);
    const atMs = Math.max(fromMs + decision.afterMs, this.clock.now());
    const timer = this.clock.after(atMs - this.clock.now(), () => {
      // The profile's time came first: the model's answer is no longer wanted.
      this.stopAsking(playing);
      playing.profileAnswer = null;
      this.classmateAnswers(playing, decision.answer);
    });
    playing.timers.push(timer);
    playing.profileAnswer = { timer, fromMs, notBeforeMs };
    this.askModel(playing);
  }

  /**
   * Asks the classmate's model session about the card. A valid decision that arrives before the
   * profile's time replaces it; anything else leaves the profile's answer to stand. The card
   * never waits for the model.
   */
  private askModel(playing: Playing): void {
    const pending = playing.profileAnswer;
    const agent = this.agents?.get(this.rivalOf(playing));
    if (!pending || !agent?.hasSession || playing.asking) return;
    const asking = new AbortController();
    playing.asking = asking;
    void agent
      .decideWithModel(playing.duel.card, asking.signal, pending.notBeforeMs)
      .then((decision) => {
        if (playing.asking === asking) playing.asking = null;
        if (!decision || asking.signal.aborted || playing.profileAnswer !== pending) return;
        if (this.playing !== playing || playing.duel.outcome !== 'open') return;
        this.clock.cancel(pending.timer);
        playing.profileAnswer = null;
        const now = this.clock.now();
        const atMs = Math.max(pending.fromMs + decision.afterMs, now);
        playing.timers.push(
          this.clock.after(atMs - now, () => this.classmateAnswers(playing, decision.answer)),
        );
      });
  }

  /** Aborts the prompt to the classmate's model session, if one waits. */
  private stopAsking(playing: Playing): void {
    playing.asking?.abort();
    playing.asking = null;
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
    // The child's right answer won the duel: the chime's moment (docs/adr/0029).
    this.report('answerCorrect');
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
    // The child hopped on and their passport is stamped: the jingle's moment (docs/adr/0029).
    if (move.kind === 'hop' && move.traveller === YOU) this.report('countryReached');
    this.waiting = this.clock.after(MESSAGE_MS, () => (this.ending ? this.finish() : this.next()));
  }

  /** Publishes how the tour ended and opens the Podium (L2-030 criterion 5, L2-035). */
  private finish(): void {
    const rules = this.rules;
    const ending = this.ending;
    if (!rules || !ending) return;
    this.clock.cancel(this.waiting);
    this.waiting = null;
    // The tour is over: its model sessions go (L2-021 criterion 6).
    this.dropSessions();
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
    playing.profileAnswer = null;
    this.stopAsking(playing);
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

  private report(moment: GameMoment): void {
    for (const listener of [...this.momentListeners]) listener(moment);
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
    if (this.playing) this.cancel(this.playing);
    this.dropSessions();
    this.destroyed = true;
    if (this.ticking !== null) clearInterval(this.ticking);
    this.ticking = null;
    this.clock.clear();
    this.listeners.clear();
    this.momentListeners.clear();
    this.playing = null;
  }
}

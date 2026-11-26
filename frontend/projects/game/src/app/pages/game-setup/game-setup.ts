import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  GAME_SESSION,
  MATHS_KINDS,
  PLAYER_CHOICES,
  ROOM_SESSION,
  TIMES_TABLES,
  WAY_OF_ANSWERING,
  type CardSpeed,
  type GameSetup,
  type MathsKind,
  type RoomSession,
  type TourLength,
} from '@atw/api';
import {
  Alert,
  Choices,
  Cluster,
  IconButton,
  Panel,
  PanelHead,
  Screen,
  ScreenBody,
  Segmented,
  Skeleton,
  Spinner,
  Stack,
  TableKeys,
  TextButton,
  ToggleChips,
  TopBar,
  ToyButton,
  type ChoiceOption,
  type SegmentedOption,
  type ToggleChipOption,
} from '@atw/components';
import { GameSetupRules, type SetupChange } from '@atw/domain';

const KINDS: readonly ToggleChipOption[] = [
  { value: 'times', label: 'Times', symbol: '×' },
  { value: 'plus', label: 'Plus', symbol: '+' },
  { value: 'minus', label: 'Minus', symbol: '−' },
  { value: 'divide', label: 'Divide', symbol: '÷' },
];

const TOUR_LENGTHS: readonly ChoiceOption<TourLength>[] = [
  { value: 6, label: '6', unit: 'desks' },
  { value: 12, label: '12', unit: 'desks' },
  { value: 24, label: '24', unit: 'desks' },
];

const CARD_SPEEDS: readonly SegmentedOption<CardSpeed>[] = [
  { value: 'chill', label: 'Chill' },
  { value: 'normal', label: 'Normal' },
  { value: 'lightning', label: 'Lightning' },
];

/**
 * Game Setup (docs/mocks/pages/game-setup/): the kinds of maths, the times tables, the tour
 * length and the card speed. Each choice passes through `GameSetupRules`. In a solo game it is
 * kept on the device, and "Go!" starts the solo game with the setup as it stands and opens Duel
 * (L2-016, L2-017, L2-018 criterion 1, docs/adr/0016, docs/adr/0017). In a room the host sets up
 * the race: it starts from the room's setup, "Save" sends it to the room, busy meanwhile, and
 * opens the Lobby once saved, or says it did not save; Back returns to the Lobby (L2-018
 * criteria 2, 5, 6 and 7, docs/adr/0034).
 */
@Component({
  selector: 'atw-game-setup-page',
  imports: [
    Alert,
    Choices,
    Cluster,
    IconButton,
    Panel,
    PanelHead,
    RouterLink,
    Screen,
    ScreenBody,
    Segmented,
    Skeleton,
    Spinner,
    Stack,
    TableKeys,
    TextButton,
    ToggleChips,
    TopBar,
    ToyButton,
  ],
  templateUrl: './game-setup.html',
  styleUrl: './game-setup.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameSetupPage {
  private readonly choices = inject(PLAYER_CHOICES);
  private readonly session = inject(GAME_SESSION, { optional: true });
  /** The room, in a game with friends; null in a solo game. */
  private readonly room = inject(ROOM_SESSION, { optional: true });
  private readonly router = inject(Router);
  private readonly way = inject(WAY_OF_ANSWERING);
  /** The host's setup before it is saved, once they changed a choice. */
  private readonly draft = signal<GameSetup | null>(null);

  protected readonly kinds = KINDS;
  protected readonly tables = TIMES_TABLES;
  protected readonly tourLengths = TOUR_LENGTHS;
  protected readonly cardSpeeds = CARD_SPEEDS;

  /** Whether the host sets up a room's race rather than a solo game. */
  protected readonly inRoom = this.room !== null;
  /** The setup as it stands; in a room, null until the room's setup has arrived. */
  protected readonly setup = computed<GameSetup | null>(() =>
    this.room ? (this.draft() ?? this.room.room()?.setup ?? null) : this.choices.setup(),
  );
  /** Back: the Lobby in a room, Solo Or Friends in a solo game (L2-030 criterion 8). */
  protected readonly backLink = this.room ? `/room/${this.room.entry.code}` : '/play';
  /** While the host's setup is being saved to the room (L2-018 criterion 6). */
  protected readonly saving = signal(false);
  /** Whether the room refused the setup or it could not be sent (L2-018 criterion 7). */
  protected readonly notSaved = signal(false);
  /** The last one the child tried to turn off, until the next choice changes the setup. */
  protected readonly refused = signal<SetupChange['refused']>(null);
  protected readonly tablesEnabled = computed(() => {
    const setup = this.setup();
    return setup !== null && GameSetupRules.tablesEnabled(setup);
  });
  protected readonly tour = computed(() =>
    GameSetupRules.describeTour(this.setup()?.tourLength ?? 12),
  );
  protected readonly secondsPerCard = computed(() =>
    GameSetupRules.secondsPerCard(this.setup()?.cardSpeed ?? 'normal'),
  );

  protected toggleKind(kind: string): void {
    const setup = this.setup();
    if (setup && (MATHS_KINDS as readonly string[]).includes(kind)) {
      this.apply(GameSetupRules.toggleKind(setup, kind as MathsKind));
    }
  }

  protected toggleTable(table: number): void {
    const setup = this.setup();
    if (setup) this.apply(GameSetupRules.toggleTable(setup, table));
  }

  protected easy(): void {
    const setup = this.setup();
    if (setup) this.keep(GameSetupRules.easy(setup));
  }

  protected all(): void {
    const setup = this.setup();
    if (setup) this.keep(GameSetupRules.all(setup));
  }

  protected chooseTourLength(tourLength: TourLength): void {
    const setup = this.setup();
    if (setup) this.keep(GameSetupRules.chooseTourLength(setup, tourLength));
  }

  protected chooseCardSpeed(cardSpeed: CardSpeed): void {
    const setup = this.setup();
    if (setup) this.keep(GameSetupRules.chooseCardSpeed(setup, cardSpeed));
  }

  /**
   * "Go!" starts the solo game, at Mic Check when it is needed (L2-012 criteria 1, 5, 6 and 13);
   * in a room, "Save" sends the setup to the room.
   */
  protected go(): void {
    const setup = this.setup();
    if (!setup) return;
    if (this.room) {
      void this.save(this.room, setup);
      return;
    }
    const micCheck = this.way.micCheckNeeded();
    this.session?.start(setup, { micCheck });
    void this.router.navigateByUrl(micCheck ? '/mic' : '/duel');
  }

  /** "Save", and "Try again" after the room refused it: the Lobby opens once it is saved. */
  private async save(room: RoomSession, setup: GameSetup): Promise<void> {
    if (this.saving()) return;
    this.saving.set(true);
    this.notSaved.set(false);
    try {
      await room.saveSetup(setup);
    } catch {
      this.notSaved.set(true);
      return;
    } finally {
      this.saving.set(false);
    }
    await this.router.navigateByUrl(this.backLink);
  }

  private apply(change: SetupChange): void {
    if (change.refused) this.refused.set(change.refused);
    else this.keep(change.setup);
  }

  private keep(setup: GameSetup): void {
    const now = this.setup();
    if (this.saving() || (now && GameSetupRules.same(setup, now))) return;
    this.refused.set(null);
    if (this.room) this.draft.set(setup);
    else this.choices.changeSetup(setup);
  }
}

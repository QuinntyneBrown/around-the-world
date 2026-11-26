import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  GAME_SESSION,
  MATHS_KINDS,
  PLAYER_CHOICES,
  TIMES_TABLES,
  WAY_OF_ANSWERING,
  type CardSpeed,
  type GameSetup,
  type MathsKind,
  type TourLength,
} from '@atw/api';
import {
  Choices,
  Cluster,
  IconButton,
  Panel,
  PanelHead,
  Screen,
  ScreenBody,
  Segmented,
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
 * Game Setup in a solo game (docs/mocks/pages/game-setup/): the kinds of maths, the times
 * tables, the tour length and the card speed. Each choice passes through `GameSetupRules` and
 * is kept on the device; "Go!" starts the solo game with the setup as it stands and opens Duel
 * (L2-016, L2-017, L2-018 criterion 1, docs/adr/0016, docs/adr/0017).
 */
@Component({
  selector: 'atw-game-setup-page',
  imports: [
    Choices,
    Cluster,
    IconButton,
    Panel,
    PanelHead,
    RouterLink,
    Screen,
    ScreenBody,
    Segmented,
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
  private readonly session = inject(GAME_SESSION);
  private readonly router = inject(Router);
  private readonly way = inject(WAY_OF_ANSWERING);

  protected readonly kinds = KINDS;
  protected readonly tables = TIMES_TABLES;
  protected readonly tourLengths = TOUR_LENGTHS;
  protected readonly cardSpeeds = CARD_SPEEDS;

  protected readonly setup = this.choices.setup;
  /** The last one the child tried to turn off, until the next choice changes the setup. */
  protected readonly refused = signal<SetupChange['refused']>(null);
  protected readonly tablesEnabled = computed(() => GameSetupRules.tablesEnabled(this.setup()));
  protected readonly tour = computed(() => GameSetupRules.describeTour(this.setup().tourLength));
  protected readonly secondsPerCard = computed(() =>
    GameSetupRules.secondsPerCard(this.setup().cardSpeed),
  );

  protected toggleKind(kind: string): void {
    if ((MATHS_KINDS as readonly string[]).includes(kind)) {
      this.apply(GameSetupRules.toggleKind(this.setup(), kind as MathsKind));
    }
  }

  protected toggleTable(table: number): void {
    this.apply(GameSetupRules.toggleTable(this.setup(), table));
  }

  protected easy(): void {
    this.keep(GameSetupRules.easy(this.setup()));
  }

  protected all(): void {
    this.keep(GameSetupRules.all(this.setup()));
  }

  protected chooseTourLength(tourLength: TourLength): void {
    this.keep(GameSetupRules.chooseTourLength(this.setup(), tourLength));
  }

  protected chooseCardSpeed(cardSpeed: CardSpeed): void {
    this.keep(GameSetupRules.chooseCardSpeed(this.setup(), cardSpeed));
  }

  /** Starts the game, at Mic Check when it is needed (L2-012 criteria 1, 5, 6 and 13). */
  protected go(): void {
    const micCheck = this.way.micCheckNeeded();
    this.session.start(this.setup(), { micCheck });
    void this.router.navigateByUrl(micCheck ? '/mic' : '/duel');
  }

  private apply(change: SetupChange): void {
    if (change.refused) this.refused.set(change.refused);
    else this.keep(change.setup);
  }

  private keep(setup: GameSetup): void {
    if (GameSetupRules.same(setup, this.setup())) return;
    this.refused.set(null);
    this.choices.changeSetup(setup);
  }
}

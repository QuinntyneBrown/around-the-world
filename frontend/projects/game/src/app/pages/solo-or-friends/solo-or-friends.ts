import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  NETWORK,
  PICTURE_LOADER,
  PLAYER_CHOICES,
  ROOMS_API,
  VISIT,
  type PictureArrival,
} from '@atw/api';
import {
  Alert,
  CodeLetters,
  IconButton,
  ModeCard,
  ModeGrid,
  Portrait,
  PortraitStack,
  Screen,
  ScreenBody,
  Spinner,
  TextButton,
  TopBar,
  ToyButton,
} from '@atw/components';
import { KIDS, NicknameGenerator } from '@atw/domain';
import { warmSoloGame } from '../../games/warm-solo-game';
import { roomRefusal, type RoomRefusal } from './room-refusal';

/**
 * Solo Or Friends (docs/mocks/pages/solo-or-friends/): "Just me", with the four kids the child
 * did not pick as classmates, and "With friends". "Play solo" opens Game Setup (L2-030
 * criterion 2), in every state (L2-054 criterion 3). "Make a room" asks the backend for a room
 * and opens its Lobby (L2-022 criterion 1); while it is made the button is busy, and a refusal,
 * a rate limit or no network is explained on the card (L2-022 criteria 3 to 6,
 * docs/adr/0031-making-a-room.md). "Join a room" opens Room, except with no network or while a
 * room is being made (docs/adr/0032).
 * The screen waits for the classmates' portraits (docs/adr/0017).
 */
@Component({
  selector: 'atw-solo-or-friends-page',
  imports: [
    Alert,
    CodeLetters,
    IconButton,
    ModeCard,
    ModeGrid,
    Portrait,
    PortraitStack,
    RouterLink,
    Screen,
    ScreenBody,
    Spinner,
    TextButton,
    TopBar,
    ToyButton,
  ],
  templateUrl: './solo-or-friends.html',
  styleUrl: './solo-or-friends.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SoloOrFriendsPage {
  private readonly choices = inject(PLAYER_CHOICES);
  private readonly rooms = inject(ROOMS_API);
  private readonly visit = inject(VISIT);
  private readonly router = inject(Router);
  private readonly nicknames = inject(NicknameGenerator);
  private readonly arriving = new AbortController();
  private gone = false;

  /** The four kids the child did not pick, who are among the classmates (L2-019 criterion 3). */
  protected readonly classmates = computed(() => {
    const picked = this.choices.kid() ?? 'zuri';
    return KIDS.filter((kid) => kid.id !== picked);
  });
  protected readonly pictures = signal<PictureArrival | 'loading'>('loading');
  protected readonly online = inject(NETWORK).online;
  /** Whether a room is being made. */
  protected readonly making = signal(false);
  /** What went wrong with the last "Make a room", or null. */
  protected readonly refusal = signal<RoomRefusal | null>(null);
  protected readonly canMakeRoom = computed(
    () => this.online() && !this.making() && this.refusal() !== 'rate-limited',
  );

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.gone = true;
      this.arriving.abort();
    });
    inject(PICTURE_LOADER)
      .preload(
        this.classmates().map((kid) => kid.picture),
        this.arriving.signal,
      )
      .then((arrival) => this.pictures.set(arrival));
    void warmSoloGame();
  }

  /** "Make a room", and "Try again" after a failure: the kid and the nickname's indexes only. */
  protected async makeRoom(): Promise<void> {
    if (this.making()) return;
    const kid = this.choices.kid() ?? 'zuri';
    const nickname = this.choices.nickname() ?? this.nicknames.generate();
    this.making.set(true);
    this.refusal.set(null);
    try {
      const entry = await this.rooms.makeRoom(kid, nickname);
      if (this.gone) return;
      this.visit.enterRoom(entry);
      await this.router.navigate(['/room', entry.code]);
    } catch (failure) {
      if (!this.gone) this.refusal.set(roomRefusal(failure));
    } finally {
      this.making.set(false);
    }
  }
}

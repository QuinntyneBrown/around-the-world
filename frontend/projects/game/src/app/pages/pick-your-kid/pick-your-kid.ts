import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { PICTURE_LOADER, PLAYER_CHOICES, type KidId, type PictureArrival } from '@atw/api';
import {
  Alert,
  IconButton,
  KidPicker,
  Nickname,
  Panel,
  Portrait,
  Screen,
  ScreenBody,
  Skeleton,
  Stack,
  TextButton,
  TopBar,
  ToyButton,
} from '@atw/components';
import { kidById, KIDS, NicknameGenerator } from '@atw/domain';

/**
 * Pick Your Kid (docs/mocks/pages/pick-your-kid/): the five kids, the chosen one brought
 * forward, a generated nickname that can be rolled again but never typed, and "I'm {kid}!",
 * which keeps both on the device and opens Solo Or Friends (L2-013, L2-014).
 */
@Component({
  selector: 'atw-pick-your-kid-page',
  imports: [
    Alert,
    IconButton,
    KidPicker,
    Nickname,
    Panel,
    Portrait,
    RouterLink,
    Screen,
    ScreenBody,
    Skeleton,
    Stack,
    TextButton,
    TopBar,
    ToyButton,
  ],
  templateUrl: './pick-your-kid.html',
  styleUrl: './pick-your-kid.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PickYourKidPage {
  private readonly choices = inject(PLAYER_CHOICES);
  private readonly nicknames = inject(NicknameGenerator);
  private readonly loader = inject(PICTURE_LOADER);
  private readonly router = inject(Router);
  private arriving = new AbortController();

  /** The kept kid, or Zuri when none is kept (L2-013 criterion 1). */
  protected readonly selected = signal<KidId>(this.choices.kid() ?? 'zuri');
  /** The kept nickname, or a new one (L2-014 criterion 1). Kept only on confirming. */
  private readonly nickname = signal(this.choices.nickname() ?? this.nicknames.generate());
  protected readonly pictures = signal<PictureArrival | 'loading'>('loading');
  private readonly attempt = signal(0);

  protected readonly chosen = computed(() => this.withAttempt(kidById(this.selected())));
  protected readonly kids = computed(() => KIDS.map((kid) => this.withAttempt(kid)));
  protected readonly nicknameWords = computed(() => this.nicknames.words(this.nickname()));

  constructor() {
    inject(DestroyRef).onDestroy(() => this.arriving.abort());
    this.loadPictures();
  }

  protected select(kid: KidId): void {
    this.selected.set(kid);
  }

  protected newName(): void {
    this.nickname.update((current) => this.nicknames.generateOtherThan(current));
  }

  protected confirm(): void {
    this.choices.confirmKid(this.selected(), this.nickname());
    void this.router.navigateByUrl('/play');
  }

  protected tryPicturesAgain(): void {
    this.attempt.update((attempt) => attempt + 1);
    this.loadPictures();
  }

  private loadPictures(): void {
    this.arriving.abort();
    this.arriving = new AbortController();
    this.pictures.set('loading');
    this.loader
      .preload(
        this.kids().map((kid) => kid.picture),
        this.arriving.signal,
      )
      .then((arrival) => this.pictures.set(arrival));
  }

  /** A fresh address on each try, so a picture that failed is fetched again. */
  private withAttempt<T extends { picture: string }>(kid: T): T {
    const attempt = this.attempt();
    return attempt === 0 ? kid : { ...kid, picture: `${kid.picture}?try=${attempt}` };
  }
}

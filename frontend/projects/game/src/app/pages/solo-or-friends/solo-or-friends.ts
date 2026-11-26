import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { PICTURE_LOADER, PLAYER_CHOICES, type PictureArrival } from '@atw/api';
import {
  CodeLetters,
  IconButton,
  ModeCard,
  ModeGrid,
  Portrait,
  PortraitStack,
  Screen,
  ScreenBody,
  TopBar,
  ToyButton,
} from '@atw/components';
import { KIDS } from '@atw/domain';

/**
 * Solo Or Friends (docs/mocks/pages/solo-or-friends/): "Just me", with the four kids the child
 * did not pick as classmates, and "With friends". "Play solo" opens Game Setup (L2-030
 * criterion 2). The screen waits for the classmates' portraits (docs/adr/0017). "Make a room"
 * and "Join a room" stay disabled until journey 12 opens the room screens.
 */
@Component({
  selector: 'atw-solo-or-friends-page',
  imports: [
    CodeLetters,
    IconButton,
    ModeCard,
    ModeGrid,
    Portrait,
    PortraitStack,
    RouterLink,
    Screen,
    ScreenBody,
    TopBar,
    ToyButton,
  ],
  templateUrl: './solo-or-friends.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SoloOrFriendsPage {
  private readonly choices = inject(PLAYER_CHOICES);
  private readonly arriving = new AbortController();

  /** The four kids the child did not pick, who are among the classmates (L2-019 criterion 3). */
  protected readonly classmates = computed(() => {
    const picked = this.choices.kid() ?? 'zuri';
    return KIDS.filter((kid) => kid.id !== picked);
  });
  protected readonly pictures = signal<PictureArrival | 'loading'>('loading');

  constructor() {
    inject(DestroyRef).onDestroy(() => this.arriving.abort());
    inject(PICTURE_LOADER)
      .preload(
        this.classmates().map((kid) => kid.picture),
        this.arriving.signal,
      )
      .then((arrival) => this.pictures.set(arrival));
  }
}

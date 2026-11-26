import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  EnvironmentInjector,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { PICTURE_LOADER, PLAYER_CHOICES, VISIT, type PictureArrival } from '@atw/api';
import { Alert, IconButton, KidChip, Skeleton, ToyButton } from '@atw/components';
import { ClassroomStates, kidById, NicknameGenerator } from '@atw/domain';
import { ClassroomCanvas, type ClassroomStatus } from '../../classroom/classroom-canvas';

type Arrival = PictureArrival | 'loading';

/** The classroom's still picture, shown until the 3D classroom is drawn over it, or instead. */
const CLASSROOM_PICTURE = 'img/scene-classroom.jpg';

/**
 * Home (docs/mocks/pages/home/): the classroom, the game's name, one big Play button and the
 * kid chip, or a line of words for a child who has picked no kid (L2-013, L2-030, L2-032). The
 * settings button in the corner opens Settings; the sound button joins it with journey 10. The
 * 3D classroom is drawn over the still picture once it arrives; on a device that cannot draw
 * it, the picture stays and Home says so (L2-036, docs/adr/0028).
 */
@Component({
  selector: 'atw-home-page',
  imports: [Alert, ClassroomCanvas, IconButton, KidChip, RouterLink, Skeleton, ToyButton],
  templateUrl: './home.html',
  styleUrl: './home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage {
  private readonly choices = inject(PLAYER_CHOICES);
  private readonly nicknames = inject(NicknameGenerator);
  private readonly pictures = inject(PICTURE_LOADER);
  private readonly visit = inject(VISIT);
  private readonly injector = inject(EnvironmentInjector);

  protected readonly classroomPicture = CLASSROOM_PICTURE;
  protected readonly classroom = signal<Arrival>('loading');
  protected readonly kidPicture = signal<Arrival>('loading');
  /** The ring at rest, with the five kids, behind Home. */
  protected readonly atRest = ClassroomStates.atRest();
  protected readonly scene = signal<ClassroomStatus>('loading');

  /** The kept kid and nickname, when a kid has been picked before. */
  protected readonly kept = computed(() => {
    const kid = this.choices.kid();
    const nickname = this.choices.nickname();
    if (kid === null || nickname === null) return null;
    return { kid: kidById(kid), nickname: this.nicknames.words(nickname) };
  });

  /** Pick Your Kid for a child with no kid kept; Solo Or Friends otherwise (L2-030 criterion 1). */
  protected readonly playLink = computed(() => (this.kept() ? '/play' : '/kid'));
  protected readonly playLabel = computed(() =>
    this.visit.tourFinished() ? 'Play again' : 'Play',
  );

  /** The settings button opens Settings, whose code loads then (L2-032 criterion 4). */
  protected async openSettings(): Promise<void> {
    const { openSettings } = await import('../../dialogs/settings/open-settings');
    openSettings(this.injector);
  }

  constructor() {
    const arriving = new AbortController();
    inject(DestroyRef).onDestroy(() => arriving.abort());

    this.pictures
      .preload([CLASSROOM_PICTURE], arriving.signal)
      .then((arrival) => this.classroom.set(arrival));
    const kept = this.kept();
    if (kept) {
      this.pictures
        .preload([kept.kid.picture], arriving.signal)
        .then((arrival) => this.kidPicture.set(arrival));
    }
  }
}

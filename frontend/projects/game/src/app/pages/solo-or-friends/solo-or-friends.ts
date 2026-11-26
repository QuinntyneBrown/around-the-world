import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconButton, Panel, Screen, ScreenBody, Skeleton, Stack, TopBar } from '@atw/components';

/**
 * Solo Or Friends (docs/mocks/pages/solo-or-friends/). Until journey 03 builds the choice, the
 * route shows the screen's loading state: its top bar, with Back to Pick Your Kid (L2-030
 * criterion 8), and skeletons in the shape of the two ways to play.
 */
@Component({
  selector: 'atw-solo-or-friends-page',
  imports: [IconButton, Panel, RouterLink, Screen, ScreenBody, Skeleton, Stack, TopBar],
  templateUrl: './solo-or-friends.html',
  styleUrl: './solo-or-friends.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SoloOrFriendsPage {}

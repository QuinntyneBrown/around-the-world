import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Notice, Screen, ToyButton } from '@atw/components';

/**
 * Not Found (docs/mocks/pages/not-found/): an address that leads to no screen says so and offers
 * one way on, Home (L2-030 criterion 9).
 */
@Component({
  selector: 'atw-not-found-page',
  imports: [Notice, RouterLink, Screen, ToyButton],
  templateUrl: './not-found.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFoundPage {}

import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Skeleton } from '../skeleton/skeleton';
import { ToyButton } from '../toy-button/toy-button';

let nextId = 0;

/**
 * Nickname (docs/design-system/components/nickname.html): "Your game name", the nickname as
 * text, "New name" (a paper toy button with dice, its words shown from 576px) and the reason
 * there are no real names. There is no field: a child never types a name (L2-014). The
 * nickname is a polite live region, so a new one is read out. With `loading`, a skeleton
 * stands in for it.
 */
@Component({
  selector: 'atw-nickname',
  imports: [Skeleton, ToyButton],
  templateUrl: './nickname.html',
  styleUrl: './nickname.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Nickname {
  /** The nickname as words: "Speedy Otter". Rendered as text, never as HTML. */
  readonly value = input('');
  readonly loading = input(false);
  /** The child chose "New name". */
  readonly newName = output();

  private readonly id = nextId++;
  protected readonly labelId = `atw-nickname-label-${this.id}`;
  protected readonly valueId = `atw-nickname-value-${this.id}`;
}

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PLAYER_CHOICES, ROOMS_API, VISIT } from '@atw/api';
import {
  CodeField,
  FieldMessage,
  IconButton,
  ROOM_CODE_LENGTH,
  roomCodeLetters,
  Screen,
  ScreenBody,
  Spinner,
  Stack,
  TextButton,
  TopBar,
  ToyButton,
} from '@atw/components';
import { NicknameGenerator } from '@atw/domain';
import { JOIN_REFUSAL_WORDS, joinRefusal, type JoinRefusal } from './join-refusal';

/**
 * Room (docs/mocks/pages/room/): the child types the code read aloud and joins its room
 * (L2-023). "Join" waits for four letters; while the join is in progress the field waits and
 * Room says it is finding the friends; a refusal is an alert under the boxes, which are marked
 * invalid and shake once, and changing the code clears it. A rate limit keeps "Join" disabled
 * until Room is opened again; with no backend "Play solo instead" opens Game Setup
 * (docs/adr/0032-joining-a-room-and-the-lobby.md). The room's link fills the code in from the
 * address (L2-024 criterion 4).
 */
@Component({
  selector: 'atw-room-page',
  imports: [
    CodeField,
    FieldMessage,
    IconButton,
    RouterLink,
    Screen,
    ScreenBody,
    Spinner,
    Stack,
    TextButton,
    TopBar,
    ToyButton,
  ],
  templateUrl: './room.html',
  styleUrl: './room.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoomPage {
  private readonly rooms = inject(ROOMS_API);
  private readonly visit = inject(VISIT);
  private readonly choices = inject(PLAYER_CHOICES);
  private readonly nicknames = inject(NicknameGenerator);
  private readonly router = inject(Router);
  private gone = false;

  /** The letters typed, or those of the room's link the page was opened from. */
  protected readonly code = signal(
    roomCodeLetters(inject(ActivatedRoute).snapshot.paramMap.get('code') ?? ''),
  );
  protected readonly joining = signal(false);
  protected readonly refusal = signal<JoinRefusal | null>(null);
  /** Whether a rate limit was met since Room was opened. */
  private readonly limited = signal(false);
  protected readonly words = computed(() => {
    const refusal = this.refusal();
    return refusal ? JOIN_REFUSAL_WORDS[refusal] : null;
  });
  protected readonly canJoin = computed(
    () => this.code().length === ROOM_CODE_LENGTH && !this.joining() && !this.limited(),
  );

  constructor() {
    inject(DestroyRef).onDestroy(() => (this.gone = true));
  }

  /** A changed code is a new try: the refusal of the last one goes. */
  protected changeCode(code: string): void {
    this.code.set(code);
    if (this.refusal() !== 'rate-limited') this.refusal.set(null);
  }

  /** "Join", or Enter in the field: the code, the kid and the nickname's indexes only. */
  protected async join(): Promise<void> {
    if (!this.canJoin()) return;
    const kid = this.choices.kid() ?? 'zuri';
    const nickname = this.choices.nickname() ?? this.nicknames.generate();
    this.joining.set(true);
    this.refusal.set(null);
    try {
      const entry = await this.rooms.joinRoom(this.code(), kid, nickname);
      if (this.gone) return;
      this.visit.enterRoom(entry);
      // From the room's link the Lobby has the same address as Room: the router recognises it
      // again, now that the visit holds the room (docs/adr/0032).
      await this.router.navigate(['/room', entry.code], { onSameUrlNavigation: 'reload' });
    } catch (failure) {
      if (this.gone) return;
      const refusal = joinRefusal(failure);
      this.refusal.set(refusal);
      if (refusal === 'rate-limited') this.limited.set(true);
    } finally {
      this.joining.set(false);
    }
  }
}

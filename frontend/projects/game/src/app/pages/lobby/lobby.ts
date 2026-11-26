import { Clipboard } from '@angular/cdk/clipboard';
import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, linkedSignal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { PLAYER_CHOICES, ROOM_SESSION, type RoomState } from '@atw/api';
import {
  Alert,
  Cluster,
  IconButton,
  Panel,
  PanelHead,
  PlayerList,
  RoomCode,
  Screen,
  ScreenBody,
  Skeleton,
  Stack,
  Summary,
  TextButton,
  Toast,
  ToastRegion,
  TopBar,
  ToyButton,
  type PlayerCardModel,
} from '@atw/components';
import { KIDS, NicknameGenerator } from '@atw/domain';
import { keepNewest, lobbyNews, type LobbyMessage, type LobbyNews } from './lobby-news';
import { setupRows } from './lobby-words';

/** How many players a room holds (L2-023 criterion 5). */
const CAPACITY = 8;

/**
 * The Lobby (docs/mocks/pages/lobby/): the code in the largest type, the game's setup, the
 * start control and the players with the empty desks (L2-024 criteria 1 and 5, L2-025). It
 * reads the room from `ROOM_SESSION`, kept up to date over the room's connection: placeholders
 * stand in until the room first arrives (L2-031 criterion 4), and "We lost the room" takes the
 * start control's place when the connection cannot be got back (L2-029 criterion 6). The host
 * waits for a friend; any other player waits for the host (docs/adr/0032). Passing messages say
 * who joined and that the device's player is the host now, derived from two successive states
 * of the room, and whether "Copy room link" copied the link (L2-024 criteria 4 and 6).
 */
@Component({
  selector: 'atw-lobby-page',
  imports: [
    Alert,
    Cluster,
    IconButton,
    Panel,
    PanelHead,
    PlayerList,
    RoomCode,
    RouterLink,
    Screen,
    ScreenBody,
    Skeleton,
    Stack,
    Summary,
    TextButton,
    Toast,
    ToastRegion,
    TopBar,
    ToyButton,
  ],
  templateUrl: './lobby.html',
  styleUrl: './lobby.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LobbyPage {
  private readonly session = inject(ROOM_SESSION);
  private readonly router = inject(Router);
  private readonly nicknames = inject(NicknameGenerator);
  private readonly choices = inject(PLAYER_CHOICES);
  private readonly clipboard = inject(Clipboard);
  private readonly location = inject(DOCUMENT).location;
  private nextMessage = 0;

  protected readonly lost = computed(() => this.session.link() === 'lost');
  /** The room as last received; once lost before any arrived, the room as it was entered. */
  protected readonly room = computed(
    () => this.session.room() ?? (this.lost() ? this.session.entry.room : null),
  );
  protected readonly setup = computed(() => {
    const room = this.room();
    return room ? setupRows(room.setup, this.choices.wayOfAnswering()) : [];
  });
  protected readonly players = computed<PlayerCardModel[]>(() => {
    const room = this.room();
    if (!room) return [];
    return room.players.map((player) => {
      const kid = KIDS.find((candidate) => candidate.id === player.kid) ?? KIDS[0];
      return {
        id: player.id,
        kid: player.kid,
        kidName: kid.name,
        picture: kid.picture,
        nickname: this.nicknames.words(player.nickname),
        host: player.host,
        you: player.id === this.session.entry.playerId,
      };
    });
  });
  protected readonly capacity = CAPACITY;
  protected readonly alone = computed(() => this.players().length < 2);
  protected readonly isHost = computed(() => this.players().some((p) => p.you && p.host));
  protected readonly hostNickname = computed(
    () => this.players().find((player) => player.host)?.nickname ?? '',
  );

  /** The passing messages shown, three at most, the newest at the bottom (docs/adr/0032). */
  protected readonly messages = linkedSignal<RoomState | null, LobbyMessage[]>({
    source: this.session.room,
    computation: (room, previous) => {
      const shown = previous?.value ?? [];
      if (!room) return shown;
      const news = lobbyNews(previous?.source ?? null, room, this.session.entry.playerId, {
        nickname: (nickname) => this.nicknames.words(nickname),
        kidName: (kid) => KIDS.find((candidate) => candidate.id === kid)?.name ?? kid,
      });
      return news.length === 0
        ? shown
        : keepNewest(
            shown,
            news.map((n) => this.message(n)),
          );
    },
  });

  /**
   * "Copy room link": the Lobby's own address, which opens Room with the code filled in on any
   * device not in the room (L2-024 criterion 4, docs/adr/0032).
   */
  protected copyLink(): void {
    const code = this.session.entry.code;
    const copied = this.clipboard.copy(new URL(`/room/${code}`, this.location.href).href);
    const news: LobbyNews = copied
      ? { tone: 'success', heading: 'Link copied', text: 'Send it to a friend to get them in.' }
      : {
          tone: 'danger',
          heading: 'Couldn’t copy the link',
          text: `Say the code out loud instead: ${[...code].join(' ')}.`,
        };
    this.messages.update((shown) => keepNewest(shown, [this.message(news)]));
  }

  protected dismiss(id: number): void {
    this.messages.update((shown) => shown.filter((message) => message.id !== id));
  }

  private message(news: LobbyNews): LobbyMessage {
    return { ...news, id: this.nextMessage++ };
  }

  /** "Leave the room": the room is told, and Solo Or Friends opens (L2-030 criterion 8). */
  protected async leave(): Promise<void> {
    await this.session.leave();
    await this.router.navigateByUrl('/play');
  }

  /** "Try again" after the room was lost: connect afresh with the same token (docs/adr/0032). */
  protected retry(): void {
    this.session.retry();
  }
}

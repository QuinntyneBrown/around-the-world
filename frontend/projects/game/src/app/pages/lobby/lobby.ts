import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { PLAYER_CHOICES, VISIT } from '@atw/api';
import {
  Cluster,
  IconButton,
  Panel,
  PanelHead,
  PlayerList,
  RoomCode,
  Screen,
  ScreenBody,
  Stack,
  Summary,
  TopBar,
  ToyButton,
  type PlayerCardModel,
} from '@atw/components';
import { KIDS, NicknameGenerator } from '@atw/domain';
import { setupRows } from './lobby-words';

/** How many players a room holds (L2-023 criterion 5). */
const CAPACITY = 8;

/**
 * The Lobby (docs/mocks/pages/lobby/), as the host sees it before a friend joins: the code in
 * the largest type, the game's setup, "Start the race" waiting for a friend, and the players
 * with the empty desks (L2-024 criteria 1 and 5, L2-025 criterion 1). It reads the room the
 * visit holds; the room group opens it only while there is one (docs/adr/0031). Joining and the
 * live updates arrive with journey 13, "Copy room link" too, and "Change" with journey 14.
 */
@Component({
  selector: 'atw-lobby-page',
  imports: [
    Cluster,
    IconButton,
    Panel,
    PanelHead,
    PlayerList,
    RoomCode,
    Screen,
    ScreenBody,
    Stack,
    Summary,
    TopBar,
    ToyButton,
  ],
  templateUrl: './lobby.html',
  styleUrl: './lobby.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LobbyPage {
  private readonly visit = inject(VISIT);
  private readonly router = inject(Router);
  private readonly nicknames = inject(NicknameGenerator);
  private readonly choices = inject(PLAYER_CHOICES);

  protected readonly entry = computed(() => this.visit.room());
  protected readonly setup = computed(() => {
    const entry = this.entry();
    return entry ? setupRows(entry.room.setup, this.choices.wayOfAnswering()) : [];
  });
  protected readonly players = computed<PlayerCardModel[]>(() => {
    const entry = this.entry();
    if (!entry) return [];
    return entry.room.players.map((player) => {
      const kid = KIDS.find((candidate) => candidate.id === player.kid) ?? KIDS[0];
      return {
        id: player.id,
        kid: player.kid,
        kidName: kid.name,
        picture: kid.picture,
        nickname: this.nicknames.words(player.nickname),
        host: player.host,
        you: player.id === entry.playerId,
      };
    });
  });
  protected readonly capacity = CAPACITY;
  protected readonly alone = computed(() => this.players().length < 2);

  /** "Leave the room": the visit drops the room, and Solo Or Friends opens (L2-030 criterion 8). */
  protected leave(): void {
    this.visit.leaveRoom();
    void this.router.navigateByUrl('/play');
  }
}

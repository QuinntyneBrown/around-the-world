import { type Nickname, type RoomState } from '@atw/api';
import { type ToastTone } from '@atw/components';

/** A passing message of the Lobby (L2-024 criterion 6, L2-025 criterion 5). */
export interface LobbyMessage {
  readonly id: number;
  readonly tone: ToastTone;
  readonly heading: string;
  readonly text: string;
}

export type LobbyNews = Omit<LobbyMessage, 'id'>;

/** How many passing messages the Lobby shows at once (docs/design-system/patterns/notifications.html). */
export const MAX_MESSAGES = 3;

/** How the Lobby words a player: their nickname and their kid's name, built on the device. */
export interface PlayerWords {
  nickname(nickname: Nickname): string;
  kidName(kid: string): string;
}

/**
 * What changed between two states of the room that the Lobby says in a passing message: each
 * player who joined, other than the device's own ("{nickname} joined", "as {kid}"), and the
 * device's own player becoming the host ("You're the host now"). The first state the Lobby
 * receives says nothing, nor does a player who left (docs/adr/0032).
 */
export function lobbyNews(
  previous: RoomState | null,
  next: RoomState,
  me: string,
  words: PlayerWords,
): LobbyNews[] {
  if (previous === null) return [];
  const before = new Set(previous.players.map((player) => player.id));
  const news: LobbyNews[] = next.players
    .filter((player) => !before.has(player.id) && player.id !== me)
    .map((player) => ({
      tone: 'info',
      heading: `${words.nickname(player.nickname)} joined`,
      text: `as ${words.kidName(player.kid)}`,
    }));
  const wasHost = previous.players.some((player) => player.id === me && player.host);
  const isHost = next.players.some((player) => player.id === me && player.host);
  if (isHost && !wasHost) {
    news.push({
      tone: 'warning',
      heading: 'You’re the host now',
      text: 'The host left. You can start the race.',
    });
  }
  return news;
}

/** The messages with the new ones at the bottom, three at most: the oldest go first. */
export function keepNewest(
  messages: readonly LobbyMessage[],
  added: readonly LobbyMessage[],
): LobbyMessage[] {
  return [...messages, ...added].slice(-MAX_MESSAGES);
}

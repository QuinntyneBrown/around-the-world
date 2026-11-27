import { type Page, type Request } from '@playwright/test';
import { expect, test } from '../fixtures/test';
import { AppShellPage } from '../pages/app-shell.page';
import { DuelPage } from '../pages/duel.page';
import { GameSetupPage } from '../pages/game-setup.page';
import { HomePage } from '../pages/home.page';
import { LeaveGameDialog } from '../pages/leave-game.dialog';
import { LobbyPage } from '../pages/lobby.page';
import { MicCheckPage } from '../pages/mic-check.page';
import { NoticePage } from '../pages/notice.page';
import { RoomPage } from '../pages/room.page';
import { SoloOrFriendsPage } from '../pages/solo-or-friends.page';
import { gameState, joinedRoom, player, roomState, type GameOptions } from '../support/rooms';
import {
  askAnotherOrigin,
  framesAsMessages,
  keptText,
  notClosed,
  refusals,
} from '../support/safety';
import { SCREENS } from '../support/screens';

/**
 * Journey 20: prove the game is safe for children (L1-012: L2-040, L2-041, L2-042;
 * docs/detailed-designs/platform/keep-children-safe/, docs/adr/0040). Each spec watches what the
 * game does: what it sends, what it fetches, what it keeps, what it shows and what the browser
 * refuses. What the backend stores (L2-046) is proven by the backend's acceptance tests.
 *
 * Traces to: L2-040, L2-041, L2-042
 */

/** An origin that is not the game's: an advert, a tracker or an analytics package's. */
const ANOTHER_ORIGIN = 'https://ads.example.com';
// The host, "Speedy Otter" as Zuri; "Cosmic Llama" as Nia; and the child, "Brave Narwhal" as
// Pip, who joins room BOLT, answers by voice and watches the first duel.
const HOST = player(0, 'zuri', 0, 0, true);
const NIA = player(1, 'nia', 8, 4);
const PIP = player(2, 'pip', 5, 5);
const RACE = [HOST, NIA, PIP];
const PIP_RECORD = { version: 1, kid: 'pip', nickname: { adjective: 5, animal: 5 } };
const game = (options: Partial<GameOptions> = {}) => gameState({ players: RACE, ...options });
/** A solo child who answers by voice, the default, on a tour of 6 desks. */
const ZURI_BY_VOICE = {
  version: 1,
  kid: 'zuri',
  nickname: { adjective: 0, animal: 0 },
  setup: { kinds: ['times'], tables: [2, 3, 4, 5], tourLength: 6, cardSpeed: 'normal' },
};

/** When Kenji's profile answers right, with `random.always(0)` (docs/adr/0019). */
const KENJI_PROFILE_MS = 1786;

/** Records every request the page makes, from now on. */
function recordRequests(page: Page): Request[] {
  const requests: Request[] = [];
  page.on('request', (request) => requests.push(request));
  return requests;
}

test.describe('Only the game’s own origin', () => {
  test('@critical a request to another origin is refused by the browser before it leaves the device', async ({
    page,
    expectedErrors,
  }) => {
    // Given the game open on Home; the browser reports each request it refuses
    expectedErrors.push(/violates the (following|document's) Content Security Policy/);
    const home = new HomePage(page);
    await home.open();
    await expect(home.play).toBeVisible();

    // When code in the page asks another origin for data, a stream of events, a picture, a
    // script and a font, as an advert or a tracker would
    await askAnotherOrigin(page, ANOTHER_ORIGIN);

    // Then the browser refuses each under the game's policy, so none leaves the device
    // (L2-041 criterion 2); the fixture fails the spec on any that reaches the network
    await expect
      .poll(async () => (await refusals(page)).map(({ directive }) => directive).sort())
      .toEqual(['connect-src', 'connect-src', 'font-src', 'img-src', 'script-src-elem']);
    for (const { blocked } of await refusals(page)) {
      expect(blocked).toMatch(/^https:\/\/ads\.example\.com\//);
    }
  });

  test('the scripts, fonts, pictures and 3D scenes of a solo tour come from the game’s own origin', async ({
    page,
    device,
  }) => {
    // Given a child who answers with the number pad, and every request the page makes recorded
    await device.keeps({ ...ZURI_BY_VOICE, wayOfAnswering: 'numberPad' });
    const requests = recordRequests(page);

    // When they open the game, wait on Home while it draws the classroom, and start a tour
    const home = new HomePage(page);
    await home.open();
    await expect(home.classroomDrawn).toBeVisible();
    await home.settle();
    await new GameSetupPage(page).open();
    await new GameSetupPage(page).chooseGo();
    await expect(new DuelPage(page).sum).toHaveText(/\d+ × \d+/);

    // Then every request went to the game's own origin (L2-041 criteria 2 and 4)
    const own = new URL(page.url()).origin;
    expect(requests.filter((request) => new URL(request.url()).origin !== own)).toEqual([]);
    // And among them are its scripts, its fonts, its pictures and its 3D scenes
    const kinds = new Set(requests.map((request) => request.resourceType()));
    for (const kind of ['script', 'font', 'image']) expect(kinds).toContain(kind);
    expect(requests.some((request) => request.url().endsWith('.glb'))).toBe(true);
  });
});

test.describe('Nothing a child types or says leaves the device', () => {
  test('a whole game with friends sends the room only closed values and the connection token', async ({
    page,
    device,
    backend,
    roomHub,
    clock,
    voice,
    microphone,
  }) => {
    // Given Brave Narwhal, who answers by voice, and every request the page makes recorded
    await clock.hold();
    await device.keeps(PIP_RECORD);
    await microphone.grant();
    const made = joinedRoom('BOLT', RACE, PIP);
    backend.answer('POST', '/api/rooms/join', made);
    roomHub.serves(roomState('BOLT', RACE));
    const requests = recordRequests(page);

    // When she types the code read aloud and joins
    const solo = new SoloOrFriendsPage(page);
    await solo.open();
    await solo.joinRoom.click();
    const room = new RoomPage(page);
    await room.type('bolt');
    await room.chooseJoin();
    await expect(new LobbyPage(page).guestPanel).toContainText(
      'Waiting for Speedy Otter to start…',
    );

    // And passes Mic Check as the race starts, shouting "Ready!"
    roomHub.game(game({ phase: 'starting' }));
    const mic = new MicCheckPage(page);
    await mic.turnOnMic.click();
    await expect.poll(() => voice.listening()).toBe(1);
    await voice.say('Ready!');
    await mic.letsGo.click();

    // And watches the first duel, sending "Wow!"
    roomHub.game(game());
    const duel = new DuelPage(page);
    await expect(duel.result).toHaveText('Watching… your turn is next');
    await duel.sendSticker('Wow!');
    await expect.poll(() => roomHub.invoked().at(-1)).toBe('SendSticker');

    // And holds Japan in the next duel, shouting "twenty four" at 6 × 4
    roomHub.game(game({ travellerDesk: 3, duel: { number: 2, desk: 3 } }));
    await expect(duel.shout).toBeVisible();
    await expect.poll(() => voice.listening()).toBe(1);
    await voice.say('twenty four');
    await expect.poll(() => roomHub.invoked().at(-1)).toBe('SubmitAnswer');

    // And leaves the game
    await duel.leave.click();
    await new LeaveGameDialog(page).leave.click();
    await expect.poll(() => roomHub.invoked().at(-1)).toBe('LeaveRoom');

    // Then the backend was sent the code, the kid and the nickname's indexes only (L2-040 1)
    expect(notClosed(backend.requests().map(({ body }) => body))).toEqual([]);
    // And the room's connection only closed values: the setup, a number, a sticker's id
    expect(roomHub.invocations()).toEqual([
      { target: 'SendSticker', args: [2] },
      { target: 'SubmitAnswer', args: [24] },
      { target: 'LeaveRoom', args: [] },
    ]);
    expect(notClosed(framesAsMessages(roomHub.frames()))).toEqual([]);
    // And every address it asked for carried nothing but the connection token it was given
    for (const request of requests) {
      const asked = new URL(request.url());
      for (const [name, value] of asked.searchParams) {
        if (name === 'access_token') expect(value).toBe(made.token);
        else expect(`${name}=${value}`).toMatch(/^(negotiateVersion=1|id=[\w-]+)$/);
      }
    }
    // And no word she said, nor her nickname, went anywhere
    const everythingSent = [
      ...requests.map((request) => `${request.url()} ${request.postData() ?? ''}`),
      ...roomHub.frames(),
    ].join('\n');
    for (const word of ['Ready', 'twenty', 'four', 'Brave', 'Narwhal']) {
      expect(everythingSent).not.toContain(word);
    }
  });

  test('shouted answers are heard on the device, never recorded, kept or sent', async ({
    page,
    device,
    backend,
    clock,
    voice,
    microphone,
  }) => {
    // Given a solo child who answers by voice, and every request the page makes recorded
    await device.keeps(ZURI_BY_VOICE);
    await microphone.grant();
    await clock.hold();
    const requests = recordRequests(page);

    // When they pass Mic Check shouting "Ready!", and shout the answer to the first card
    const setup = new GameSetupPage(page);
    await setup.open();
    await setup.chooseGo();
    const mic = new MicCheckPage(page);
    await mic.turnOnMic.click();
    await expect.poll(() => voice.listening()).toBe(1);
    await voice.say('Ready!');
    await mic.letsGo.click();
    const duel = new DuelPage(page);
    const { answer } = await duel.card();
    await expect.poll(() => voice.listening()).toBe(1);
    await voice.say(String(answer));
    await expect(duel.result).toContainText('You got it!');

    // Then every recognition session listened on the device, and no recorder was made
    // (L2-040 criterion 2; docs/adr/0025)
    expect(await voice.offDevice()).toBe(0);
    expect(await microphone.recorders()).toBe(0);
    // And nothing heard is kept on the device
    expect(await keptText(page)).not.toContain('Ready');
    // And nothing went to the backend: a solo game asks only for the game's own files
    expect(backend.requests()).toEqual([]);
    expect(requests.filter((request) => request.method() !== 'GET')).toEqual([]);

    // When the child leaves Duel for World Map
    await clock.pass(1000 + 1200);
    await expect(page).toHaveURL(/\/map$/);

    // Then the microphone is released (L2-040 criterion 2)
    await expect.poll(() => voice.listening()).toBe(0);
    expect(await microphone.openStreams()).toBe(0);
  });

  test('a nickname that is not two list indexes is never shown: the kid’s name stands in', async ({
    page,
    device,
    backend,
    roomHub,
  }) => {
    // Given a room whose backend sends Cosmic Llama's nickname as markup, not as two indexes
    await device.keeps(PIP_RECORD);
    const markup = '<img src=x onerror="window.__atwBroken=1">Sneaky';
    // The fixtures' types hold indexes, so the markup is forced past them, as a broken backend would.
    const broken = { ...NIA, nickname: { adjective: markup, animal: 99 } } as unknown as typeof NIA;
    backend.answer('POST', '/api/rooms/join', joinedRoom('BOLT', [HOST, broken, PIP], PIP));
    roomHub.serves(roomState('BOLT', [HOST, broken, PIP]));

    // When Brave Narwhal joins and the Lobby shows the class
    const room = new RoomPage(page);
    await room.open();
    await room.type('BOLT');
    await room.chooseJoin();
    const lobby = new LobbyPage(page);
    await expect(lobby.count).toHaveText('3/8');

    // Then that player is shown by their kid's name, and nothing of what was sent is shown or
    // run (L2-040 criterion 3)
    await expect(lobby.player(1).name).toHaveText('Nia');
    await expect(lobby.player(1).kid).toHaveText('as Nia');
    const words = await new AppShellPage(page).words();
    for (const word of ['Sneaky', 'undefined', 'onerror']) expect(words).not.toContain(word);
    expect(await page.evaluate(() => 'atwBroken' in window || '__atwBroken' in window)).toBe(false);
    // And the others keep their nicknames, built from the lists by their indexes
    await expect(lobby.player(0).name).toHaveText('Speedy Otter');
    await expect(lobby.player(2).name).toHaveText('Brave Narwhal (you)');
  });
});

test.describe('No account, field, advert or purchase', () => {
  for (const screen of SCREENS) {
    test(`${screen.mock}: no field but the room code, and nothing asks for an account, a name, an age or money`, async ({
      page,
      device,
      backend,
      roomHub,
      clock,
      voice,
      microphone,
      network,
      clipboard,
    }) => {
      // Given the screen in its state, reached as a child reaches it
      await screen.reach({
        page,
        device,
        backend,
        roomHub,
        clock,
        voice,
        microphone,
        network,
        clipboard,
      });

      // When assistive technology reads it
      const tree = await new AppShellPage(page).accessibilityTree();

      // Then its only field for typing is the room code's (L2-040 criterion 4)
      const fields = tree
        .split('\n')
        .filter((line) => /^\s*- (textbox|searchbox|combobox|spinbutton)\b/.test(line));
      for (const field of fields) expect(field).toMatch(/textbox "Room code"/);
      // And no control asks for an account, a sign-in, an email address, an age, a real name or
      // money (L2-041 criteria 1 and 3)
      const controls = tree
        .split('\n')
        .filter((line) => /^\s*- (button|link|textbox|checkbox|switch|radio)\b/.test(line));
      for (const control of controls) {
        expect(control).not.toMatch(
          /sign.?in|log.?in|sign.?up|register|account|e-?mail|password|\bage\b|birthday|real name|\bbuy\b|shop|store|price|purchase|pay\b|subscribe|unlock|premium|coins|advert/i,
        );
      }
    });
  }

  for (const path of ['/sign-in', '/login', '/account', '/profile', '/shop', '/store']) {
    test(`no address leads to a sign-in, an account or a shop: ${path} is Not Found`, async ({
      page,
    }) => {
      // When a child types the address
      const notice = new NoticePage(page);
      await notice.openAt(path);

      // Then the game has no such screen (L2-041 criteria 1 and 3)
      await expect(notice.home).toBeVisible();
      await expect(notice.title).toHaveText('This desk isn’t on the map');
    });
  }
});

test.describe('Nothing a language model writes is shown', () => {
  test('words in a model’s reply are never shown, said aloud, kept or sent', async ({
    page,
    device,
    backend,
    clock,
    random,
    model,
    sound,
  }) => {
    // Given a model ready and slow, a profile that answers right after 1,786 ms, and a solo
    // child on a tour
    await device.keeps({ ...ZURI_BY_VOICE, wayOfAnswering: 'numberPad' });
    await random.always(0);
    await clock.hold();
    await model.holds();
    const setup = new GameSetupPage(page);
    await setup.open();
    await setup.chooseGo();
    const duel = new DuelPage(page);
    const { answer } = await duel.card();
    await expect.poll(() => model.waiting()).toBe(1);

    // When the model writes words beside its answer and time
    const words = 'Hello Speedy Otter, I am Kenji’s robot brain';
    await model.reply(JSON.stringify({ answer, afterMs: 1000, say: words }));

    // Then only a whole-number answer and a time are taken from a reply, so this one is
    // discarded and Kenji answers from the profile at the profile's time (L2-042 criterion 1)
    await clock.pass(KENJI_PROFILE_MS);
    await expect(duel.result).toHaveText(`Kenji said ${answer} first. So close!`);
    // And none of its words is shown, read out, said aloud, kept or sent (L2-042 criteria 1, 2)
    const shown = await new AppShellPage(page).words();
    for (const word of ['robot brain', 'Hello']) expect(shown).not.toContain(word);
    expect(await sound.spoken()).toEqual([]);
    expect(await keptText(page)).not.toContain('robot brain');
    expect(backend.requests()).toEqual([]);
  });
});

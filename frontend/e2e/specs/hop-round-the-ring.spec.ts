import { expect, test } from '../fixtures/test';
import { DuelPage } from '../pages/duel.page';
import { GameSetupPage } from '../pages/game-setup.page';
import { WorldMapPage } from '../pages/world-map.page';

/**
 * Journey 05: hop round the ring on the World Map (L2-002, L2-003, L2-007, L2-033, L2-034).
 * The game's clock is held, so "You got it!", the passport stamp and World Map's message stay
 * until the spec moves the clock on (docs/adr/0022-moving-round-the-ring.md).
 */

const ZURI = { version: 1, kid: 'zuri', nickname: { adjective: 0, animal: 0 } };

/** How a World Map message names a player at the start of a sentence (L2-034 criterion 14). */
const first = (name: string) => (name === 'Classmate' ? 'A classmate' : name);

test.describe('Hopping round the ring', () => {
  test('@critical a traveller who wins earns a stamp, hops on and duels the next desk', async ({
    page,
    device,
    clock,
  }) => {
    // Given a child travelling at desk 2 of 12 against Kenji, the clock held
    await device.keeps(ZURI);
    await clock.hold();
    const setup = new GameSetupPage(page);
    await setup.open();
    await setup.chooseGo();
    const duel = new DuelPage(page);
    const { answer } = await duel.card();

    // When the child answers first and "You got it!" has shown for 1 second
    await duel.answerWithPad(answer);
    await expect(duel.result).toHaveText(`= ${answer} You got it!`);
    await clock.pass(1000);

    // Then the passport stamp for the next desk's country stands in place of the flash card
    await expect(duel.stampCountry).toHaveText('Japan');
    await expect(duel.stampLandmark).toHaveText('Mount Fuji');
    await expect(duel.stampHop).toHaveText('Zuri hops to desk 3 of 12');
    await expect(duel.flashCard).toHaveCount(0);

    // When the stamp has shown for 1.2 seconds
    await clock.pass(1200);

    // Then World Map shows the hop with its message, the child's place and the standings
    const map = new WorldMapPage(page);
    await expect(page).toHaveURL(/\/map$/);
    await expect(map.heading).toHaveText('World map');
    await expect(map.message).toHaveText('You walk on to Japan!');
    await expect(map.where).toHaveText('You’re travelling · desk 3 of 12 · next stop UK');
    await expect(map.yourEntry).toHaveCount(1);
    expect((await map.entries())[0]).toEqual({ place: '1', name: 'You', score: '2/12', you: true });

    // When the message has stayed for 1.6 seconds
    await clock.pass(1600);

    // Then Duel returns with a new flash card at desk 3, against its desk holder
    await expect(page).toHaveURL(/\/duel$/);
    await expect(duel.heading).toHaveText('Duel at Japan');
    expect(await duel.named(duel.traveller)).toEqual(['You', 'Travelling']);
    expect(await duel.named(duel.deskHolder)).toEqual(['Classmate', 'Holds Japan']);
    await expect(duel.answerBox).toHaveText('?');
  });

  test('a traveller who loses sits down at that desk, and the desk holder travels on', async ({
    page,
    device,
    clock,
    random,
  }) => {
    // Given a child travelling at desk 2 against Kenji, who answers right and fast
    await device.keeps(ZURI);
    await random.always(0);
    await clock.hold();
    const setup = new GameSetupPage(page);
    await setup.open();
    await setup.chooseGo();
    const duel = new DuelPage(page);
    const { answer } = await duel.card();

    // When Kenji answers first
    await clock.pass(5000);

    // Then the flash card offers the quiet pill, the only action on the screen
    await expect(duel.result).toHaveText(`Kenji said ${answer} first. So close!`);
    await expect(duel.sitPill).toHaveText('You sit at Egypt · Kenji travels on');
    await expect(duel.numberPad).toHaveCount(0);

    // When the child chooses the pill
    await duel.sitPill.click();

    // Then World Map shows the child sitting down at Egypt and Kenji travelling on
    const map = new WorldMapPage(page);
    await expect(page).toHaveURL(/\/map$/);
    await expect(map.message).toHaveText('So close! You sit down at Egypt');
    await expect(map.where).toHaveText('You’re sitting at Egypt · Kenji is travelling');

    // And the child, who reached 1 first, stays above Kenji in the standings
    expect((await map.entries()).slice(0, 2)).toEqual([
      { place: '1', name: 'You', score: '1/12', you: true },
      { place: '2', name: 'Kenji', score: '1/12', you: false },
    ]);
  });

  test('while the child is seated the classmates duel on World Map, each with its message', async ({
    page,
    device,
    clock,
    random,
  }) => {
    // Given a child who sat down at Egypt, Kenji travelling on to desk 3
    await device.keeps(ZURI);
    await random.always(0);
    await clock.hold();
    const setup = new GameSetupPage(page);
    await setup.open();
    await setup.chooseGo();
    const duel = new DuelPage(page);
    await clock.pass(5000);
    await duel.sitPill.click();
    const map = new WorldMapPage(page);
    await expect(map.message).toHaveText('So close! You sit down at Egypt');

    // When the message has stayed for 1.6 seconds
    await clock.pass(1600);

    // Then World Map stays while Kenji duels the holder of Japan, with no message yet
    await expect(map.message).toHaveCount(0);
    await expect(page).toHaveURL(/\/map$/);

    // When Kenji answers first
    await clock.pass(2000);

    // Then World Map shows Kenji walking on, and still says where the child sits
    await expect(map.message).toHaveText('Kenji walks on to UK!');
    await expect(map.where).toHaveText('You’re sitting at Egypt · Kenji is travelling');
    await expect(page).toHaveURL(/\/map$/);
  });

  test('“Back to the card” plays the classmates out, and the child duels as the desk holder', async ({
    page,
    device,
    clock,
    random,
  }) => {
    // Given a child seated at Egypt on World Map while the classmates duel
    await device.keeps(ZURI);
    await random.always(0);
    await clock.hold();
    const setup = new GameSetupPage(page);
    await setup.open();
    await setup.chooseGo();
    const duel = new DuelPage(page);
    await clock.pass(5000);
    await duel.sitPill.click();
    const map = new WorldMapPage(page);
    await expect(map.message).toHaveText('So close! You sit down at Egypt');

    // When the child chooses "Back to the card"
    await map.back.click();

    // Then Duel returns at once, a traveller beside the child's desk and the child holding it
    await expect(page).toHaveURL(/\/duel$/);
    await expect(duel.heading).toHaveText('Duel at Egypt');
    const [rival, role] = await duel.named(duel.traveller);
    expect(role).toBe('Travelling');
    expect(await duel.named(duel.deskHolder)).toEqual(['You', 'Holds Egypt']);
    await expect(duel.timerBar).not.toHaveAttribute('data-kid', 'zuri');

    // When the child answers first and "You got it!" has shown for 1 second
    const { answer } = await duel.card();
    await duel.answerWithPad(answer);
    await expect(duel.result).toHaveText(`= ${answer} You got it!`);
    await clock.pass(1000);

    // Then World Map opens with no stamp: the traveller sits down and the child travels on
    await expect(page).toHaveURL(/\/map$/);
    await expect(map.message).toHaveText(`${first(rival)} sits down at Egypt · You travel on`);
    await expect(map.where).toHaveText('You’re travelling · desk 3 of 12 · next stop UK');
  });

  test('a desk holder who loses keeps the desk, and the traveller hops on', async ({
    page,
    device,
    clock,
    random,
  }) => {
    // Given a child holding Egypt against a traveller who answers right and fast
    await device.keeps(ZURI);
    await random.always(0);
    await clock.hold();
    const setup = new GameSetupPage(page);
    await setup.open();
    await setup.chooseGo();
    const duel = new DuelPage(page);
    await clock.pass(5000);
    await duel.sitPill.click();
    const map = new WorldMapPage(page);
    await map.back.click();
    await expect(duel.heading).toHaveText('Duel at Egypt');
    const [rival] = await duel.named(duel.traveller);
    const { answer } = await duel.card();

    // When the traveller answers first
    await clock.pass(5000);

    // Then the child keeps their desk and the traveller hops on
    await expect(duel.result).toHaveText(`${rival} said ${answer} first. So close!`);
    await expect(duel.announcement).toHaveText(`${rival} said ${answer} first. You keep Egypt.`);
    await expect(duel.sitPill).toHaveText(`You keep Egypt · ${rival} hops on`);
    await duel.sitPill.click();
    await expect(map.message).toHaveText(`${first(rival)} walks on to Japan!`);
    await expect(map.where).toHaveText(
      `You’re sitting at Egypt · ${first(rival) === 'A classmate' ? 'a classmate' : rival} is travelling`,
    );
  });
});

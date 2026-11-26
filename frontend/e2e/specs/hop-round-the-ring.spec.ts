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
});

import { expect, test } from '../fixtures/test';
import { HomePage } from '../pages/home.page';
import { PickYourKidPage } from '../pages/pick-your-kid.page';

/** Journey 02: start from Home and pick a kid (L2-013, L2-014, L2-015, L2-030, L2-031, L2-032). */

const ADJECTIVES = [
  'Speedy',
  'Mighty',
  'Clever',
  'Bouncy',
  'Sneaky',
  'Brave',
  'Zippy',
  'Jolly',
  'Cosmic',
  'Turbo',
];
const ANIMALS = [
  'Otter',
  'Panda',
  'Falcon',
  'Gecko',
  'Llama',
  'Narwhal',
  'Koala',
  'Fox',
  'Penguin',
  'Yak',
];
export const A_NICKNAME = new RegExp(`^(${ADJECTIVES.join('|')}) (${ANIMALS.join('|')})$`);

test.describe('Home for a new child', () => {
  test('@critical Play opens Pick Your Kid, and Back returns Home', async ({ page }) => {
    // Given a child who has picked no kid
    const home = new HomePage(page);
    await home.open();

    // Then Home shows the game's name, one Play button and no kid, nickname or "Change kid"
    await expect(home.title).toHaveText('Around the World');
    await expect(home.play).toHaveText('Play');
    await expect(home.noNamesLine).toBeVisible();
    await expect(home.kidChip).toHaveCount(0);

    // When the child chooses Play
    await home.choosePlay();

    // Then Pick Your Kid opens
    const pick = new PickYourKidPage(page);
    await expect(pick.heading).toHaveText('Pick your kid');
    await expect(page).toHaveURL(/\/kid$/);

    // And Back returns Home
    await pick.goBack();
    await expect(home.play).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
  });
});

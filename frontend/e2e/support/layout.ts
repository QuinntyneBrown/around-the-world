import { type Page } from '@playwright/test';

/**
 * What the sweeps and the behaviour specs of journey 19 measure on a screen as the browser lays
 * it out (L2-050, L2-051; docs/adr/0039). Each reads the page as it is now and returns what is
 * off, described in words, so a failure names the control.
 */

/** The sizes of the responsive sweep (docs/detailed-designs/platform/show-every-screen-to-everyone/). */
export const SWEEP_SIZES = [
  { name: 'phone 320', width: 320, height: 568 },
  { name: 'phone 360', width: 360, height: 800 },
  { name: 'small 576', width: 576, height: 900 },
  { name: 'medium 768', width: 768, height: 1024 },
  { name: 'large 992', width: 992, height: 800 },
  { name: 'extra large 1200', width: 1200, height: 900 },
  { name: 'phone on its side', width: 844, height: 390 },
  { name: 'desktop 1920', width: 1920, height: 1080 },
] as const;

/** The controls a child can touch or reach with the keyboard, as a CSS selector. */
const CONTROLS =
  'a[href], button, input, select, textarea, [role="button"], [role="switch"], [tabindex]:not([tabindex="-1"])';

/** Whether the page scrolls sideways. */
export function scrollsSideways(page: Page): Promise<boolean> {
  return page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 0.5,
  );
}

/** Whether the page scrolls up and down. */
export function scrollsDown(page: Page): Promise<boolean> {
  return page.evaluate(
    () => document.documentElement.scrollHeight > document.documentElement.clientHeight + 0.5,
  );
}

/**
 * The layout problems of the screen as it is shown now: a control or text cut off at the edge
 * of the viewport, text cut off inside its own box, and two controls that overlap.
 */
export function layoutProblems(page: Page): Promise<string[]> {
  return page.evaluate((controls) => {
    const problems: string[] = [];
    const width = document.documentElement.clientWidth;
    const describe = (element: Element): string => {
      const name =
        element.getAttribute('aria-label') ??
        (element.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 40);
      const block = (element.getAttribute('class') ?? '').split(' ')[0];
      return `${element.tagName.toLowerCase()}${block ? '.' + block : ''} "${name}"`;
    };
    const shown = (element: Element): boolean => {
      if (element.closest('[inert], [aria-hidden="true"], .visually-hidden, .skip-link'))
        return false;
      if (!element.checkVisibility({ opacityProperty: true, visibilityProperty: true }))
        return false;
      const box = element.getBoundingClientRect();
      return box.width > 1 && box.height > 1;
    };

    const texts = [
      ...document.querySelectorAll(
        `${controls}, h1, h2, h3, p, li, label, dt, dd, [role="status"], [role="alert"]`,
      ),
    ].filter(shown);
    for (const element of texts) {
      const box = element.getBoundingClientRect();
      if (box.left < -1 || box.right > width + 1) {
        problems.push(
          `${describe(element)} is cut off at the edge (${Math.round(box.left)} to ${Math.round(box.right)} of ${width})`,
        );
      }
      // A control sticks out of the panel or card it sits in.
      if (element.matches(controls)) {
        for (let at = element.parentElement; at && at !== document.body; at = at.parentElement) {
          const look = getComputedStyle(at);
          const drawn =
            look.backgroundColor !== 'rgba(0, 0, 0, 0)' || parseFloat(look.borderTopWidth) > 0;
          if (!drawn) continue;
          const panel = at.getBoundingClientRect();
          if (box.left < panel.left - 1 || box.right > panel.right + 1) {
            problems.push(`${describe(element)} sticks out of ${describe(at)}`);
          }
          break;
        }
      }
      const style = getComputedStyle(element);
      const clips = style.overflowX !== 'visible' && style.textOverflow !== 'ellipsis';
      if (clips && element.scrollWidth > element.clientWidth + 1 && element.clientWidth > 0) {
        problems.push(`${describe(element)} has text cut off inside it`);
      }
    }

    // A message (a toast, a received sticker) is a layer over the screen: a live region placed
    // over it. Its parts are measured against each other; the specs of journeys 13 to 16 prove
    // it never covers the flash card (docs/adr/0035, docs/adr/0039). The screen's own controls
    // and text are measured together.
    const layer = (element: Element): Element | null => {
      let found: Element | null = null;
      for (let at: Element | null = element; at; at = at.parentElement) {
        const position = getComputedStyle(at).position;
        const live = at.matches('[aria-live], [role="status"], [role="alert"]');
        if (live && (position === 'fixed' || position === 'absolute')) found = at;
      }
      return found;
    };
    const touchable = [...document.querySelectorAll(controls)]
      .filter(shown)
      .filter((element) => !element.matches(':disabled, [aria-disabled="true"]'));
    const words = [...document.querySelectorAll('h1, h2, h3, p')]
      .filter(shown)
      .filter((element) => (element.textContent ?? '').trim() !== '');
    const parts = [...touchable, ...words];
    for (let one = 0; one < parts.length; one++) {
      for (let other = one + 1; other < parts.length; other++) {
        const a = parts[one];
        const b = parts[other];
        if (a.contains(b) || b.contains(a)) continue;
        // Two pieces of text may touch; a control may not touch text or another control.
        if (layer(a) !== layer(b)) continue;
        if (!touchable.includes(a) && !touchable.includes(b)) {
          const p = a.getBoundingClientRect();
          const q = b.getBoundingClientRect();
          const across = Math.min(p.right, q.right) - Math.max(p.left, q.left);
          const down = Math.min(p.bottom, q.bottom) - Math.max(p.top, q.top);
          if (across > 4 && down > 4) problems.push(`${describe(a)} overlaps ${describe(b)}`);
          continue;
        }
        const p = a.getBoundingClientRect();
        const q = b.getBoundingClientRect();
        const across = Math.min(p.right, q.right) - Math.max(p.left, q.left);
        const down = Math.min(p.bottom, q.bottom) - Math.max(p.top, q.top);
        if (across > 1 && down > 1) {
          problems.push(`${describe(a)} overlaps ${describe(b)}`);
        }
      }
    }
    return problems;
  }, CONTROLS);
}

/** Every control shown whose touch target is under 44 x 44 px (L2-051 criterion 2). */
export function smallTargets(page: Page): Promise<string[]> {
  return page.evaluate((controls) => {
    const small: string[] = [];
    for (const element of document.querySelectorAll(controls)) {
      if (element.closest('[inert], [aria-hidden="true"], .visually-hidden')) continue;
      if (!element.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
      // The skip link is off the screen until it has the focus; it is measured then.
      if (element.matches('.skip-link:not(:focus)')) continue;
      // An input drawn by its label or its boxes is measured through what draws it.
      if (element.matches('input') && getComputedStyle(element).opacity === '0') continue;
      const box = element.getBoundingClientRect();
      if (box.width < 1 || box.height < 1) continue;
      if (box.width < 43.5 || box.height < 43.5) {
        const name =
          element.getAttribute('aria-label') ??
          (element.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 40);
        const block = (element.getAttribute('class') ?? '').split(' ')[0];
        small.push(
          `${element.tagName.toLowerCase()}${block ? '.' + block : ''} "${name}" is ${Math.round(box.width)} x ${Math.round(box.height)}`,
        );
      }
    }
    return small;
  }, CONTROLS);
}

/** The focused element, by its role-ish tag and its name, and whether its focus shows. */
export interface FocusedControl {
  name: string;
  /** The focus ring's width in px, or 0 when the focus shows no outline. */
  ring: number;
  /** Whether the whole of the control is inside the viewport. */
  inView: boolean;
}

/** What has the focus now, and how its focus ring is drawn (L2-051 criterion 1). */
export function focused(page: Page): Promise<FocusedControl | null> {
  return page.evaluate(async () => {
    let element = document.activeElement;
    while (element?.shadowRoot?.activeElement) element = element.shadowRoot.activeElement;
    if (!element || element === document.body) return null;
    // A control may slide into view as it takes the focus (the skip link): measure where it rests.
    await Promise.all(element.getAnimations().map((animation) => animation.finished));
    const style = getComputedStyle(element);
    const box = element.getBoundingClientRect();
    const name =
      element.getAttribute('aria-label') ??
      (element.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 60);
    const ring = style.outlineStyle === 'none' ? 0 : parseFloat(style.outlineWidth);
    return {
      name: name || element.tagName.toLowerCase(),
      ring,
      inView:
        box.top >= -1 &&
        box.left >= -1 &&
        box.bottom <= innerHeight + 1 &&
        box.right <= innerWidth + 1,
    };
  });
}

/** What pressing Tab through a screen found (L2-051 criterion 1). */
export interface TabWalk {
  /** How many controls the screen shows that Tab should reach. */
  controls: number;
  /** The place, among the controls in the order the page holds them, of each control Tab reached. */
  order: number[];
  /** Each control reached whose focus showed no ring, or that was not wholly in view. */
  hidden: string[];
}

/**
 * Presses Tab once for each control the screen shows (within an open dialog, the dialog's), and
 * records where the focus went: the order must be the page's own, every control reached, and the
 * focus ring drawn on each, in view.
 */
export async function walkWithTab(page: Page): Promise<TabWalk> {
  const shownControls = () =>
    page.evaluate((controls) => {
      const dialog = document.querySelector('[role="dialog"][aria-modal="true"]');
      const scope = dialog ?? document;
      return [...scope.querySelectorAll(controls)]
        .filter(
          (element) =>
            !element.closest('[inert], [aria-hidden="true"]') &&
            !element.matches(':disabled') &&
            (element.matches('.skip-link') ||
              element.checkVisibility({ visibilityProperty: true })),
        )
        .map((element, index) => {
          element.setAttribute('data-tab-walk', String(index));
          return index;
        }).length;
    }, CONTROLS);
  const controls = await shownControls();
  const order: number[] = [];
  const hidden: string[] = [];
  // One press more than the controls, so the walk comes round to where it started.
  for (let press = 0; press <= controls; press++) {
    await page.keyboard.press('Tab');
    const at = await page.evaluate(() => document.activeElement?.getAttribute('data-tab-walk'));
    order.push(at === null || at === undefined ? -1 : Number(at));
    const control = await focused(page);
    if (control && (control.ring < 2 || !control.inView)) {
      hidden.push(
        `${control.name}: ring ${control.ring}px${control.inView ? '' : ', out of view'}`,
      );
    }
  }
  return { controls, order, hidden };
}

/**
 * The steps of a Tab walk that broke the page's order: each step from one control to another
 * that is not the next (or, from the last, the first). Leaving the page between the last control
 * and the first is not a step. Empty when every control was reached in the page's order.
 */
export function stepsOutOfOrder(walk: TabWalk): string[] {
  const reached = walk.order.filter((at) => at >= 0);
  const wrong: string[] = [];
  for (let step = 1; step < reached.length; step++) {
    const [from, to] = [reached[step - 1], reached[step]];
    if (to !== (from + 1) % walk.controls) wrong.push(`${from} -> ${to}`);
  }
  if (new Set(reached).size !== walk.controls) {
    wrong.push(`reached ${new Set(reached).size} of ${walk.controls} controls`);
  }
  return wrong;
}

/**
 * Lays the page out at a size and waits until it rests: a frame for the width-driven layout,
 * then every entrance that plays once (a sheet sliding up, a card flipping in, a podium step
 * rising), so what is measured or photographed is where it stays.
 */
export async function restAt(page: Page, size: { width: number; height: number }): Promise<void> {
  await page.setViewportSize({ width: size.width, height: size.height });
  await page.evaluate(async () => {
    await new Promise((done) => requestAnimationFrame(() => done(null)));
    await Promise.all(
      document
        .getAnimations()
        .filter((animation) => animation.effect?.getTiming().iterations !== Infinity)
        .map((animation) => animation.finished.catch(() => null)),
    );
  });
}

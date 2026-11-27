import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SkipLink } from './skip-link';

@Component({
  imports: [SkipLink],
  template: `<atw-skip-link target="main">Skip to the game</atw-skip-link>
    <main id="main"><button type="button">Play</button></main>`,
})
class Host {}

describe('SkipLink', () => {
  it('links to its target and shows the words it is given', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();

    const link = (fixture.nativeElement as HTMLElement).querySelector('a.skip-link');
    expect(link?.getAttribute('href')).toBe('#main');
    expect(link?.textContent?.trim()).toBe('Skip to the game');
  });

  it('moves the focus to its target without following the link', async () => {
    const fixture = TestBed.createComponent(Host);
    document.body.appendChild(fixture.nativeElement);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const link = element.querySelector<HTMLAnchorElement>('a.skip-link')!;
    const main = element.querySelector<HTMLElement>('#main')!;

    const followed = link.dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true }),
    );

    expect(followed).toBe(false);
    expect(document.activeElement).toBe(main);
    expect(main.getAttribute('tabindex')).toBe('-1');
    fixture.nativeElement.remove();
  });
});

import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SkipLink } from './skip-link';

@Component({
  imports: [SkipLink],
  template: `<atw-skip-link target="main">Skip to the game</atw-skip-link>`,
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
});

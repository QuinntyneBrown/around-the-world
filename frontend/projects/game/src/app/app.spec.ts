import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';

describe('App', () => {
  it('starts with the skip link to the screen', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    const link = (fixture.nativeElement as HTMLElement).querySelector('atw-skip-link a');
    expect(link?.textContent?.trim()).toBe('Skip to the game');
    expect(link?.getAttribute('href')).toBe('#main');
  });
});

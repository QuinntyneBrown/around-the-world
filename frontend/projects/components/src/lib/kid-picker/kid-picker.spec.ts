import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { type Kid, type KidId } from '@atw/api';
import { type PortraitState } from '../portrait/portrait';
import { KidPicker } from './kid-picker';

const KIDS: Kid[] = (['zuri', 'kenji', 'nia', 'milo', 'pip'] as const).map((id) => ({
  id,
  name: id[0].toUpperCase() + id.slice(1),
  tagline: '',
  description: '',
  picture: `img/kid-${id}.jpg`,
}));

@Component({
  imports: [KidPicker],
  template: `<atw-kid-picker
    [kids]="kids"
    [selected]="selected()"
    [pictures]="pictures()"
    [loading]="loading()"
    (picked)="picked.push($event)"
  />`,
})
class Host {
  readonly kids = KIDS;
  readonly selected = signal<KidId>('zuri');
  readonly pictures = signal<PortraitState>('loaded');
  readonly loading = signal(false);
  readonly picked: KidId[] = [];
}

async function render() {
  const fixture = TestBed.createComponent(Host);
  await fixture.whenStable();
  return { fixture, element: fixture.nativeElement as HTMLElement };
}

describe('KidPicker', () => {
  it('offers the kids as toggle buttons in a labelled group, with exactly one pressed', async () => {
    const { fixture, element } = await render();
    const group = element.querySelector('[role="group"]');
    expect(group?.getAttribute('aria-label')).toBe('Choose a kid');
    const options = [...element.querySelectorAll('button.kid-picker__option')];
    expect(options.map((option) => option.textContent?.trim())).toEqual([
      'Zuri',
      'Kenji',
      'Nia',
      'Milo',
      'Pip',
    ]);
    expect(options.map((option) => option.getAttribute('aria-pressed'))).toEqual([
      'true',
      'false',
      'false',
      'false',
      'false',
    ]);

    fixture.componentInstance.selected.set('milo');
    await fixture.whenStable();
    expect(element.querySelector('[aria-pressed="true"]')?.getAttribute('data-kid')).toBe('milo');
  });

  it('emits the kid the child chose', async () => {
    const { fixture, element } = await render();
    element.querySelector<HTMLButtonElement>('[data-kid="pip"]')?.click();
    expect(fixture.componentInstance.picked).toEqual(['pip']);
  });

  it.each([
    ['loaded', 5, 0],
    ['failed', 0, 5],
  ] as const)(
    'with pictures %s shows %i pictures and %i drawn kids',
    async (state, pictures, drawn) => {
      const { fixture, element } = await render();
      fixture.componentInstance.pictures.set(state);
      await fixture.whenStable();
      expect(element.querySelectorAll('img.portrait')).toHaveLength(pictures);
      expect(element.querySelectorAll('.portrait .bean-icon')).toHaveLength(drawn);
    },
  );

  it('shows a hidden skeleton roster, with no buttons, while loading', async () => {
    const { fixture, element } = await render();
    fixture.componentInstance.loading.set(true);
    await fixture.whenStable();
    expect(element.querySelector('.kid-picker')?.getAttribute('aria-hidden')).toBe('true');
    expect(element.querySelectorAll('button')).toHaveLength(0);
    expect(element.querySelectorAll('.skeleton.portrait')).toHaveLength(5);
  });
});

import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Nickname } from './nickname';

@Component({
  imports: [Nickname],
  template: `<atw-nickname
    [value]="value()"
    [loading]="loading()"
    (newName)="rolls = rolls + 1"
  />`,
})
class Host {
  readonly value = signal('Speedy Otter');
  readonly loading = signal(false);
  rolls = 0;
}

describe('Nickname', () => {
  it('shows the nickname as text, labelled, with "New name" and no field', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.value.set('<b>Turbo Yak</b>');
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;

    const value = element.querySelector('.nickname__value');
    expect(value?.textContent?.trim()).toBe('<b>Turbo Yak</b>');
    expect(value?.querySelector('b')).toBeNull();
    expect(value?.getAttribute('aria-live')).toBe('polite');
    const [label, words] = (value?.getAttribute('aria-labelledby') ?? '').split(' ');
    expect(element.querySelector(`#${label}`)?.textContent).toBe('Your game name');
    expect(element.querySelector(`#${words}`)).not.toBeNull();
    expect(element.querySelectorAll('input, textarea, [contenteditable]')).toHaveLength(0);

    const button = element.querySelector<HTMLButtonElement>('button[aria-label="New name"]');
    button?.click();
    expect(fixture.componentInstance.rolls).toBe(1);
  });

  it('shows a skeleton and no button while loading', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.loading.set(true);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.nickname .skeleton')).not.toBeNull();
    expect(element.querySelector('button')).toBeNull();
  });
});

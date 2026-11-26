import { DialogRef } from '@angular/cdk/dialog';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { GAME_SESSION, type GameSession } from '@atw/api';
import { LeaveGameDialog } from './leave-game-dialog';

/**
 * The leave-game dialog (docs/mocks/dialogs/leave-game/) asks before a player leaves a game
 * with friends. That game arrives with journey 14, so no behaviour spec can reach the dialog
 * yet: these tests prove its two states, `default` and `busy` (L2-033 criterion 4, ADR 0027).
 */
describe('LeaveGameDialog', () => {
  function opened() {
    let told: () => void = () => undefined;
    const leave = vi.fn(() => new Promise<void>((resolve) => (told = resolve)));
    const session = { kind: 'friends', paused: signal(false), leave } as unknown as GameSession;
    const ref = { close: vi.fn(), disableClose: false };
    const navigateByUrl = vi.fn(() => Promise.resolve(true));
    TestBed.configureTestingModule({
      providers: [
        { provide: GAME_SESSION, useValue: session },
        { provide: DialogRef, useValue: ref },
        { provide: Router, useValue: { navigateByUrl } },
      ],
    });
    const fixture = TestBed.createComponent(LeaveGameDialog);
    const element = fixture.nativeElement as HTMLElement;
    const buttons = () =>
      [...element.querySelectorAll<HTMLButtonElement>('.dialog__footer button')].map((button) => ({
        text: button.textContent?.trim(),
        disabled: button.disabled,
        busy: button.getAttribute('aria-busy'),
      }));
    const close = () =>
      element.querySelector<HTMLButtonElement>('.dialog__header button') ?? undefined;
    return { fixture, element, buttons, close, leave, ref, navigateByUrl, told: () => told() };
  }

  it('asks first, with “Stay and play” and “Leave”, the close button staying', async () => {
    const { fixture, element, buttons, close, ref } = opened();
    await fixture.whenStable();

    expect(element.querySelector('.dialog__title')?.textContent).toBe('Leave the game?');
    expect(element.querySelector('.dialog__body p')?.textContent?.trim()).toBe(
      'The race carries on without you, and you can’t come back to this one.',
    );
    expect(buttons()).toEqual([
      { text: 'Stay and play', disabled: false, busy: null },
      { text: 'Leave', disabled: false, busy: null },
    ]);
    expect(close()?.getAttribute('aria-label')).toBe('Stay and play');

    close()?.click();
    expect(ref.close).toHaveBeenCalledWith();
  });

  it('is busy while the room is told, then closes and opens Home', async () => {
    const { fixture, element, buttons, close, leave, ref, navigateByUrl, told } = opened();
    await fixture.whenStable();

    element.querySelectorAll<HTMLButtonElement>('.dialog__footer button')[1].click();
    await fixture.whenStable();

    expect(leave).toHaveBeenCalledTimes(1);
    expect(buttons()).toEqual([
      { text: 'Stay and play', disabled: true, busy: null },
      { text: 'Leaving…', disabled: false, busy: 'true' },
    ]);
    expect(element.querySelector('.dialog__footer .spinner')).not.toBeNull();
    expect(close()).toBeUndefined();
    expect(ref.disableClose).toBe(true);
    expect(ref.close).not.toHaveBeenCalled();

    told();
    await fixture.whenStable();
    await Promise.resolve();

    expect(ref.close).toHaveBeenCalledWith('left');
    expect(navigateByUrl).toHaveBeenCalledWith('/');
  });
});

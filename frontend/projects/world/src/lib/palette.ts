import { type KidId } from '@atw/api';

/**
 * The design tokens each named material of the scenes is coloured from (docs/adr/0028), read
 * by role, so a colour lives in one place: the kids' colours and the room's picture colours that
 * World Map's drawn room uses too. A material whose token is not set keeps the scene's colour.
 */
const ROOM_TOKENS: Readonly<Record<string, string>> = {
  floor: '--palette-art-floor',
  'floor-edge': '--palette-art-edge-1',
  'desk-top': '--palette-art-desk-top',
  'desk-side': '--palette-art-desk-side',
  'desk-leg': '--palette-art-desk-leg',
  hair: '--palette-art-hair',
  visor: '--palette-art-visor',
  metal: '--palette-art-metal',
  'metal-light': '--palette-art-metal-light',
  pencil: '--palette-art-pencil',
  eraser: '--palette-art-eraser',
  outline: '--palette-art-outline',
  shadow: '--palette-art-outline',
  white: '--palette-white',
  path: '--palette-white',
};

/** The lit desk top, for the desk the traveller is at and the next stop. */
const LIT_DESK_TOP = '--palette-white';

/** Reads the tokens from the element the classroom is drawn on. */
export class Palette {
  constructor(private readonly read: (token: string) => string) {}

  static of(element: Element): Palette {
    const style = getComputedStyle(element);
    return new Palette((token) => style.getPropertyValue(token).trim());
  }

  /** The colour of a named material of the room or the cast, or '' to keep the scene's. */
  material(name: string): string {
    const token = ROOM_TOKENS[name];
    return token ? this.read(token) : '';
  }

  litDeskTop(): string {
    return this.read(LIT_DESK_TOP);
  }

  /** A kid's bright colour and its deeper shade; a classmate's calmer colour for both. */
  kid(kid: KidId | 'classmate'): { body: string; deep: string } {
    if (kid === 'classmate') {
      const calm = this.read('--color-classmate');
      return { body: calm, deep: calm };
    }
    return { body: this.read(`--color-kid-${kid}`), deep: this.read(`--color-kid-${kid}-deep`) };
  }

  /** The background the element asks for: its own `background-color`. */
  background(): string {
    return this.read('background-color');
  }
}

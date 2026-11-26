import { RoomLayout, type RoomKid, type RoomPlan } from './room-layout';

const TWELVE = [
  'France',
  'Egypt',
  'Japan',
  'UK',
  'Italy',
  'USA',
  'Brazil',
  'India',
  'Kenya',
  'China',
  'Australia',
  'Peru',
];

function plan(change: Partial<RoomPlan> = {}): RoomPlan {
  const kids: RoomKid[] = [
    { kid: 'zuri', desk: 5, travelling: true, you: true, name: 'You' },
    { kid: 'nia', desk: 5, travelling: false, you: false, name: 'Nia' },
    { kid: 'classmate', desk: 7, travelling: false, you: false, name: 'Classmate' },
  ];
  return { countries: TWELVE, kids, travellerDesk: 5, nextDesk: 6, ...change };
}

describe('RoomLayout', () => {
  it('stands desk 1 at the front and the desks clockwise from there, as the mocks draw them', () => {
    const { drawn } = RoomLayout.layout(plan());
    const desk = (n: number) => drawn.find((item) => item.type === 'desk' && item.desk === n);
    expect(desk(1)).toMatchObject({ x: 600, y: 612 });
    expect(desk(2)).toMatchObject({ x: 390, y: 584 });
    expect(desk(5)).toMatchObject({ x: 236, y: 297, lit: true });
    expect(desk(6)).toMatchObject({ x: 390, y: 220, lit: true });
    expect(desk(7)).toMatchObject({ x: 600, y: 192, lit: false });
  });

  it('seats a kid behind their desk and stands the traveller on the path in front', () => {
    const { drawn } = RoomLayout.layout(plan());
    const kid = (name: string) => drawn.find((item) => item.type === 'kid' && item.kid === name);
    expect(kid('zuri')).toMatchObject({ x: 236, y: 335, flip: false });
    expect(kid('nia')).toMatchObject({ x: 236, y: 279, flip: false });
  });

  it('faces a kid on the right half of the room to the left', () => {
    const kids: RoomKid[] = [{ kid: 'milo', desk: 8, travelling: false, you: false, name: 'Milo' }];
    const { drawn } = RoomLayout.layout(plan({ kids }));
    expect(drawn.find((item) => item.type === 'kid')).toMatchObject({ x: 810, y: 202, flip: true });
  });

  it('draws back to front, a seated kid before their desk', () => {
    const { drawn } = RoomLayout.layout(plan());
    const ys = drawn.map((item) => item.y);
    expect(ys).toEqual([...ys].sort((one, other) => one - other));
    const nia = drawn.findIndex((item) => item.type === 'kid' && item.kid === 'nia');
    const desk5 = drawn.findIndex((item) => item.type === 'desk' && item.desk === 5);
    expect(nia).toBeLessThan(desk5);
  });

  it('labels only the first desk, here, the next stop and your own desk in a longer tour (L2-034 8)', () => {
    const kids: RoomKid[] = [
      { kid: 'zuri', desk: 9, travelling: false, you: true, name: 'You' },
      { kid: 'kenji', desk: 5, travelling: true, you: false, name: 'Kenji' },
    ];
    const { plaques } = RoomLayout.layout(plan({ kids }));
    expect(plaques.map(({ country, look }) => [country, look])).toEqual([
      ['France', 'start'],
      ['Italy', 'plain'],
      ['USA', 'next'],
      ['Kenya', 'plain'],
    ]);
    expect(plaques[0]).toMatchObject({ x: 600, y: 676, width: 79 });
  });

  it('labels every desk in a tour of 6 (L2-034 8)', () => {
    const { plaques } = RoomLayout.layout(
      plan({ countries: TWELVE.slice(0, 6), travellerDesk: 3, nextDesk: 4, kids: [] }),
    );
    expect(plaques.map(({ country }) => country)).toEqual(TWELVE.slice(0, 6));
  });

  it('tags the five kids and you, never a further classmate, yours drawn last', () => {
    const { tags } = RoomLayout.layout(plan());
    expect(tags.map(({ name, x, y }) => [name, x, y])).toEqual([
      ['Nia', 236, 193],
      ['You', 236, 239],
    ]);
  });

  it('zooms the phone’s view to the child’s own kid (L2-034 5)', () => {
    expect(RoomLayout.layout(plan()).zoom).toBe('16 -45 440 620');
    const seated: RoomKid[] = [{ kid: 'zuri', desk: 5, travelling: false, you: true, name: 'You' }];
    expect(RoomLayout.layout(plan({ kids: seated })).zoom).toBe('16 -101 440 620');
  });
});

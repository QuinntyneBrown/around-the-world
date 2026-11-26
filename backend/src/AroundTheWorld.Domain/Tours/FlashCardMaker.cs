using AroundTheWorld.Domain.Rooms;

namespace AroundTheWorld.Domain.Tours;

/// <summary>
/// Makes each flash card of a game with friends from the room's maths, with the device's ranges
/// (L2-008, docs/adr/0018-flash-card-ranges.md), never the same card twice running.
/// </summary>
public static class FlashCardMaker
{
    private const int Redraws = 10;

    private static readonly int[] Divisors = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

    /// <summary>The next card: of a chosen kind, and not the same as the last one.</summary>
    public static Card Next(IReadOnlyList<MathsKind> kinds, IReadOnlyList<int> tables, Card? last, IRandomSource random)
    {
        var card = Draw(kinds, tables, random);
        for (var tries = 0; tries < Redraws && last is not null && card.IsSameAs(last); tries++)
        {
            card = Draw(kinds, tables, random);
        }

        return last is not null && card.IsSameAs(last) ? MoveOn(card, tables) : card;
    }

    private static Card Draw(IReadOnlyList<MathsKind> kinds, IReadOnlyList<int> tables, IRandomSource random)
    {
        var kind = kinds[random.Below(kinds.Count)];
        switch (kind)
        {
            case MathsKind.Times:
                var table = tables[random.Below(tables.Count)];
                var other = Within(1, 12, random);
                return random.Below(2) == 0 ? new Card(kind, table, other) : new Card(kind, other, table);
            case MathsKind.Plus:
                return new Card(kind, Within(2, 50, random), Within(2, 50, random));
            case MathsKind.Minus:
                var left = Within(10, 99, random);
                return new Card(kind, left, Within(1, left, random));
            default:
                IReadOnlyList<int> divisors = kinds.Contains(MathsKind.Times) ? tables : Divisors;
                var divisor = divisors[random.Below(divisors.Count)];
                return new Card(kind, divisor * Within(1, 12, random), divisor);
        }
    }

    private static Card MoveOn(Card card, IReadOnlyList<int> tables) => card.Kind switch
    {
        MathsKind.Times => card.Left == card.Right || tables.Contains(card.Left)
            ? card with { Right = (card.Right % 12) + 1 }
            : card with { Left = (card.Left % 12) + 1 },
        MathsKind.Plus => card with { Right = card.Right >= 50 ? 2 : card.Right + 1 },
        MathsKind.Minus => card with { Right = card.Right >= card.Left ? 1 : card.Right + 1 },
        _ => card with { Left = card.Right * ((card.Left / card.Right % 12) + 1) },
    };

    private static int Within(int min, int max, IRandomSource random) => min + random.Below(max - min + 1);
}

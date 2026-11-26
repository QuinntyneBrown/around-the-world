using AroundTheWorld.Domain.Rooms;

namespace AroundTheWorld.Domain.Tours;

/// <summary>
/// One flash card: a kind of maths and two whole numbers, as in <c>6 × 4</c> (L2-008). Its answer
/// stays on the server until the duel over it is decided (L2-026 criterion 5).
/// </summary>
public sealed record Card(MathsKind Kind, int Left, int Right)
{
    /// <summary>The card's answer: a whole number from 0 to 999.</summary>
    public int Answer() => Kind switch
    {
        MathsKind.Times => Left * Right,
        MathsKind.Plus => Left + Right,
        MathsKind.Minus => Left - Right,
        _ => Left / Right,
    };

    /// <summary>Whether two cards are the same card: <c>4 × 6</c> is <c>6 × 4</c> (docs/adr/0018).</summary>
    public bool IsSameAs(Card other)
    {
        if (Kind != other.Kind)
        {
            return false;
        }

        if (Left == other.Left && Right == other.Right)
        {
            return true;
        }

        var turns = Kind is MathsKind.Times or MathsKind.Plus;
        return turns && Left == other.Right && Right == other.Left;
    }
}

/// <summary>A source of random whole numbers; a test gives a fixed one.</summary>
public interface IRandomSource
{
    /// <summary>A whole number from 0 up to, but not including, the limit.</summary>
    int Below(int limit);
}

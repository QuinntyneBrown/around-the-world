namespace AroundTheWorld.Domain.Rooms;

/// <summary>A kind of maths a flash card can be (L2-016), in the order Game Setup offers them.</summary>
public enum MathsKind
{
    Times,
    Plus,
    Minus,
    Divide,
}

/// <summary>How long a flash card stays up (L2-017).</summary>
public enum CardSpeed
{
    Chill,
    Normal,
    Lightning,
}

/// <summary>
/// The choices that shape a room's game: the kinds of maths, the times tables, the tour length
/// and the card speed (docs/detailed-designs/player/set-up-game/). How answers are given is
/// not part of it: each player chooses on their own device.
/// </summary>
public sealed class GameSetup
{
    private GameSetup()
    {
    }

    public List<MathsKind> Kinds { get; private set; } = [];

    public List<int> Tables { get; private set; } = [];

    public int TourLength { get; private set; }

    public CardSpeed CardSpeed { get; private set; }

    /// <summary>Times on, tables 2 to 10, a tour of 12 desks and Normal (L2-016 1, L2-017 1).</summary>
    public static GameSetup Default() => new()
    {
        Kinds = [MathsKind.Times],
        Tables = [2, 3, 4, 5, 6, 7, 8, 9, 10],
        TourLength = 12,
        CardSpeed = CardSpeed.Normal,
    };
}

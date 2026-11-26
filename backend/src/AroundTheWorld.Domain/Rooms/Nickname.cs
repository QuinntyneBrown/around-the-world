namespace AroundTheWorld.Domain.Rooms;

/// <summary>
/// A nickname as the indexes of its adjective and its animal in the two fixed lists of ten
/// (L2-014). The backend never holds a nickname as words (L2-046 criterion 1).
/// </summary>
public sealed record Nickname(int Adjective, int Animal)
{
    /// <summary>How many words each list holds.</summary>
    public const int ListLength = 10;

    /// <summary>Whether an index points into a list.</summary>
    public static bool IsIndex(int index) => index is >= 0 and < ListLength;
}

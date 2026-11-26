namespace AroundTheWorld.Domain.Rooms;

/// <summary>The 4 capital letters from A to Z that name one room and are read aloud (L2-022).</summary>
public sealed record RoomCode
{
    /// <summary>How many letters a code has.</summary>
    public const int Length = 4;

    private RoomCode(string value) => Value = value;

    public string Value { get; }

    /// <summary>Whether the text is exactly 4 capital letters from A to Z.</summary>
    public static bool IsValid(string? text) =>
        text is { Length: Length } && text.All(letter => letter is >= 'A' and <= 'Z');

    /// <summary>The code the text spells; throws when it is not 4 capital letters from A to Z.</summary>
    public static RoomCode From(string text) =>
        IsValid(text) ? new RoomCode(text) : throw new ArgumentException("A room code is 4 capital letters from A to Z.", nameof(text));

    public override string ToString() => Value;
}

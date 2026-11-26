namespace AroundTheWorld.Domain.Rooms;

/// <summary>A rule of a room that refuses what was asked of it.</summary>
public enum RoomRule
{
    /// <summary>The room already holds 8 players (L2-023 criterion 5).</summary>
    Full,

    /// <summary>The room's game has started, or is over (L2-023 criterion 6).</summary>
    GameStarted,

    /// <summary>Only the host may do this (L2-025 criterion 4).</summary>
    NotHost,

    /// <summary>A game needs at least two players (L2-025 criterion 1).</summary>
    NotEnoughPlayers,

    /// <summary>The player is not in this room.</summary>
    NotInRoom,
}

/// <summary>A room refused what was asked of it, by one of its rules; nothing changed.</summary>
public sealed class RoomRuleException(RoomRule rule) : Exception($"The room refused: {rule}.")
{
    public RoomRule Rule { get; } = rule;
}

namespace AroundTheWorld.Domain.Rooms;

/// <summary>Whether a room's players are waiting in the Lobby or playing.</summary>
public enum RoomStatus
{
    Waiting,
    Playing,
}

/// <summary>
/// A group of up to 8 players who play one game together (L1-007). It holds a code, the setup,
/// its players and the time of its last activity, and nothing about a child (L2-046).
/// </summary>
public sealed class Room
{
    /// <summary>How many players a room holds at most (L2-023 criterion 5).</summary>
    public const int Capacity = 8;

    /// <summary>A room nobody has done anything in for this long is deleted (L2-027 criterion 4, to confirm).</summary>
    public static readonly TimeSpan IdleLimit = TimeSpan.FromMinutes(10);

    private readonly List<RoomPlayer> _players = [];

    private Room()
    {
    }

    public Guid Id { get; private set; }

    public RoomCode Code { get; private set; } = null!;

    public RoomStatus Status { get; private set; }

    public GameSetup Setup { get; private set; } = null!;

    public DateTimeOffset LastActivityAt { get; private set; }

    public IReadOnlyList<RoomPlayer> Players => _players;

    /// <summary>
    /// A new room with the default setup, waiting, whose first player is its host at position 0
    /// with a new connection token (L2-022 criterion 1, L2-043 criterion 1).
    /// </summary>
    public static Room Make(RoomCode code, KidId kid, Nickname nickname, DateTimeOffset now)
    {
        var room = new Room
        {
            Id = Guid.NewGuid(),
            Code = code,
            Status = RoomStatus.Waiting,
            Setup = GameSetup.Default(),
            LastActivityAt = now,
        };
        room._players.Add(new RoomPlayer(kid, nickname, position: 0, isHost: true, ConnectionToken.New(), now));
        return room;
    }

    /// <summary>Whether nobody has done anything in the room for the idle limit, at that time.</summary>
    public bool IsIdleAt(DateTimeOffset now) => now - LastActivityAt >= IdleLimit;
}

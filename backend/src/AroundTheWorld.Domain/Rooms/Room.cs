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
    /// Changes with every change to the room's players, so the store refuses the second of two
    /// changes made from the same state, such as two joins that reach a room of 7 at once
    /// (docs/adr/0032-joining-a-room-and-the-lobby.md).
    /// </summary>
    public Guid Version { get; private set; }

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
            Version = Guid.NewGuid(),
        };
        room._players.Add(new RoomPlayer(kid, nickname, position: 0, isHost: true, ConnectionToken.New(), now));
        return room;
    }

    /// <summary>
    /// Adds a player with a new connection token, at the place after the last (L2-023 criterion
    /// 3, L2-043 criterion 1). Two players may hold the same kid (L2-024 criterion 3). A room
    /// that is not waiting refuses with <see cref="RoomRule.GameStarted"/>, and a room of 8 with
    /// <see cref="RoomRule.Full"/>.
    /// </summary>
    public RoomPlayer Join(KidId kid, Nickname nickname, DateTimeOffset now)
    {
        if (Status != RoomStatus.Waiting)
        {
            throw new RoomRuleException(RoomRule.GameStarted);
        }

        if (_players.Count >= Capacity)
        {
            throw new RoomRuleException(RoomRule.Full);
        }

        var position = _players.Count == 0 ? 0 : _players.Max(player => player.Position) + 1;
        var player = new RoomPlayer(kid, nickname, position, isHost: false, ConnectionToken.New(), now);
        _players.Add(player);
        Touch(now);
        return player;
    }

    /// <summary>
    /// Removes the player. When they were the host, the player who joined earliest of those left
    /// becomes the host (L2-025 criterion 5). Answers whether the room is now empty, so that it
    /// is deleted.
    /// </summary>
    public bool Leave(RoomPlayer player, DateTimeOffset now)
    {
        if (!_players.Remove(player))
        {
            throw new RoomRuleException(RoomRule.NotInRoom);
        }

        if (player.IsHost && _players.Count > 0)
        {
            _players.MinBy(other => other.JoinedAt)!.BecomeHost();
        }

        Touch(now);
        return _players.Count == 0;
    }

    /// <summary>
    /// Replaces the room's setup (L2-018 criterion 2). Only the host may, and only while the room
    /// waits (L2-025 criterion 4); a refusal leaves the setup as it was.
    /// </summary>
    public void SaveSetup(RoomPlayer by, GameSetup setup, DateTimeOffset now)
    {
        if (!by.IsHost)
        {
            throw new RoomRuleException(RoomRule.NotHost);
        }

        if (Status != RoomStatus.Waiting)
        {
            throw new RoomRuleException(RoomRule.GameStarted);
        }

        Setup = setup;
        Touch(now);
    }

    /// <summary>
    /// The host starts the game once at least two players are in the room (L2-025 criteria 1,
    /// 2 and 4). Journey 14 makes the tour; until then the room is only marked playing.
    /// </summary>
    public void Start(RoomPlayer by, DateTimeOffset now)
    {
        if (!by.IsHost)
        {
            throw new RoomRuleException(RoomRule.NotHost);
        }

        if (_players.Count < 2)
        {
            throw new RoomRuleException(RoomRule.NotEnoughPlayers);
        }

        Status = RoomStatus.Playing;
        Touch(now);
    }

    private void Touch(DateTimeOffset now)
    {
        LastActivityAt = now;
        Version = Guid.NewGuid();
    }

    /// <summary>Whether nobody has done anything in the room for the idle limit, at that time.</summary>
    public bool IsIdleAt(DateTimeOffset now) => now - LastActivityAt >= IdleLimit;
}

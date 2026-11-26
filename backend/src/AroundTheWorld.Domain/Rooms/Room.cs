using AroundTheWorld.Domain.Tours;

namespace AroundTheWorld.Domain.Rooms;

/// <summary>Whether a room's players are waiting in the Lobby, playing, or on the Podium.</summary>
public enum RoomStatus
{
    Waiting,
    Playing,
    Over,
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

    /// <summary>A player whose connection is lost keeps their spot this long (L2-029, L2-043 criterion 4).</summary>
    public static readonly TimeSpan SpotHeldFor = TimeSpan.FromSeconds(30);

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

    /// <summary>The game being played, or the one just over while the Podium is shown; null while waiting.</summary>
    public RoomGame? Game { get; private set; }

    /// <summary>When the game next needs the server's clock, so the room's timers find it (docs/adr/0033).</summary>
    public DateTimeOffset? GameDueAt { get; private set; }

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

        // During a game a classmate takes the player's place, and the race carries on (ADR 0033).
        if (Status == RoomStatus.Playing)
        {
            Game?.Leave(player.Id, now);
            GameDueAt = Game?.DueAt;
        }

        if (player.IsHost && _players.Count > 0)
        {
            EarliestJoiner().BecomeHost();
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
    /// 2 and 4): the host travels from desk 1 and the others hold the next desks in the order they
    /// joined (L2-007 criterion 8, docs/adr/0033).
    /// </summary>
    public void Start(RoomPlayer by, DateTimeOffset now)
    {
        if (Status != RoomStatus.Waiting)
        {
            throw new RoomRuleException(RoomRule.GameStarted);
        }

        if (!by.IsHost)
        {
            throw new RoomRuleException(RoomRule.NotHost);
        }

        if (_players.Count < 2)
        {
            throw new RoomRuleException(RoomRule.NotEnoughPlayers);
        }

        Status = RoomStatus.Playing;
        var order = _players.OrderByDescending(player => player.IsHost).ThenBy(player => player.Position).ToList();
        Game = RoomGame.Start(Setup, order, now);
        GameDueAt = Game.DueAt;
        Touch(now);
    }

    /// <summary>
    /// A player's answer, as a number, at the time it arrived; the game decides it (L2-026). A room
    /// that is not playing refuses with <see cref="RoomRule.NotPlaying"/>.
    /// </summary>
    public AnswerResult Answer(RoomPlayer by, int value, DateTimeOffset at, IRandomSource random)
    {
        if (Status != RoomStatus.Playing || Game is null)
        {
            throw new RoomRuleException(RoomRule.NotPlaying);
        }

        var result = Game.Answer(by.Id.ToString(), value, at, random);
        Settle();
        Touch(at);
        return result;
    }

    /// <summary>
    /// Whether the player may send a sticker: only while the room's game is played, and only when
    /// the current duel does not hold them (L2-028 criterion 4, docs/adr/0035). A sticker changes
    /// nothing in the room and is not activity.
    /// </summary>
    public bool MaySendSticker(RoomPlayer player) =>
        Status == RoomStatus.Playing
        && Game is { Phase: not GamePhase.Over }
        && Game.Duel?.Holds(player.Id.ToString()) != true;

    /// <summary>
    /// Runs what the game's clock has made due by now: a card, a classmate's answer, a card's time
    /// running out (docs/adr/0033). Time passing is not activity. Answers whether anything changed.
    /// </summary>
    public bool AdvanceGame(DateTimeOffset now, IRandomSource random)
    {
        if (Status != RoomStatus.Playing || Game is null || !Game.Advance(now, random))
        {
            return false;
        }

        Settle();
        Version = Guid.NewGuid();
        return true;
    }

    /// <summary>
    /// "Play again" from the Podium: the room returns to its Lobby with the same players, host and
    /// setup (L2-035 criterion 3, docs/adr/0033). Answers whether it changed: the first player's
    /// choice returns it, and any later one finds it waiting already.
    /// </summary>
    public bool PlayAgain(DateTimeOffset now)
    {
        if (Status == RoomStatus.Waiting)
        {
            return false;
        }

        if (Status != RoomStatus.Over)
        {
            throw new RoomRuleException(RoomRule.NotOver);
        }

        (Status, Game, GameDueAt) = (RoomStatus.Waiting, null, null);
        Touch(now);
        return true;
    }

    /// <summary>
    /// The player's token was presented on a new connection: it is bound to the same player, whose
    /// spot (desk, role and distance) is as it was, and the player is no longer away (L2-029
    /// criterion 2, L2-043 criterion 4, docs/adr/0036).
    /// </summary>
    public void Return(RoomPlayer player, string connectionId)
    {
        player.Bind(connectionId);
        Version = Guid.NewGuid();
    }

    /// <summary>
    /// A connection was lost: the player is away from now, when it was their current connection.
    /// The game does not wait for them (L2-029 criterion 3). Answers whether they are now away.
    /// </summary>
    public bool MarkAway(RoomPlayer player, string connectionId, DateTimeOffset now)
    {
        if (!player.MarkAway(connectionId, now))
        {
            return false;
        }

        Version = Guid.NewGuid();
        return true;
    }

    /// <summary>
    /// Removes every player away for <see cref="SpotHeldFor"/> or more (L2-029 criteria 4, 5 and
    /// 6, docs/adr/0036). In a game, the game is first brought up to now, each removed player's
    /// desk is emptied, and the tour ends when fewer than two players remain; in the Lobby and on
    /// the Podium they leave as "Leave the room" does. The host mark passes to the earliest joiner
    /// left. Answers the players removed.
    /// </summary>
    public IReadOnlyList<RoomPlayer> RemoveAbsent(DateTimeOffset now, IRandomSource random)
    {
        var absent = _players.Where(player => player.IsAbsentAt(now)).ToList();
        if (absent.Count == 0)
        {
            return absent;
        }

        if (Status == RoomStatus.Playing)
        {
            Game?.Advance(now, random);
        }

        foreach (var player in absent)
        {
            _players.Remove(player);
            if (Status == RoomStatus.Playing)
            {
                Game?.Remove(player.Id, now);
            }

            if (player.IsHost && _players.Count > 0)
            {
                EarliestJoiner().BecomeHost();
            }
        }

        if (Status == RoomStatus.Playing && _players.Count < 2)
        {
            Game?.EndAsEveryoneLeft(now);
        }

        if (Status == RoomStatus.Playing)
        {
            Settle();
        }

        Touch(now);
        return absent;
    }

    /// <summary>The player who joined earliest, by the place they took when two joined at the same time.</summary>
    private RoomPlayer EarliestJoiner() => _players.OrderBy(player => player.JoinedAt).ThenBy(player => player.Position).First();

    private void Settle()
    {
        if (Game?.Phase == GamePhase.Over)
        {
            Status = RoomStatus.Over;
        }

        GameDueAt = Game?.DueAt;
    }

    private void Touch(DateTimeOffset now)
    {
        LastActivityAt = now;
        Version = Guid.NewGuid();
    }

    /// <summary>Whether nobody has done anything in the room for the idle limit, at that time.</summary>
    public bool IsIdleAt(DateTimeOffset now) => now - LastActivityAt >= IdleLimit;
}

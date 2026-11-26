using AroundTheWorld.Domain.Rooms;

namespace AroundTheWorld.Domain.Tours;

/// <summary>Where a room's game is: waiting for its first card, in a duel, showing a decision or a card nobody answered, or over.</summary>
public enum GamePhase
{
    Starting,
    Duel,
    Decided,
    TimeUp,
    Over,
}

/// <summary>
/// One player of a room's game: a room's player, by their id, kid and nickname's indexes, or a
/// classmate the server plays, with its pace as a share of the card's time (docs/adr/0033).
/// </summary>
public sealed class GamePlayer
{
    public GamePlayer(string id, Guid? playerId, KidId? kid, Nickname? nickname, int pacePercent)
    {
        Id = id;
        PlayerId = playerId;
        Kid = kid;
        Nickname = nickname;
        PacePercent = pacePercent;
    }

    private GamePlayer()
    {
    }

    /// <summary>The id the tour knows the player by: the room player's id, or <c>c{n}</c> for a classmate.</summary>
    public string Id { get; private set; } = string.Empty;

    /// <summary>The room's player, or null for a classmate.</summary>
    public Guid? PlayerId { get; private set; }

    public KidId? Kid { get; private set; }

    public Nickname? Nickname { get; private set; }

    /// <summary>A classmate's pace: the share of the card's time it answers after, in percent.</summary>
    public int PacePercent { get; private set; }

    public bool IsClassmate => PlayerId is null;

    /// <summary>A player who left: a classmate takes their place from now on (docs/adr/0033).</summary>
    internal void BecomeClassmate(int pacePercent)
    {
        (PlayerId, Kid, Nickname, PacePercent) = (null, null, null, pacePercent);
    }
}

/// <summary>A classmate's answer, given when its time comes (docs/adr/0033).</summary>
public sealed record PendingAnswer(string Player, int Value, DateTimeOffset At);

/// <summary>
/// A room's game, decided on the server from the answers it receives and the time passing
/// (docs/detailed-designs/rooms/decide-game-on-server/, docs/adr/0033). It deals each flash card
/// to the duel at the traveller's desk, gives the classmates' answers at their pace, closes a
/// card nobody answered, applies each decided duel to the <see cref="Tour"/> at once and deals the
/// next card after the time the devices take to show it, until the tour ends. Every event runs at
/// its own time, whenever it is asked to catch up. It keeps one duel at a time, never a list of
/// those played (L2-048 criterion 5).
/// </summary>
public sealed class RoomGame
{
    /// <summary>The first flash card comes this long after the start (L2-025 criterion 6, to confirm).</summary>
    public static readonly TimeSpan FirstCardAfter = TimeSpan.FromSeconds(3);

    /// <summary>A card nobody answered shows its answer this long before the next (L2-005 criterion 2).</summary>
    public static readonly TimeSpan TimeUpFor = TimeSpan.FromSeconds(2);

    /// <summary>
    /// The next card comes this long after a decision: "You got it!" (1 s), the passport stamp
    /// (1.2 s) and World Map's message (1.6 s) on a device (L2-027 criterion 6, docs/adr/0022).
    /// </summary>
    public static readonly TimeSpan NextCardAfter = TimeSpan.FromMilliseconds(3800);

    /// <summary>No classmate answers sooner than a child could (docs/adr/0019).</summary>
    public static readonly TimeSpan ClassmateFloor = TimeSpan.FromMilliseconds(800);

    /// <summary>The classmates' paces by desk, desks 1, 2 and 3 of each three (docs/adr/0033).</summary>
    private static readonly int[] Paces = [50, 65, 80];

    /// <summary>The time limit of each tour length (L2-006 criterion 2, docs/adr/0024).</summary>
    private static readonly Dictionary<int, TimeSpan> TimeLimits = new()
    {
        [6] = TimeSpan.FromMinutes(3),
        [12] = TimeSpan.FromMinutes(6),
        [24] = TimeSpan.FromMinutes(12),
    };

    private RoomGame()
    {
    }

    public int TourLength { get; private set; }

    public CardSpeed CardSpeed { get; private set; }

    public List<MathsKind> Kinds { get; private set; } = [];

    public List<int> Tables { get; private set; } = [];

    public List<GamePlayer> Players { get; private set; } = [];

    public Tour Tour { get; private set; } = null!;

    /// <summary>The duel of the last card dealt, open or decided; null before the first.</summary>
    public Duel? Duel { get; private set; }

    /// <summary>The desk the duel is at.</summary>
    public int DuelDesk { get; private set; }

    /// <summary>How many cards have been dealt, so each card is told from the last.</summary>
    public int CardsDealt { get; private set; }

    public GamePhase Phase { get; private set; }

    /// <summary>When the open card's time runs out (L2-005).</summary>
    public DateTimeOffset? CardDeadline { get; private set; }

    /// <summary>When the next card is dealt.</summary>
    public DateTimeOffset? NextCardAt { get; private set; }

    /// <summary>When the last duel was decided, or the card's time ran out.</summary>
    public DateTimeOffset? DecidedAt { get; private set; }

    public List<PendingAnswer> Pending { get; private set; } = [];

    /// <summary>What the last decided duel did to the ring, until the next card.</summary>
    public TourMove? LastMove { get; private set; }

    public TourEnding? Ending { get; private set; }

    /// <summary>When something next happens on its own; null once the game is over.</summary>
    public DateTimeOffset? DueAt
    {
        get
        {
            DateTimeOffset? due = Phase == GamePhase.Duel ? CardDeadline : NextCardAt;
            foreach (var pending in Pending)
            {
                due = due is null || pending.At < due ? pending.At : due;
            }

            return Phase == GamePhase.Over ? null : due;
        }
    }

    /// <summary>A flash card's time to answer, set by the card speed (L2-005).</summary>
    public TimeSpan CardTime => GameSetup.Of(Kinds, Tables, TourLength, CardSpeed).CardTime;

    /// <summary>
    /// Starts a game for the players: the first is the traveller from desk 1, the others hold desks
    /// 2, 3 and on in their order, and classmates hold the rest; a tour of 6 desks with more than
    /// 6 players is played round 12 (L2-007 criteria 4, 5 and 8). The first card comes after
    /// <see cref="FirstCardAfter"/>.
    /// </summary>
    public static RoomGame Start(GameSetup setup, IReadOnlyList<RoomPlayer> players, DateTimeOffset now)
    {
        var tourLength = players.Count > setup.TourLength ? 12 : setup.TourLength;
        var game = new RoomGame
        {
            TourLength = tourLength,
            CardSpeed = setup.CardSpeed,
            Kinds = [.. setup.Kinds],
            Tables = [.. setup.Tables],
            Phase = GamePhase.Starting,
            NextCardAt = now + FirstCardAfter,
        };
        var seated = new List<(int Desk, string Player)>();
        for (var desk = 1; desk <= tourLength; desk++)
        {
            GamePlayer taking;
            if (desk <= players.Count)
            {
                var player = players[desk - 1];
                taking = new GamePlayer(player.Id.ToString(), player.Id, player.Kid, player.Nickname, 0);
            }
            else
            {
                taking = new GamePlayer($"c{desk}", null, null, null, Paces[(desk - 1) % Paces.Length]);
            }

            game.Players.Add(taking);
            if (desk > 1)
            {
                seated.Add((desk, taking.Id));
            }
        }

        var limit = TimeLimits.GetValueOrDefault(tourLength, TimeSpan.FromMinutes(12));
        game.Tour = Tour.Start(tourLength, game.Players[0].Id, seated, now, now + limit);
        return game;
    }

    /// <summary>The player the tour knows by that id.</summary>
    public GamePlayer? PlayerOf(string id) => Players.Find(player => player.Id == id);

    /// <summary>
    /// Runs every event due by <paramref name="now"/>, in time order, each at its own time: the
    /// next card, a classmate's answer, a card's time running out. Answers whether anything changed.
    /// </summary>
    public bool Advance(DateTimeOffset now, IRandomSource random)
    {
        var changed = false;
        while (DueAt is { } due && due <= now)
        {
            changed = true;
            if (Phase is GamePhase.Starting or GamePhase.Decided or GamePhase.TimeUp)
            {
                Deal(due, random);
                continue;
            }

            var next = Pending.OrderBy(pending => pending.At).FirstOrDefault();
            if (next is not null && next.At < CardDeadline)
            {
                Pending.Remove(next);
                if (Duel!.Give(next.Player, next.Value, next.At) == AnswerResult.Won)
                {
                    Decide(next.At);
                }

                continue;
            }

            Duel!.TimeOut();
            Pending.Clear();
            (Phase, DecidedAt, NextCardAt) = (GamePhase.TimeUp, CardDeadline, CardDeadline + TimeUpFor);
        }

        return changed;
    }

    /// <summary>
    /// A player's answer that arrived at a time: the game first catches up to that time, then the
    /// duel takes it; it is ignored when no card is open (L2-026 criteria 1, 3 and 4).
    /// </summary>
    public AnswerResult Answer(string player, int value, DateTimeOffset at, IRandomSource random)
    {
        Advance(at, random);
        if (Phase != GamePhase.Duel || Duel is null)
        {
            return AnswerResult.Ignored;
        }

        var result = Duel.Give(player, value, at);
        if (result == AnswerResult.Won)
        {
            Decide(at);
        }

        return result;
    }

    /// <summary>
    /// A player leaves the game: a classmate takes their place on the ring and, when they are in
    /// the open duel, answers for them from now at a classmate's pace (L2-033 criterion 13).
    /// </summary>
    public void Leave(Guid playerId, DateTimeOffset at)
    {
        var leaving = Players.Find(player => player.PlayerId == playerId);
        if (leaving is null)
        {
            return;
        }

        leaving.BecomeClassmate(Paces[1]);
        if (Phase == GamePhase.Duel && Duel?.SideOf(leaving.Id) is not null)
        {
            Pending.Add(new PendingAnswer(leaving.Id, Duel.Card.Answer(), at + ClassmateTime(leaving)));
        }
    }

    private void Deal(DateTimeOffset at, IRandomSource random)
    {
        var deskHolder = Tour.HolderOf(Tour.Desk)!;
        var card = FlashCardMaker.Next(Kinds, Tables, Duel?.Card, random);
        Duel = new Duel(card, Tour.Traveller, deskHolder);
        DuelDesk = Tour.Desk;
        CardsDealt++;
        (Phase, CardDeadline, NextCardAt, DecidedAt, LastMove) = (GamePhase.Duel, at + CardTime, null, null, null);
        Pending.Clear();
        foreach (var id in new[] { Duel.Traveller, Duel.DeskHolder })
        {
            if (PlayerOf(id) is { IsClassmate: true } classmate)
            {
                Pending.Add(new PendingAnswer(id, card.Answer(), at + ClassmateTime(classmate)));
            }
        }
    }

    private TimeSpan ClassmateTime(GamePlayer classmate)
    {
        var share = CardTime * classmate.PacePercent / 100;
        return share < ClassmateFloor ? ClassmateFloor : share;
    }

    private void Decide(DateTimeOffset at)
    {
        Pending.Clear();
        LastMove = Tour.ApplyDuel(Duel!.Winner!.Value, at);
        Ending = Tour.Ending(at);
        DecidedAt = at;
        Phase = Ending is null ? GamePhase.Decided : GamePhase.Over;
        NextCardAt = Ending is null ? at + NextCardAfter : null;
    }
}

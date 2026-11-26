namespace AroundTheWorld.Domain.Tours;

/// <summary>What a decided duel did to the ring: the traveller hopped on, or the desk holder travels on.</summary>
public enum TourMoveKind
{
    Hop,
    DeskHolderTravels,
}

/// <summary>How a tour ended (L2-006): someone went all the way round, or its time limit passed.</summary>
public enum TourEnding
{
    AllTheWayRound,
    TimeLimit,
}

/// <summary>
/// A decided duel's move: who travels on, from which desk to which, whether the empty desk was
/// passed, and who sat down.
/// </summary>
public sealed record TourMove(TourMoveKind Kind, string Traveller, int From, int To, bool PassedEmptyDesk, string? SatDown);

/// <summary>
/// One player's distance travelled, when they reached it, their order at the start and their
/// passport's stamps. It holds at most one stamp a desk (L2-048 criterion 5).
/// </summary>
public sealed class Runner
{
    public Runner(string player, int order, DateTimeOffset reachedAt)
    {
        Player = player;
        Order = order;
        ReachedAt = reachedAt;
    }

    private Runner()
    {
    }

    public string Player { get; private set; } = string.Empty;

    public int Order { get; private set; }

    public int Distance { get; private set; }

    public DateTimeOffset ReachedAt { get; private set; }

    public List<int> Stamps { get; private set; } = [];

    /// <summary>Sets a distance reached at a time; a distance never goes down or past the tour length.</summary>
    internal void Reach(int distance, DateTimeOffset at, int tourLength)
    {
        var capped = Math.Min(distance, tourLength);
        if (capped > Distance)
        {
            (Distance, ReachedAt) = (capped, at);
        }
    }

    internal void Stamp(int desk)
    {
        if (!Stamps.Contains(desk))
        {
            Stamps.Add(desk);
        }
    }
}

/// <summary>
/// The ring of a tour on the server (L2-002, L2-003, L2-006, L2-007). It keeps the current
/// positions and the distances only, never a list of the duels played (L2-048 criterion 5), and
/// plays the same table of cases as the device's <c>Tour</c> (docs/specs/tour-cases.json).
/// </summary>
public sealed class Tour
{
    private Tour()
    {
    }

    public int TourLength { get; private set; }

    /// <summary>The player seated at each desk from desk 1, or null for an empty desk.</summary>
    public List<string?> Holders { get; private set; } = [];

    public string Traveller { get; private set; } = string.Empty;

    /// <summary>The desk the traveller stands beside, where the next duel is.</summary>
    public int Desk { get; private set; }

    public List<Runner> Runners { get; private set; } = [];

    /// <summary>When the tour's time limit passes (L2-006 criterion 2).</summary>
    public DateTimeOffset EndsAt { get; private set; }

    /// <summary>
    /// Starts a tour: the traveller beside the first held desk after desk 1 with a distance of 1
    /// and the stamp of desk 1, desk 1 empty, and each seated player at their desk with 0 (L2-007).
    /// </summary>
    public static Tour Start(int tourLength, string traveller, IReadOnlyList<(int Desk, string Player)> seated, DateTimeOffset startedAt, DateTimeOffset endsAt)
    {
        var tour = new Tour
        {
            TourLength = tourLength,
            Holders = [.. Enumerable.Repeat<string?>(null, tourLength)],
            Traveller = traveller,
            EndsAt = endsAt,
        };
        foreach (var (desk, player) in seated)
        {
            if (desk > 1 && desk <= tourLength)
            {
                tour.Holders[desk - 1] = player;
            }
        }

        tour.Runners = [.. new[] { traveller }.Concat(seated.Select(seat => seat.Player))
            .Select((player, order) => new Runner(player, order, startedAt))];
        tour.Desk = tour.NextHeld(1).Desk;
        var first = tour.RunnerOf(traveller)!;
        first.Reach(1, startedAt, tourLength);
        first.Stamp(1);
        return tour;
    }

    /// <summary>The player seated at the desk, or null for an empty desk.</summary>
    public string? HolderOf(int desk) => desk >= 1 && desk <= Holders.Count ? Holders[desk - 1] : null;

    /// <summary>The desk the player is seated at, or null for the traveller.</summary>
    public int? DeskOf(string player)
    {
        var index = Holders.IndexOf(player);
        return index < 0 ? null : index + 1;
    }

    public int DistanceOf(string player) => RunnerOf(player)?.Distance ?? 0;

    public IReadOnlyList<int> StampsOf(string player) => RunnerOf(player)?.Stamps ?? [];

    /// <summary>The players by distance travelled, the one who reached it first above, then by order (L2-006 3 and 6).</summary>
    public IReadOnlyList<Runner> Ordered() =>
        [.. Runners.OrderByDescending(r => r.Distance).ThenBy(r => r.ReachedAt).ThenBy(r => r.Order)];

    /// <summary>
    /// How the tour has ended at a time, asked after each decided duel: all the way round when a
    /// player's distance equals the tour length, on time when the limit has passed, or null.
    /// </summary>
    public TourEnding? Ending(DateTimeOffset at)
    {
        if (Runners.Count > 0 && Runners.Max(r => r.Distance) >= TourLength)
        {
            return TourEnding.AllTheWayRound;
        }

        return at >= EndsAt ? TourEnding.TimeLimit : null;
    }

    /// <summary>
    /// Applies a decided duel at the desk the traveller stands beside (L2-002, L2-003): the winning
    /// traveller hops on with a distance and a stamp more; a winning desk holder walks on as the
    /// traveller with a distance of 1 if it was 0 and no stamp, and the beaten traveller sits down.
    /// </summary>
    public TourMove ApplyDuel(DuelSide winner, DateTimeOffset at)
    {
        var from = Desk;
        var (next, passed) = NextHeld(from);
        if (winner == DuelSide.Traveller)
        {
            var runner = RunnerOf(Traveller)!;
            Desk = next;
            runner.Reach(runner.Distance + 1, at, TourLength);
            runner.Stamp(next);
            return new TourMove(TourMoveKind.Hop, Traveller, from, next, passed, null);
        }

        var beaten = Traveller;
        var holder = HolderOf(from) ?? beaten;
        Holders[from - 1] = beaten;
        Traveller = holder;
        Desk = next;
        RunnerOf(holder)?.Reach(1, at, TourLength);
        return new TourMove(TourMoveKind.DeskHolderTravels, holder, from, next, passed, beaten);
    }

    private Runner? RunnerOf(string player) => Runners.Find(r => r.Player == player);

    private (int Desk, bool Passed) NextHeld(int desk)
    {
        var next = desk;
        var passed = false;
        for (var step = 0; step < TourLength; step++)
        {
            next = (next % TourLength) + 1;
            if (HolderOf(next) is not null)
            {
                return (next, passed);
            }

            passed = true;
        }

        return (next, passed);
    }
}

using AroundTheWorld.Domain.Tours;

namespace AroundTheWorld.UnitTests.Tours;

/// <summary>
/// L2-029 criterion 4, L2-007 criterion 6: what the ring does when a player is removed after 30
/// seconds away, one case per row (docs/adr/0036-coming-back-after-a-lost-connection.md). T
/// travels beside desk 2; P2 to P6 hold desks 2 to 6; desk 1 is empty.
/// </summary>
public sealed class TourRemoveTests
{
    private static readonly DateTimeOffset Now = new(2026, 1, 5, 9, 0, 0, TimeSpan.Zero);

    [Theory]
    // A seated player not beside the traveller: their desk is empty, nothing else moves.
    [InlineData("P4", "T", 2, 1, "-,P2,P3,-,P5,P6")]
    // The desk holder beside the traveller: the traveller moves on to the next held desk, no hop.
    [InlineData("P2", "T", 3, 1, "-,-,P3,P4,P5,P6")]
    // The traveller: the desk holder beside them travels on, and nobody sits down at desk 2.
    [InlineData("T", "P2", 3, 1, "-,-,P3,P4,P5,P6")]
    public void Given_a_tour_when_a_player_is_removed_then_their_desk_stays_empty_and_the_ring_goes_on(
        string removed, string traveller, int desk, int travellerDistance, string holders)
    {
        var tour = Start();

        tour.Remove(removed, Now);

        Assert.Equal(traveller, tour.Traveller);
        Assert.Equal(desk, tour.Desk);
        Assert.Equal(travellerDistance, tour.DistanceOf(traveller));
        Assert.Equal(holders, string.Join(',', tour.Holders.Select(holder => holder ?? "-")));
    }

    [Fact]
    public void Given_the_desk_holder_beside_the_traveller_and_the_next_desk_empty_when_removed_then_the_traveller_passes_the_empty_desks()
    {
        var tour = Start();
        tour.Remove("P3", Now);

        tour.Remove("P2", Now);

        Assert.Equal(4, tour.Desk);
        Assert.Equal(1, tour.DistanceOf("T"));
    }

    [Fact]
    public void Given_a_removed_player_who_travelled_when_the_standings_are_read_then_their_distance_still_counts()
    {
        var tour = Start();
        tour.ApplyDuel(DuelSide.Traveller, Now);

        tour.Remove("T", Now);

        Assert.Equal("T", tour.Ordered()[0].Player);
        Assert.Equal(2, tour.DistanceOf("T"));
    }

    [Fact]
    public void Given_a_removed_player_when_a_duel_is_later_won_then_nobody_sits_at_their_desk()
    {
        var tour = Start();
        tour.Remove("P3", Now);

        var move = tour.ApplyDuel(DuelSide.Traveller, Now);

        Assert.Equal(4, move.To);
        Assert.True(move.PassedEmptyDesk);
        Assert.Null(tour.HolderOf(3));
    }

    private static Tour Start() =>
        Tour.Start(6, "T", [(2, "P2"), (3, "P3"), (4, "P4"), (5, "P5"), (6, "P6")], Now, Now.AddMinutes(3));
}

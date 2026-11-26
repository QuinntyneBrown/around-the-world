using AroundTheWorld.Domain.Rooms;
using AroundTheWorld.Domain.Tours;

namespace AroundTheWorld.UnitTests.Tours;

/// <summary>
/// L2-005, L2-006 criterion 2, L2-007 criterion 8, L2-027 criterion 5: the server's game in a room
/// of friends, one case per row: a classmate's pace by its desk and the card speed, the tour's
/// length for the players, and the time limit (docs/adr/0033).
/// </summary>
public sealed class RoomGameTests
{
    private static readonly DateTimeOffset Now = new(2026, 1, 5, 9, 0, 0, TimeSpan.Zero);

    [Theory]
    [InlineData(CardSpeed.Normal, 3, 4800)]
    [InlineData(CardSpeed.Normal, 4, 3000)]
    [InlineData(CardSpeed.Normal, 5, 3900)]
    [InlineData(CardSpeed.Chill, 4, 5000)]
    [InlineData(CardSpeed.Lightning, 4, 1500)]
    public void Given_a_classmate_at_a_desk_when_it_duels_then_it_answers_right_after_its_share_of_the_card_time(CardSpeed speed, int desk, int afterMs)
    {
        // Given a race whose traveller stands beside the classmate's desk
        var game = RoomGame.Start(GameSetup.Of([MathsKind.Times], [2], 6, speed), Players(2), Now);
        var at = Now + RoomGame.FirstCardAfter;
        game.Advance(at, new Zero());
        game.Answer(game.Players[0].Id, game.Duel!.Card.Answer(), at, new Zero());
        for (var held = 3; held < desk; held++)
        {
            at += RoomGame.NextCardAfter;
            game.Advance(at, new Zero());
            game.Answer(game.Players[0].Id, game.Duel!.Card.Answer(), at, new Zero());
        }

        at += RoomGame.NextCardAfter;
        game.Advance(at, new Zero());
        Assert.Equal(desk, game.DuelDesk);

        // When its share of the card's time has all but passed, then when it has passed
        game.Advance(at + TimeSpan.FromMilliseconds(afterMs - 1), new Zero());
        Assert.Equal(DuelOutcome.Open, game.Duel!.Outcome);
        game.Advance(at + TimeSpan.FromMilliseconds(afterMs), new Zero());

        // Then it answered right and won as the desk holder
        Assert.Equal(DuelSide.DeskHolder, game.Duel.Winner);
    }

    [Theory]
    [InlineData(6, 2, 6)]
    [InlineData(6, 6, 6)]
    [InlineData(6, 7, 12)]
    [InlineData(6, 8, 12)]
    [InlineData(24, 8, 24)]
    public void Given_a_setup_and_players_when_the_race_starts_then_every_player_has_a_desk(int chosen, int players, int played)
    {
        var game = RoomGame.Start(GameSetup.Of([MathsKind.Times], [2], chosen, CardSpeed.Normal), Players(players), Now);

        Assert.Equal(played, game.TourLength);
        Assert.Equal(played - players, game.Players.Count(player => player.IsClassmate));
        Assert.Null(game.Tour.HolderOf(1));
    }

    [Theory]
    [InlineData(6, 3)]
    [InlineData(12, 6)]
    [InlineData(24, 12)]
    public void Given_a_tour_when_its_time_limit_has_passed_then_the_next_decided_duel_ends_it(int tourLength, int minutes)
    {
        var game = RoomGame.Start(GameSetup.Of([MathsKind.Times], [2], tourLength, CardSpeed.Normal), Players(2), Now);
        var late = Now + TimeSpan.FromMinutes(minutes);
        game.Advance(late, new Zero());

        game.Answer(game.Players[0].Id, game.Duel!.Card.Answer(), late, new Zero());

        Assert.Equal(GamePhase.Over, game.Phase);
        Assert.Equal(TourEnding.TimeLimit, game.Ending);
    }

    private static List<RoomPlayer> Players(int count)
    {
        var room = Room.Make(RoomCode.From("BOLT"), KidId.Zuri, new Nickname(0, 0), Now);
        for (var joined = 1; joined < count; joined++)
        {
            room.Join(KidId.Nia, new Nickname(joined, joined), Now);
        }

        return [.. room.Players];
    }

    private sealed class Zero : IRandomSource
    {
        public int Below(int limit) => 0;
    }
}

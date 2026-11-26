using AroundTheWorld.Domain.Rooms;

namespace AroundTheWorld.UnitTests.Rooms;

/// <summary>
/// L2-023 criteria 3, 5 and 6, L2-025 criteria 1, 4 and 5: who may join a room, who becomes the
/// host when the host leaves, and who may start the game, one case per row.
/// </summary>
public sealed class RoomTests
{
    private static readonly DateTimeOffset Now = new(2026, 1, 5, 9, 0, 0, TimeSpan.Zero);

    [Theory]
    [InlineData(1, false, null)]
    [InlineData(7, false, null)]
    [InlineData(8, false, RoomRule.Full)]
    [InlineData(2, true, RoomRule.GameStarted)]
    public void Given_a_room_of_n_players_when_a_friend_joins_then_they_are_admitted_or_refused(int players, bool started, RoomRule? refusal)
    {
        var room = RoomOf(players);
        if (started)
        {
            room.Start(room.Players[0], Now);
        }

        var join = () => room.Join(KidId.Pip, new Nickname(1, 1), Now);

        if (refusal is { } rule)
        {
            Assert.Equal(rule, Assert.Throws<RoomRuleException>(join).Rule);
            Assert.Equal(players, room.Players.Count);
        }
        else
        {
            var joined = join();
            Assert.Equal(players + 1, room.Players.Count);
            Assert.False(joined.IsHost);
            Assert.Equal(players, joined.Position);
        }
    }

    [Fact]
    public void Given_a_room_whose_second_player_left_when_another_joins_then_their_place_is_after_the_last()
    {
        var room = RoomOf(3);
        room.Leave(room.Players[1], Now);

        var joined = room.Join(KidId.Nia, new Nickname(2, 2), Now);

        Assert.Equal(3, joined.Position);
    }

    [Fact]
    public void Given_the_host_leaves_when_others_remain_then_the_one_who_joined_earliest_is_the_host()
    {
        var room = Room.Make(RoomCode.From("BOLT"), KidId.Zuri, new Nickname(0, 0), Now);
        var later = room.Join(KidId.Nia, new Nickname(1, 1), Now.AddMinutes(2));
        var earlier = room.Join(KidId.Milo, new Nickname(2, 2), Now.AddMinutes(1));

        var empty = room.Leave(room.Players[0], Now.AddMinutes(3));

        Assert.False(empty);
        Assert.True(earlier.IsHost);
        Assert.False(later.IsHost);
        Assert.Equal(Now.AddMinutes(3), room.LastActivityAt);
    }

    [Fact]
    public void Given_a_player_who_is_not_the_host_leaves_when_others_remain_then_the_host_stays()
    {
        var room = RoomOf(3);
        var host = room.Players[0];

        room.Leave(room.Players[2], Now);

        Assert.True(host.IsHost);
        Assert.Single(room.Players, player => player.IsHost);
    }

    [Fact]
    public void Given_the_last_player_when_they_leave_then_the_room_is_empty()
    {
        var room = RoomOf(1);

        Assert.True(room.Leave(room.Players[0], Now));
    }

    [Theory]
    [InlineData(2, true, null)]
    [InlineData(1, true, RoomRule.NotEnoughPlayers)]
    [InlineData(2, false, RoomRule.NotHost)]
    public void Given_a_room_when_a_player_starts_the_game_then_only_the_host_of_two_or_more_may(int players, bool byHost, RoomRule? refusal)
    {
        var room = RoomOf(players);
        var by = byHost ? room.Players[0] : room.Players[1];

        var start = () => room.Start(by, Now);

        if (refusal is { } rule)
        {
            Assert.Equal(rule, Assert.Throws<RoomRuleException>(start).Rule);
            Assert.Equal(RoomStatus.Waiting, room.Status);
        }
        else
        {
            start();
            Assert.Equal(RoomStatus.Playing, room.Status);
        }
    }

    [Fact]
    public void Given_a_room_when_its_players_change_then_its_version_changes()
    {
        var room = RoomOf(1);
        var before = room.Version;

        room.Join(KidId.Kenji, new Nickname(3, 3), Now);

        Assert.NotEqual(before, room.Version);
    }

    private static Room RoomOf(int players)
    {
        var room = Room.Make(RoomCode.From("BOLT"), KidId.Zuri, new Nickname(0, 0), Now);
        for (var friend = 1; friend < players; friend++)
        {
            room.Join(KidId.Milo, new Nickname(friend, friend), Now.AddSeconds(friend));
        }

        return room;
    }
}

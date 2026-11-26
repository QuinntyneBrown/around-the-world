using AroundTheWorld.Api.Tests.Support;
using AroundTheWorld.Domain.Tours;
using AroundTheWorld.Infrastructure.Persistence;
using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.SignalR.Client;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace AroundTheWorld.Api.Tests.Rooms;

/// <summary>
/// L2-006 criteria 1 and 5, L2-027 criterion 3, L2-033 criterion 13, L2-035 criterion 3: the server
/// ends the tour when a player has gone all the way round and tells everyone, the room is kept for
/// the Podium, "Play again" returns everyone to its Lobby, a player who leaves mid-race is replaced
/// by a classmate, and the room goes with its last player (docs/adr/0033).
/// </summary>
public sealed class EndTourTests(ApiFixture api) : IClassFixture<ApiFixture>
{
    private static CancellationToken Cancel => TestContext.Current.CancellationToken;

    [Fact]
    public async Task Given_a_tour_of_6_desks_when_the_host_wins_every_duel_then_the_tour_ends_for_everyone_and_play_again_returns_the_room_to_its_lobby()
    {
        // Given a race of 6 desks, the host travelling
        await using var race = await RaceAsync(tourLength: 6);

        // When the host answers each card correctly at once, 5 duels round the ring
        GameStateBody seen = null!;
        for (var duel = 1; duel <= 5; duel++)
        {
            var card = await race.FriendHub.WaitForGameAsync($"card {duel}", game => game.Duel?.Number == duel && game.Phase == "duel");
            await race.HostHub.Connection.InvokeAsync("SubmitAnswer", card.Duel!.Card.Answer(), Cancel);
            seen = await race.FriendHub.WaitForGameAsync($"duel {duel} decided", game => game.Duel?.Number == duel && game.Phase is "decided" or "over");
            if (duel < 5)
            {
                await api.PassAsync(RoomGame.NextCardAfter);
            }
        }

        // Then the last hop passed the empty desk 1, and the tour ended with the host all the way
        // round, for every player (L2-002 criterion 4, L2-006 criteria 1 and 5)
        Assert.Equal("over", seen.Phase);
        Assert.Equal("allTheWayRound", seen.Ending);
        Assert.Equal(race.Host, seen.Winner);
        Assert.Equal(6, seen.Player(race.HostId).Distance);
        Assert.Equal([1, 3, 4, 5, 6, 2], seen.Player(race.HostId).Stamps);
        Assert.True(seen.LastMove!.PassedEmptyDesk);
        await race.HostHub.WaitForAsync("the room over", state => state.Status == "over");

        // And no more cards come, and the room is kept while the Podium is shown (L2-027 3)
        await api.PassAsync(TimeSpan.FromSeconds(10));
        Assert.DoesNotContain(race.FriendHub.Games(), game => game.Duel?.Number == 6);
        Assert.Equal(2, await CountPlayersAsync(race.Code));

        // When the friend chooses "Play again", then the host does too
        var returned = race.HostHub.WaitForNextAsync("the room waiting again", state => state.Status == "waiting");
        await race.FriendHub.Connection.InvokeAsync("PlayAgain", Cancel);
        await race.HostHub.Connection.InvokeAsync("PlayAgain", Cancel);

        // Then every player is told the room waits again, with the same players and setup (L2-035 3)
        var room = await returned;
        Assert.Equal(2, room.Players.Count);
        Assert.Equal(6, room.Setup.TourLength);
        Assert.Single(race.HostHub.Received().SkipWhile(state => state.Status != "over"), state => state.Status == "waiting");
    }

    [Fact]
    public async Task Given_a_race_being_played_when_a_player_chooses_play_again_then_it_is_refused_with_not_over()
    {
        await using var race = await RaceAsync(tourLength: 12);

        var refused = await Assert.ThrowsAsync<HubException>(() => race.FriendHub.Connection.InvokeAsync("PlayAgain", Cancel));

        Assert.Contains("not_over", refused.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Given_a_friend_in_the_duel_when_they_leave_the_race_then_a_classmate_takes_their_place_and_the_race_carries_on()
    {
        // Given the host travelling against the friend at desk 2
        await using var race = await RaceAsync(tourLength: 12);

        // When the friend leaves mid-duel
        await race.FriendHub.Connection.InvokeAsync("LeaveRoom", Cancel);

        // Then the host is told the friend is now a classmate on the ring (L2-033 criterion 13)
        var seen = await race.HostHub.WaitForGameAsync("the friend replaced", game => game.Player(race.FriendId).Kid == "classmate");
        Assert.Equal(race.Friend, seen.Desks[1]);
        Assert.Equal("duel", seen.Phase);

        // When the classmate's time comes, 65% of the card's time
        await api.PassAsync(TimeSpan.FromMilliseconds(3900));

        // Then the classmate in the friend's place has answered and won, and the race goes on
        var decided = await race.HostHub.WaitForGameAsync("the duel decided", game => game.Phase == "decided");
        Assert.Equal("deskHolder", decided.Duel!.Winner);
        Assert.Equal(1, await CountPlayersAsync(race.Code));
    }

    [Fact]
    public async Task Given_a_tour_that_has_ended_when_its_last_players_leave_the_podium_then_the_room_is_gone()
    {
        await using var race = await RaceAsync(tourLength: 6);
        for (var duel = 1; duel <= 5; duel++)
        {
            var card = await race.HostHub.WaitForGameAsync($"card {duel}", game => game.Duel?.Number == duel && game.Phase == "duel");
            await race.HostHub.Connection.InvokeAsync("SubmitAnswer", card.Duel!.Card.Answer(), Cancel);
            await race.HostHub.WaitForGameAsync($"duel {duel} decided", game => game.Duel?.Number == duel && game.Phase is "decided" or "over");
            await api.PassAsync(RoomGame.NextCardAfter);
        }

        await race.HostHub.Connection.InvokeAsync("LeaveRoom", Cancel);
        await race.FriendHub.Connection.InvokeAsync("LeaveRoom", Cancel);

        // L2-027 criterion 3, L2-046 criterion 2
        await using var scope = api.Services.CreateAsyncScope();
        var store = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.False(await store.Rooms.AnyAsync(room => room.Code.Value == race.Code, Cancel));
    }

    private async Task<int> CountPlayersAsync(string code)
    {
        await using var scope = api.Services.CreateAsyncScope();
        var store = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return (await store.Rooms.SingleAsync(room => room.Code.Value == code, Cancel)).Players.Count;
    }

    private async Task<Race> RaceAsync(int tourLength)
    {
        using var http = api.CreateClient();
        var host = await RoomRequests.MakeAsync(http, "zuri", 0, 0);
        var friend = await RoomRequests.JoinAsync(http, host.Code, "milo", 3, 2);
        var hostHub = await RoomHubClient.ConnectAsync(api, host.Token);
        var friendHub = await RoomHubClient.ConnectAsync(api, friend.Token);
        await friendHub.WaitForAsync("two players", state => state.Players.Count == 2);
        await hostHub.Connection.InvokeAsync("SaveSetup", new SetupBody(["times"], [2, 3, 4, 5], tourLength, "normal"), Cancel);
        await hostHub.Connection.InvokeAsync("StartGame", Cancel);
        await friendHub.WaitForGameAsync("the game starting", game => game.Phase == "starting");
        await api.PassAsync(RoomGame.FirstCardAfter);
        await friendHub.WaitForGameAsync("the first card", game => game.Duel is not null);
        return new Race(host.Code, host.PlayerId, friend.PlayerId, hostHub, friendHub);
    }

    private sealed record Race(string Code, Guid HostId, Guid FriendId, RoomHubClient HostHub, RoomHubClient FriendHub) : IAsyncDisposable
    {
        public string Host => HostId.ToString();

        public string Friend => FriendId.ToString();

        public async ValueTask DisposeAsync()
        {
            await HostHub.DisposeAsync();
            await FriendHub.DisposeAsync();
        }
    }
}

using AroundTheWorld.Api.Tests.Support;
using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.SignalR.Client;

namespace AroundTheWorld.Api.Tests.Rooms;

/// <summary>
/// L2-007 criteria 4, 5 and 8, L2-025 criteria 1, 2, 4 and 6, L2-026 criterion 5, L2-043
/// criterion 2: the host starts the race, and every player is sent the same first flash card,
/// without its answer, in the same server step (docs/adr/0033-deciding-a-game-on-the-server.md).
/// </summary>
public sealed class StartGameTests(ApiFixture api) : IClassFixture<ApiFixture>
{
    private static CancellationToken Cancel => TestContext.Current.CancellationToken;

    [Fact]
    public async Task Given_a_host_and_a_friend_when_the_host_starts_the_race_then_both_are_sent_the_same_first_card_3_seconds_later()
    {
        // Given a host and a friend whose Lobbies are connected
        using var http = api.CreateClient();
        var host = await RoomRequests.MakeAsync(http, "zuri", 0, 0);
        var friend = await RoomRequests.JoinAsync(http, host.Code, "nia", 8, 4);
        await using var hostHub = await RoomHubClient.ConnectAsync(api, host.Token);
        await using var friendHub = await RoomHubClient.ConnectAsync(api, friend.Token);
        await friendHub.WaitForAsync("two players", state => state.Players.Count == 2);

        // When the host starts the race
        await hostHub.Connection.InvokeAsync("StartGame", Cancel);

        // Then every player hears the room is playing and the game is starting, the host travelling
        // from desk 1, the friend at desk 2 and classmates at the rest (L2-007 4, 5 and 8, L2-025 6)
        await friendHub.WaitForAsync("the room playing", state => state.Status == "playing");
        var starting = await friendHub.WaitForGameAsync("the game starting", game => game.Phase == "starting");
        Assert.Equal(12, starting.TourLength);
        Assert.Equal(6, starting.SecondsToAnswer);
        Assert.Equal(3000, starting.FirstCardInMs);
        Assert.Null(starting.Duel);
        Assert.Equal(host.PlayerId.ToString(), starting.Traveller);
        Assert.Equal(2, starting.TravellerDesk);
        Assert.Null(starting.Desks[0]);
        Assert.Equal(friend.PlayerId.ToString(), starting.Desks[1]);
        Assert.All(starting.Desks.Skip(2), holder => Assert.StartsWith("c", holder, StringComparison.Ordinal));
        Assert.Equal("nia", starting.Player(friend.PlayerId).Kid);
        Assert.Equal(new NicknameBody(8, 4), starting.Player(friend.PlayerId).Nickname);
        Assert.Equal(1, starting.Player(host.PlayerId).Distance);
        Assert.Equal([1], starting.Player(host.PlayerId).Stamps);
        Assert.Equal(10, starting.Players.Count(player => player.Kid == "classmate"));

        // When 3 seconds pass on the server's clock
        await api.PassAsync(TimeSpan.FromSeconds(3));

        // Then both are sent the same first card, the host against the friend at desk 2, with the
        // card's whole time and no answer in it (L2-026 criterion 5)
        var hostCard = await hostHub.WaitForGameAsync("the first card", game => game.Duel is not null);
        var friendCard = await friendHub.WaitForGameAsync("the first card", game => game.Duel is not null);
        Assert.Equal(hostCard.Duel!.Card, friendCard.Duel!.Card);
        Assert.Equal("duel", friendCard.Phase);
        Assert.Equal(1, friendCard.Duel.Number);
        Assert.Equal(2, friendCard.Duel.Desk);
        Assert.Equal(host.PlayerId.ToString(), friendCard.Duel.Traveller);
        Assert.Equal(friend.PlayerId.ToString(), friendCard.Duel.DeskHolder);
        Assert.Equal(6000, friendCard.Duel.TimeLeftMs);
        Assert.Equal("open", friendCard.Duel.Outcome);
        Assert.Null(friendCard.Duel.Answer);
        Assert.All(friendHub.GamesAsJson(), json => Assert.DoesNotContain($"\"answer\":{friendCard.Duel.Card.Answer()}", json, StringComparison.Ordinal));
    }

    [Fact]
    public async Task Given_a_friend_who_is_not_the_host_when_they_start_the_race_then_it_is_refused_with_not_host()
    {
        using var http = api.CreateClient();
        var host = await RoomRequests.MakeAsync(http);
        var friend = await RoomRequests.JoinAsync(http, host.Code);
        await using var friendHub = await RoomHubClient.ConnectAsync(api, friend.Token);
        await friendHub.WaitForAsync("two players", state => state.Players.Count == 2);

        var refused = await Assert.ThrowsAsync<HubException>(() => friendHub.Connection.InvokeAsync("StartGame", Cancel));

        // L2-025 criterion 4, L2-043 criterion 2
        Assert.Contains("not_host", refused.Message, StringComparison.Ordinal);
        Assert.Empty(friendHub.Games());
    }

    [Fact]
    public async Task Given_a_host_alone_when_they_start_the_race_then_it_is_refused_with_not_enough_players()
    {
        using var http = api.CreateClient();
        var host = await RoomRequests.MakeAsync(http);
        await using var hostHub = await RoomHubClient.ConnectAsync(api, host.Token);
        await hostHub.WaitForAsync("the host alone", state => state.Players.Count == 1);

        var refused = await Assert.ThrowsAsync<HubException>(() => hostHub.Connection.InvokeAsync("StartGame", Cancel));

        // L2-025 criterion 1
        Assert.Contains("not_enough_players", refused.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Given_seven_players_and_a_tour_of_6_desks_when_the_race_starts_then_it_is_played_round_12_desks()
    {
        using var http = api.CreateClient();
        var host = await RoomRequests.MakeAsync(http);
        for (var joined = 1; joined < 7; joined++)
        {
            await RoomRequests.JoinAsync(http, host.Code, "pip", joined, joined);
        }

        await using var hostHub = await RoomHubClient.ConnectAsync(api, host.Token);
        await hostHub.WaitForAsync("seven players", state => state.Players.Count == 7);
        await hostHub.Connection.InvokeAsync("SaveSetup", new SetupBody(["times"], [2, 3], 6, "normal"), Cancel);
        await hostHub.WaitForAsync("6 desks", state => state.Setup.TourLength == 6);

        await hostHub.Connection.InvokeAsync("StartGame", Cancel);

        // L2-007 criterion 8 (to confirm): every player has a desk
        var game = await hostHub.WaitForGameAsync("the game starting", state => state.Phase == "starting");
        Assert.Equal(12, game.TourLength);
        Assert.Equal(5, game.Players.Count(player => player.Kid == "classmate"));
    }
}

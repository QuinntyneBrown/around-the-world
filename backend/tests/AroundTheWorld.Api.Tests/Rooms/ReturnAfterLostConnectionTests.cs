using AroundTheWorld.Api.Tests.Support;
using AroundTheWorld.Domain.Tours;
using AroundTheWorld.Infrastructure.Persistence;
using Microsoft.AspNetCore.SignalR.Client;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace AroundTheWorld.Api.Tests.Rooms;

/// <summary>
/// L2-029, L2-043 criterion 4, L2-007 criterion 6: a player whose connection is lost keeps their
/// spot for 30 seconds while the game goes on without waiting, takes it back with their token,
/// and is removed after 30 seconds, leaving their desk empty; when fewer than two players remain
/// the tour ends (docs/adr/0036-coming-back-after-a-lost-connection.md). A connection is lost by
/// stopping a real client; the clock is advanced, never slept on.
/// </summary>
public sealed class ReturnAfterLostConnectionTests(ApiFixture api) : IClassFixture<ApiFixture>
{
    private static readonly TimeSpan SpotHeld = TimeSpan.FromSeconds(30);

    private static CancellationToken Cancel => TestContext.Current.CancellationToken;

    [Fact]
    public async Task Given_a_friend_whose_connection_is_lost_in_a_duel_when_the_host_answers_then_the_host_wins_it_and_the_game_does_not_wait()
    {
        // Given the host travelling against the friend at desk 2
        await using var race = await RaceAsync("zuri", "nia");
        var card = await race.Hubs[0].WaitForGameAsync("the first card", game => game.Phase == "duel");

        // When the friend's connection is lost and the host answers
        await LoseAsync(race, 1);
        await race.Hubs[0].Connection.InvokeAsync("SubmitAnswer", card.Duel!.Card.Answer(), Cancel);

        // Then the host wins the duel at once (L2-029 criterion 3)
        var decided = await race.Hubs[0].WaitForGameAsync("the duel decided", game => game.Phase == "decided");
        Assert.Equal("traveller", decided.Duel!.Winner);
    }

    [Fact]
    public async Task Given_a_friend_away_for_20_seconds_when_they_reconnect_with_their_token_then_they_have_the_same_desk_and_the_game_as_it_stands_and_are_kept()
    {
        // Given the friend at desk 2 loses their connection
        await using var race = await RaceAsync("zuri", "nia");
        await LoseAsync(race, 1);

        // When they reconnect with their token 20 seconds later
        await PassAsync(TimeSpan.FromSeconds(20));
        await using var back = await RoomHubClient.ConnectAsync(api, race.Entries[1].Token);

        // Then they are sent the room and the game as they stand, at the same desk (L2-029 2, L2-043 4)
        var room = await back.WaitForAsync("the room", state => state.Players.Count == 2);
        Assert.Equal(race.Code, room.Code);
        var game = await back.WaitForGameAsync("the game", _ => true);
        Assert.Equal(race.Id(1), game.Desks[1]);
        Assert.False(game.Player(race.Entries[1].PlayerId).Removed);

        // And when 30 seconds have passed since the loss, they are still in the room
        await PassAsync(TimeSpan.FromSeconds(15));
        Assert.Equal(2, await CountPlayersAsync(race.Code));
    }

    [Fact]
    public async Task Given_a_connection_replaced_before_the_old_one_was_lost_when_30_seconds_pass_then_nobody_is_removed()
    {
        // Given the friend's device connects again before the server notices its old connection is gone
        await using var race = await RaceAsync("zuri", "nia");
        await using var again = await RoomHubClient.ConnectAsync(api, race.Entries[1].Token);
        await again.WaitForAsync("the room", state => state.Players.Count == 2);

        // When the old connection is lost and 30 seconds pass
        await LoseAsync(race, 1);
        await PassAsync(SpotHeld);

        // Then the friend keeps their spot
        Assert.Equal(2, await CountPlayersAsync(race.Code));
    }

    [Fact]
    public async Task Given_a_race_of_two_when_the_friend_is_away_for_30_seconds_then_they_are_removed_and_the_tour_ends_for_the_host()
    {
        // Given the friend at desk 2 loses their connection
        await using var race = await RaceAsync("zuri", "nia");
        await LoseAsync(race, 1);

        // When 30 seconds pass
        await PassAsync(SpotHeld);

        // Then the host is told the friend left the room, and the tour is over (L2-029 4 and 5)
        await race.Hubs[0].WaitForAsync("the room over with the host alone", state => state.Status == "over" && state.Players.Count == 1);
        var over = await race.Hubs[0].WaitForGameAsync("the tour ended", game => game.Phase == "over");
        Assert.Equal("everyoneLeft", over.Ending);
        Assert.True(over.Player(race.Entries[1].PlayerId).Removed);
        Assert.Null(over.Desks[1]);
        Assert.Equal("timedOut", over.Duel!.Outcome);
        Assert.Equal(race.Id(0), over.Winner);

        // And when the removed friend comes back with their token, they are refused (L2-043 4)
        await using var late = await RoomHubClient.ConnectAsync(api, race.Entries[1].Token);
        await late.ClosedAsync();
        Assert.Empty(late.Received());
    }

    [Fact]
    public async Task Given_the_desk_holder_away_for_30_seconds_in_a_race_of_three_then_their_desk_is_empty_and_the_traveller_moves_on_without_a_hop()
    {
        // Given the host travelling against Nia at desk 2, and Pip at desk 3
        await using var race = await RaceAsync("zuri", "nia", "pip");
        await LoseAsync(race, 1);

        // When Nia is away for 30 seconds
        await PassAsync(SpotHeld);

        // Then everyone left is told Nia dropped out: desk 2 is empty and the host stands at desk 3
        // with the distance they had (L2-029 criterion 4, L2-007 criterion 6)
        var removed = await race.Hubs[2].WaitForGameAsync("Nia removed", game => game.Player(race.Entries[1].PlayerId).Removed);
        Assert.Null(removed.Desks[1]);
        Assert.Equal(race.Id(0), removed.Traveller);
        Assert.Equal(3, removed.TravellerDesk);
        Assert.Equal(1, removed.Player(race.Entries[0].PlayerId).Distance);
        Assert.NotEqual("over", removed.Phase);
        await race.Hubs[0].WaitForAsync("two players left", state => state.Players.Count == 2 && state.Status == "playing");

        // And the next card is dealt at desk 3, between the host and Pip
        await PassAsync(RoomGame.TimeUpFor);
        var next = await race.Hubs[2].WaitForGameAsync("the card at desk 3", game => game.Phase == "duel" && game.Duel!.Desk == 3);
        Assert.Equal(race.Id(0), next.Duel!.Traveller);
        Assert.Equal(race.Id(2), next.Duel.DeskHolder);
    }

    [Fact]
    public async Task Given_the_traveller_away_for_30_seconds_in_a_race_of_three_then_the_desk_holder_travels_on_and_nobody_sits_down()
    {
        // Given the host travelling against Nia at desk 2, and Pip at desk 3
        await using var race = await RaceAsync("zuri", "nia", "pip");
        await LoseAsync(race, 0);

        // When the host is away for 30 seconds
        await PassAsync(SpotHeld);

        // Then Nia travels on from desk 2 towards Pip, and desk 2 stays empty (L2-029 criterion 4)
        var removed = await race.Hubs[1].WaitForGameAsync("the host removed", game => game.Player(race.Entries[0].PlayerId).Removed);
        Assert.Equal(race.Id(1), removed.Traveller);
        Assert.Equal(3, removed.TravellerDesk);
        Assert.Null(removed.Desks[1]);
        Assert.Equal(1, removed.Player(race.Entries[1].PlayerId).Distance);

        // And Nia, who joined first after the host, is now the host
        var room = await race.Hubs[1].WaitForAsync("the host gone", state => state.Players.All(player => player.Id != race.Entries[0].PlayerId));
        Assert.True(room.Players.Single(player => player.Id == race.Entries[1].PlayerId).Host);
    }

    [Fact]
    public async Task Given_a_waiting_room_when_players_are_away_for_30_seconds_then_they_leave_it_and_the_last_one_deletes_it()
    {
        // Given the host and a friend waiting in the Lobby
        using var http = api.CreateClient();
        var host = await RoomRequests.MakeAsync(http, "kenji", 2, 2);
        var friend = await RoomRequests.JoinAsync(http, host.Code, "pip", 3, 3);
        await using var hostHub = await RoomHubClient.ConnectAsync(api, host.Token);
        await using var friendHub = await RoomHubClient.ConnectAsync(api, friend.Token);
        // The friend's snapshot can arrive before the host has finished connecting.
        // Wait for both server-side reconnect handlers before simulating a dropped host.
        await api.HandledForAsync("ReconnectCommand", host.Token);
        await api.HandledForAsync("ReconnectCommand", friend.Token);
        await friendHub.WaitForAsync("two players", state => state.Players.Count == 2);

        // When the host's connection is lost for 30 seconds
        var lost = api.HandledForAsync("MarkPlayerAwayCommand", host.Token);
        await hostHub.Connection.StopAsync(Cancel);
        await lost;
        await PassAsync(SpotHeld);

        // Then the friend is alone in the room, and its host (L2-029 criterion 6, L2-025 criterion 5)
        var alone = await friendHub.WaitForAsync("the friend alone", state => state.Players.Count == 1);
        Assert.True(alone.Players[0].Host);

        // And when the friend's connection is lost for 30 seconds too, the room is gone (L2-046 2)
        lost = api.HandledForAsync("MarkPlayerAwayCommand", friend.Token);
        await friendHub.Connection.StopAsync(Cancel);
        await lost;
        await PassAsync(SpotHeld);
        await using var scope = api.Services.CreateAsyncScope();
        var store = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.False(await store.Rooms.AnyAsync(room => room.Code.Value == host.Code, Cancel));
    }

    /// <summary>Loses the player's connection, as a dropped network does, and waits until the server has noticed.</summary>
    private async Task LoseAsync(Race race, int player)
    {
        var noticed = api.HandledForAsync("MarkPlayerAwayCommand", race.Entries[player].Token);
        await race.Hubs[player].Connection.StopAsync(Cancel);
        await noticed;
    }

    /// <summary>Moves the clock on and waits until the absent players have been swept at that time.</summary>
    private async Task PassAsync(TimeSpan time)
    {
        api.Clock.Advance(time);
        await api.HandledAtAsync("RemoveAbsentPlayersCommand", api.Clock.GetUtcNow());
    }

    private async Task<int> CountPlayersAsync(string code)
    {
        await using var scope = api.Services.CreateAsyncScope();
        var store = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return (await store.Rooms.SingleAsync(room => room.Code.Value == code, Cancel)).Players.Count;
    }

    /// <summary>A race of the kids, the first the host, each on their own connection, at its first card.</summary>
    private async Task<Race> RaceAsync(params string[] kids)
    {
        using var http = api.CreateClient();
        var host = await RoomRequests.MakeAsync(http, kids[0], 0, 0);
        List<RoomEntryBody> entries = [host];
        for (var index = 1; index < kids.Length; index++)
        {
            entries.Add(await RoomRequests.JoinAsync(http, host.Code, kids[index], index, index));
        }

        List<RoomHubClient> hubs = [];
        foreach (var entry in entries)
        {
            hubs.Add(await RoomHubClient.ConnectAsync(api, entry.Token));
        }

        await hubs[^1].WaitForAsync("every player", state => state.Players.Count == kids.Length);
        await hubs[0].Connection.InvokeAsync("StartGame", Cancel);
        await hubs[^1].WaitForGameAsync("the game starting", game => game.Phase == "starting");
        await api.PassAsync(RoomGame.FirstCardAfter);
        await hubs[^1].WaitForGameAsync("the first card", game => game.Duel is not null);
        return new Race(host.Code, entries, hubs);
    }

    private sealed record Race(string Code, IReadOnlyList<RoomEntryBody> Entries, IReadOnlyList<RoomHubClient> Hubs) : IAsyncDisposable
    {
        public string Id(int player) => Entries[player].PlayerId.ToString();

        public async ValueTask DisposeAsync()
        {
            foreach (var hub in Hubs)
            {
                await hub.DisposeAsync();
            }
        }
    }
}

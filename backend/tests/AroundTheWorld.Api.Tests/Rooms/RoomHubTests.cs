using AroundTheWorld.Api.Tests.Support;
using AroundTheWorld.Infrastructure.Persistence;
using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.SignalR.Client;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace AroundTheWorld.Api.Tests.Rooms;

/// <summary>
/// L2-024 criterion 2, L2-025 criterion 5, L2-043 criteria 1 to 3, L2-044 criterion 2: every
/// Lobby in a room hears each join and leave over the room hub, and only a room's own player
/// may connect to it (docs/detailed-designs/rooms/wait-in-lobby/,
/// docs/detailed-designs/rooms/guard-room/). Real SignalR clients on the test server.
/// </summary>
public sealed class RoomHubTests(ApiFixture api) : IClassFixture<ApiFixture>
{
    private static CancellationToken Cancel => TestContext.Current.CancellationToken;

    [Fact]
    public async Task Given_a_player_with_their_token_when_they_connect_then_they_receive_the_room_as_it_stands()
    {
        // Given a host and a friend in a room
        using var http = api.CreateClient();
        var host = await RoomRequests.MakeAsync(http, "zuri", 0, 0);
        var friend = await RoomRequests.JoinAsync(http, host.Code, "nia", 8, 4);

        // When the friend connects with their token
        await using var hub = await RoomHubClient.ConnectAsync(api, friend.Token);

        // Then they receive the room: the code, waiting, and both players, with no token in it
        var room = await hub.WaitForAsync("two players", state => state.Players.Count == 2);
        Assert.Equal(host.Code, room.Code);
        Assert.Equal("waiting", room.Status);
        Assert.Equal([host.PlayerId, friend.PlayerId], room.Players.Select(player => player.Id));
    }

    [Fact]
    public async Task Given_a_host_in_the_lobby_when_a_friend_joins_then_the_host_hears_it_without_asking()
    {
        // Given a host whose Lobby is connected
        using var http = api.CreateClient();
        var host = await RoomRequests.MakeAsync(http, "zuri", 0, 0);
        await using var hostHub = await RoomHubClient.ConnectAsync(api, host.Token);
        await hostHub.WaitForAsync("the host alone", state => state.Players.Count == 1);

        // When a friend joins with the code
        var friend = await RoomRequests.JoinAsync(http, host.Code, "pip", 2, 3);

        // Then the host's Lobby receives the room with the friend in it (L2-024 criterion 2)
        var room = await hostHub.WaitForAsync("the friend in it", state => state.Players.Any(player => player.Id == friend.PlayerId));
        Assert.Equal("pip", room.Players[1].Kid);
        Assert.Equal(new NicknameBody(2, 3), room.Players[1].Nickname);
    }

    [Fact]
    public async Task Given_a_friend_in_the_lobby_when_they_leave_then_the_others_hear_it_and_the_room_no_longer_holds_them()
    {
        // Given a host and a friend whose Lobbies are connected
        using var http = api.CreateClient();
        var host = await RoomRequests.MakeAsync(http);
        var friend = await RoomRequests.JoinAsync(http, host.Code);
        await using var hostHub = await RoomHubClient.ConnectAsync(api, host.Token);
        await using var friendHub = await RoomHubClient.ConnectAsync(api, friend.Token);
        await hostHub.WaitForAsync("two players", state => state.Players.Count == 2);

        // When the friend leaves
        await friendHub.Connection.InvokeAsync("LeaveRoom", Cancel);

        // Then the host hears the room without them, and the host is still the host
        var room = await hostHub.WaitForAsync("the host alone", state => state.Players.Count == 1);
        Assert.Equal(host.PlayerId, room.Players[0].Id);
        Assert.True(room.Players[0].Host);
        Assert.Equal(1, await CountPlayersAsync(host.Code));
    }

    [Fact]
    public async Task Given_the_host_leaves_before_the_start_when_friends_remain_then_the_earliest_joiner_is_the_host()
    {
        // Given a host and two friends, the first of whom joined earliest
        using var http = api.CreateClient();
        var host = await RoomRequests.MakeAsync(http);
        var earliest = await RoomRequests.JoinAsync(http, host.Code, "nia", 1, 1);
        api.Clock.Advance(TimeSpan.FromSeconds(5));
        var later = await RoomRequests.JoinAsync(http, host.Code, "milo", 2, 2);
        await using var hostHub = await RoomHubClient.ConnectAsync(api, host.Token);
        await using var earliestHub = await RoomHubClient.ConnectAsync(api, earliest.Token);
        await earliestHub.WaitForAsync("three players", state => state.Players.Count == 3);

        // When the host leaves
        await hostHub.Connection.InvokeAsync("LeaveRoom", Cancel);

        // Then the friend who joined earliest is the host now (L2-025 criterion 5)
        var room = await earliestHub.WaitForAsync("two players", state => state.Players.Count == 2);
        Assert.True(room.Players.Single(player => player.Id == earliest.PlayerId).Host);
        Assert.False(room.Players.Single(player => player.Id == later.PlayerId).Host);
    }

    [Fact]
    public async Task Given_the_last_player_when_they_leave_then_the_room_is_gone_from_the_store()
    {
        using var http = api.CreateClient();
        var host = await RoomRequests.MakeAsync(http);
        await using var hub = await RoomHubClient.ConnectAsync(api, host.Token);
        await hub.WaitForAsync("the host alone", state => state.Players.Count == 1);

        await hub.Connection.InvokeAsync("LeaveRoom", Cancel);

        await using var scope = api.Services.CreateAsyncScope();
        var store = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.False(await store.Rooms.AnyAsync(room => room.Code.Value == host.Code, Cancel));
    }

    [Theory]
    [InlineData("")]
    [InlineData("not-a-token-the-server-gave")]
    public async Task Given_a_token_that_names_no_player_when_a_connection_presents_it_then_it_is_closed_and_hears_nothing(string token)
    {
        // Given a room
        using var http = api.CreateClient();
        await RoomRequests.MakeAsync(http);

        // When a connection presents a token the server never gave
        await using var hub = await RoomHubClient.ConnectAsync(api, token);

        // Then it is closed, and nothing about any room reached it (L2-043 criteria 2 and 3)
        await hub.ClosedAsync();
        Assert.Empty(hub.Received());
    }

    [Fact]
    public async Task Given_a_player_who_left_when_they_send_another_message_then_it_is_refused_with_not_in_room()
    {
        using var http = api.CreateClient();
        var host = await RoomRequests.MakeAsync(http);
        var friend = await RoomRequests.JoinAsync(http, host.Code);
        await using var friendHub = await RoomHubClient.ConnectAsync(api, friend.Token);
        await friendHub.Connection.InvokeAsync("LeaveRoom", Cancel);

        var refused = await Assert.ThrowsAsync<HubException>(() => friendHub.Connection.InvokeAsync("LeaveRoom", Cancel));

        Assert.Contains("not_in_room", refused.Message, StringComparison.Ordinal);
        Assert.DoesNotContain("Exception", refused.Message.Replace("HubException", string.Empty, StringComparison.Ordinal), StringComparison.Ordinal);
    }

    [Fact]
    public async Task Given_a_message_larger_than_1_KB_when_it_arrives_then_the_connection_refuses_it()
    {
        using var http = api.CreateClient();
        var host = await RoomRequests.MakeAsync(http);
        await using var hub = await RoomHubClient.ConnectAsync(api, host.Token);
        await hub.WaitForAsync("the host alone", state => state.Players.Count == 1);

        _ = hub.Connection.SendAsync("LeaveRoom", new string('x', 2048), Cancel);

        await hub.ClosedAsync();
        Assert.Equal(1, await CountPlayersAsync(host.Code));
    }

    private async Task<int> CountPlayersAsync(string code)
    {
        await using var scope = api.Services.CreateAsyncScope();
        var store = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return (await store.Rooms.SingleAsync(room => room.Code.Value == code, Cancel)).Players.Count;
    }
}

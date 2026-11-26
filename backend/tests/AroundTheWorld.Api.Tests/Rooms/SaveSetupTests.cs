using AroundTheWorld.Api.Tests.Support;
using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.SignalR.Client;

namespace AroundTheWorld.Api.Tests.Rooms;

/// <summary>
/// L2-018 criteria 2 to 4, L2-025 criterion 4, L2-043 criterion 2, L2-044 criterion 1: the host
/// saves the game's setup to the room over the room hub and every Lobby shows it; nobody else may,
/// and a setup Game Setup does not offer is refused (docs/detailed-designs/player/set-up-game/,
/// docs/adr/0033-deciding-a-game-on-the-server.md).
/// </summary>
public sealed class SaveSetupTests(ApiFixture api) : IClassFixture<ApiFixture>
{
    private static CancellationToken Cancel => TestContext.Current.CancellationToken;

    private static readonly SetupBody Edited = new(["times", "plus", "minus"], [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 24, "lightning");

    [Fact]
    public async Task Given_a_host_and_a_friend_when_the_host_saves_a_setup_then_every_lobby_shows_it()
    {
        // Given a host and a friend whose Lobbies are connected
        using var http = api.CreateClient();
        var host = await RoomRequests.MakeAsync(http);
        var friend = await RoomRequests.JoinAsync(http, host.Code);
        await using var hostHub = await RoomHubClient.ConnectAsync(api, host.Token);
        await using var friendHub = await RoomHubClient.ConnectAsync(api, friend.Token);
        await friendHub.WaitForAsync("two players", state => state.Players.Count == 2);

        // When the host saves Times, Plus and Minus with every table, 24 desks and Lightning
        await hostHub.Connection.InvokeAsync("SaveSetup", Edited, Cancel);

        // Then the friend's Lobby receives the room with that setup (L2-018 criterion 2)
        var room = await friendHub.WaitForAsync("the edited setup", state => state.Setup.TourLength == 24);
        Assert.Equal(Edited.Kinds, room.Setup.Kinds);
        Assert.Equal(Edited.Tables, room.Setup.Tables);
        Assert.Equal("lightning", room.Setup.CardSpeed);
    }

    [Fact]
    public async Task Given_a_friend_who_is_not_the_host_when_they_save_a_setup_then_it_is_refused_with_not_host()
    {
        using var http = api.CreateClient();
        var host = await RoomRequests.MakeAsync(http);
        var friend = await RoomRequests.JoinAsync(http, host.Code);
        await using var friendHub = await RoomHubClient.ConnectAsync(api, friend.Token);
        await friendHub.WaitForAsync("two players", state => state.Players.Count == 2);

        var refused = await Assert.ThrowsAsync<HubException>(() => friendHub.Connection.InvokeAsync("SaveSetup", Edited, Cancel));

        // L2-025 criterion 4: refused with a code, and the room's setup is unchanged
        Assert.Contains("not_host", refused.Message, StringComparison.Ordinal);
        await using var again = await RoomHubClient.ConnectAsync(api, host.Token);
        var room = await again.WaitForAsync("the room", state => state.Players.Count == 2);
        Assert.Equal(12, room.Setup.TourLength);
    }

    private static readonly SetupBody[] Unoffered =
    [
        new SetupBody(["times"], [2, 3], 7, "normal"),
        new SetupBody(["times"], [2, 3], 12, "slow"),
        new SetupBody([], [2, 3], 12, "normal"),
        new SetupBody(["times", "power"], [2, 3], 12, "normal"),
        new SetupBody(["times", "times"], [2, 3], 12, "normal"),
        new SetupBody(["times"], [], 12, "normal"),
        new SetupBody(["times"], [1, 2], 12, "normal"),
        new SetupBody(["times"], [2, 13], 12, "normal"),
        new SetupBody(["plus"], [2, 2], 12, "normal"),
    ];

    public static TheoryData<int> UnofferedCases() => [.. Enumerable.Range(0, Unoffered.Length)];

    [Theory]
    [MemberData(nameof(UnofferedCases))]
    public async Task Given_a_setup_with_a_value_game_setup_does_not_offer_when_the_host_saves_it_then_it_is_refused_with_invalid_setup(int unoffered)
    {
        var setup = Unoffered[unoffered];
        using var http = api.CreateClient();
        var host = await RoomRequests.MakeAsync(http);
        await using var hostHub = await RoomHubClient.ConnectAsync(api, host.Token);
        await hostHub.WaitForAsync("the host alone", state => state.Players.Count == 1);

        var refused = await Assert.ThrowsAsync<HubException>(() => hostHub.Connection.InvokeAsync("SaveSetup", setup, Cancel));

        // L2-018 criterion 4, L2-044 criterion 1
        Assert.Contains("invalid_setup", refused.Message, StringComparison.Ordinal);
        Assert.All(hostHub.Received(), state => Assert.Equal(12, state.Setup.TourLength));
    }
}

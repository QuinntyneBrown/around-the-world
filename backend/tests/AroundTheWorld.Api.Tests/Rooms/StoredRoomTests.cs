using System.Net.Http.Json;
using AroundTheWorld.Api.Tests.Support;
using AroundTheWorld.Domain.Tours;
using AroundTheWorld.Infrastructure.Persistence;
using Microsoft.AspNetCore.SignalR.Client;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace AroundTheWorld.Api.Tests.Rooms;

/// <summary>
/// L2-046 criteria 1 and 2, L2-040 criterion 1: what the room store holds after a whole game with
/// friends, played through the API and the hub from devices behind the hosting platform's
/// ingress, and that it holds nothing once the room is gone
/// (docs/detailed-designs/platform/keep-children-safe/, docs/adr/0040).
/// </summary>
public sealed class StoredRoomTests(KnownIngressApiFixture api) : IClassFixture<KnownIngressApiFixture>
{
    /// <summary>The device's address, as the ingress forwards it.</summary>
    private const string DeviceAddress = "203.0.113.7";

    /// <summary>The device's browser, as it names itself.</summary>
    private const string DeviceBrowser = "Mozilla/5.0 (Linux; Android 14; Kids Tablet) Chrome/141.0";

    /// <summary>
    /// What a room is stored as, column by column: the code, the setup, the game the server decides
    /// and when it was last active (L2-046 criterion 1), and the row's own keys and version.
    /// </summary>
    private static readonly string[] RoomColumns =
    [
        "Room.Code", "Room.Game", "Room.GameDueAt", "Room.Id", "Room.LastActivityAt", "Room.Status", "Room.Version",
        "GameSetup.Kinds", "GameSetup.RoomId", "GameSetup.Tables", "GameSetup.TourLength", "GameSetup.CardSpeed",
    ];

    /// <summary>
    /// What a player is stored as: the nickname's two indexes, a kid, a position and a connection
    /// token (L2-046 criterion 1), with the host mark, the time of joining, the id of the
    /// connection that last presented the token and when it was lost (docs/adr/0036).
    /// </summary>
    private static readonly string[] PlayerColumns =
    [
        "RoomPlayer.AwaySince", "RoomPlayer.ConnectionId", "RoomPlayer.Id", "RoomPlayer.IsHost", "RoomPlayer.JoinedAt",
        "RoomPlayer.Kid", "RoomPlayer.Position", "RoomPlayer.RoomId", "RoomPlayer.Token",
        "Nickname.Adjective", "Nickname.Animal", "Nickname.RoomPlayerId",
    ];

    private static CancellationToken Cancel => TestContext.Current.CancellationToken;

    [Fact]
    public async Task Given_a_whole_game_with_friends_when_the_store_is_inspected_then_it_holds_the_code_the_setup_and_each_players_indexes_kid_position_and_token_only()
    {
        // Given three friends whose devices name their browser and address, who play a tour of 6
        // desks to the Podium: the host wins every duel and a watching friend sends a sticker
        await using var race = await RaceAsync();
        for (var duel = 1; duel <= 5; duel++)
        {
            var card = await race.HostHub.WaitForGameAsync($"card {duel}", game => game.Duel?.Number == duel && game.Phase == "duel");
            if (duel == 1)
            {
                await race.PipHub.Connection.InvokeAsync("SendSticker", 2, Cancel);
                await race.HostHub.WaitForStickerAsync("Wow! from Pip", sticker => sticker.Sticker == 2);
            }

            await race.HostHub.Connection.InvokeAsync("SubmitAnswer", card.Duel!.Card.Answer(), Cancel);
            await race.HostHub.WaitForGameAsync($"duel {duel} decided", game => game.Duel?.Number == duel && game.Phase is "decided" or "over");
            await api.PassAsync(RoomGame.NextCardAfter);
        }

        await race.HostHub.WaitForGameAsync("the tour over", game => game.Phase == "over");

        // When the store is inspected, every column of every row
        var stored = await StoredAsync();

        // Then the room is its code, its setup and its game, and each player their nickname's
        // indexes, their kid, their position and their token (L2-046 criterion 1)
        Assert.Equal(
            RoomColumns.Concat(PlayerColumns).Order(),
            stored.Select(column => column.Name).Distinct().Order());
        Assert.Equal(3, stored.Count(column => column.Name == "RoomPlayer.Token"));
        Assert.Equal(
            [0, 1, 5],
            stored.Where(column => column.Name == "Nickname.Adjective").Select(column => (int)column.Value!).Order());

        // And nothing about the devices, and no nickname as words: no account, no real name, no
        // address of a device (L2-046 criterion 2, L2-040 criterion 1)
        var text = string.Join('\n', stored.Select(column => column.Value?.ToString()));
        Assert.DoesNotContain(DeviceAddress, text, StringComparison.Ordinal);
        Assert.DoesNotContain("Kids Tablet", text, StringComparison.Ordinal);
        foreach (var word in new[] { "Speedy", "Otter", "Mighty", "Panda", "Brave", "Narwhal" })
        {
            Assert.DoesNotContain(word, text, StringComparison.Ordinal);
        }
    }

    [Fact]
    public async Task Given_a_whole_game_with_friends_when_every_player_leaves_the_podium_then_the_store_holds_nothing_of_it()
    {
        // Given three friends whose tour of 6 desks is over
        await using var race = await RaceAsync();
        for (var duel = 1; duel <= 5; duel++)
        {
            var card = await race.HostHub.WaitForGameAsync($"card {duel}", game => game.Duel?.Number == duel && game.Phase == "duel");
            await race.HostHub.Connection.InvokeAsync("SubmitAnswer", card.Duel!.Card.Answer(), Cancel);
            await race.HostHub.WaitForGameAsync($"duel {duel} decided", game => game.Duel?.Number == duel && game.Phase is "decided" or "over");
            await api.PassAsync(RoomGame.NextCardAfter);
        }

        await race.HostHub.WaitForGameAsync("the tour over", game => game.Phase == "over");

        // When each of them leaves the Podium
        await race.HostHub.Connection.InvokeAsync("LeaveRoom", Cancel);
        await race.FriendHub.Connection.InvokeAsync("LeaveRoom", Cancel);
        await race.PipHub.Connection.InvokeAsync("LeaveRoom", Cancel);

        // Then the store holds no row of the room, nor of any of its players (L2-046 criterion 2)
        Assert.DoesNotContain(await StoredAsync(), column => column.Value is string value && value == race.Code);
        await using var scope = api.Services.CreateAsyncScope();
        var store = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.False(await store.Rooms.AnyAsync(room => room.Code.Value == race.Code, Cancel));
        Assert.False(await store.Set<Domain.Rooms.RoomPlayer>().AnyAsync(player => race.Players.Contains(player.Id), Cancel));
    }

    /// <summary>
    /// Every column of every row of the store, as the store holds it: each value through the
    /// converter that writes it, so the game is its JSON.
    /// </summary>
    private async Task<List<(string Name, object? Value)>> StoredAsync()
    {
        await using var scope = api.Services.CreateAsyncScope();
        var store = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await store.Rooms.LoadAsync(Cancel);
        return store.ChangeTracker.Entries()
            .SelectMany(entry => entry.Properties.Select(property =>
            {
                var converter = property.Metadata.GetTypeMapping().Converter;
                var value = property.CurrentValue is { } current && converter is not null
                    ? converter.ConvertToProvider(current)
                    : property.CurrentValue;
                return ($"{entry.Metadata.ClrType.Name}.{property.Metadata.Name}", value);
            }))
            .ToList();
    }

    private async Task<Race> RaceAsync()
    {
        using var http = api.CreateClient();
        http.DefaultRequestHeaders.Add("X-Forwarded-For", DeviceAddress);
        http.DefaultRequestHeaders.UserAgent.ParseAdd(DeviceBrowser);
        var host = await RoomRequests.MakeAsync(http, "zuri", 0, 0);
        var friend = await RoomRequests.JoinAsync(http, host.Code, "nia", 1, 1);
        var pip = await RoomRequests.JoinAsync(http, host.Code, "pip", 5, 5);
        var hostHub = await RoomHubClient.ConnectAsync(api, host.Token);
        var friendHub = await RoomHubClient.ConnectAsync(api, friend.Token);
        var pipHub = await RoomHubClient.ConnectAsync(api, pip.Token);
        await pipHub.WaitForAsync("three players", state => state.Players.Count == 3);
        await hostHub.Connection.InvokeAsync("SaveSetup", new SetupBody(["times"], [2, 3, 4, 5], 6, "normal"), Cancel);
        await hostHub.Connection.InvokeAsync("StartGame", Cancel);
        await pipHub.WaitForGameAsync("the game starting", game => game.Phase == "starting");
        await api.PassAsync(RoomGame.FirstCardAfter);
        await pipHub.WaitForGameAsync("the first card", game => game.Duel is not null);
        return new Race(host.Code, [host.PlayerId, friend.PlayerId, pip.PlayerId], hostHub, friendHub, pipHub);
    }

    private sealed record Race(string Code, Guid[] Players, RoomHubClient HostHub, RoomHubClient FriendHub, RoomHubClient PipHub) : IAsyncDisposable
    {
        public async ValueTask DisposeAsync()
        {
            await HostHub.DisposeAsync();
            await FriendHub.DisposeAsync();
            await PipHub.DisposeAsync();
        }
    }
}

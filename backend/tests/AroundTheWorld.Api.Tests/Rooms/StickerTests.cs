using AroundTheWorld.Api.Tests.Support;
using AroundTheWorld.Domain.Tours;
using Microsoft.AspNetCore.SignalR.Client;

namespace AroundTheWorld.Api.Tests.Rooms;

/// <summary>
/// L2-028 criteria 3, 4 and 5, L2-040 criterion 1: a watching player sends a sticker as its id,
/// and every player of the room is sent it with the sender; the server ignores an id that is not
/// one of the six and a sticker from a player in the duel, and drops stickers sent faster than one
/// a second (docs/detailed-designs/rooms/watch-duel-and-send-sticker/, docs/adr/0035).
/// </summary>
public sealed class StickerTests(ApiFixture api) : IClassFixture<ApiFixture>
{
    private static CancellationToken Cancel => TestContext.Current.CancellationToken;

    [Fact]
    public async Task Given_a_watching_player_when_they_send_a_sticker_then_every_player_of_the_room_is_sent_its_id_and_the_sender()
    {
        // Given the host travelling against the friend at desk 2, and Pip at desk 3 watching
        await using var race = await RaceAsync();

        // When Pip sends "Wow!", sticker 2
        await race.PipHub.Connection.InvokeAsync("SendSticker", 2, Cancel);

        // Then every player of the room, Pip included, is sent sticker 2 from Pip (L2-028 3)
        var expected = new StickerShownBody(2, race.Pip);
        Assert.Equal(expected, await race.HostHub.WaitForStickerAsync("2 from Pip", sticker => sticker == expected));
        Assert.Equal(expected, await race.FriendHub.WaitForStickerAsync("2 from Pip", sticker => sticker == expected));
        Assert.Equal(expected, await race.PipHub.WaitForStickerAsync("2 from Pip", sticker => sticker == expected));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(7)]
    [InlineData(-1)]
    public async Task Given_a_watching_player_when_they_send_an_id_that_is_not_one_of_the_six_then_the_server_ignores_it(int id)
    {
        await using var race = await RaceAsync();

        // When Pip sends an id that is not a sticker, then a second later "Go!", sticker 1
        await race.PipHub.Connection.InvokeAsync("SendSticker", id, Cancel);
        await api.PassAsync(TimeSpan.FromSeconds(1));
        await race.PipHub.Connection.InvokeAsync("SendSticker", 1, Cancel);

        // Then the room is sent "Go!" only, and no error (L2-028 criterion 4)
        await race.HostHub.WaitForStickerAsync("1 from Pip", sticker => sticker.Sticker == 1);
        Assert.Equal([new StickerShownBody(1, race.Pip)], race.HostHub.Stickers());
    }

    [Fact]
    public async Task Given_a_player_in_the_duel_when_they_send_a_sticker_then_the_server_ignores_it()
    {
        await using var race = await RaceAsync();

        // When the friend, the desk holder, and the host, the traveller, send stickers, then Pip does
        await race.FriendHub.Connection.InvokeAsync("SendSticker", 3, Cancel);
        await race.HostHub.Connection.InvokeAsync("SendSticker", 4, Cancel);
        await race.PipHub.Connection.InvokeAsync("SendSticker", 5, Cancel);

        // Then the room is sent Pip's only (L2-028 criterion 4)
        await race.FriendHub.WaitForStickerAsync("5 from Pip", sticker => sticker.Sticker == 5);
        Assert.Equal([new StickerShownBody(5, race.Pip)], race.FriendHub.Stickers());
    }

    [Fact]
    public async Task Given_a_room_whose_game_has_not_started_when_a_player_sends_a_sticker_then_the_server_ignores_it()
    {
        using var http = api.CreateClient();
        var host = await RoomRequests.MakeAsync(http, "zuri", 0, 0);
        var friend = await RoomRequests.JoinAsync(http, host.Code, "nia", 8, 4);
        await using var hostHub = await RoomHubClient.ConnectAsync(api, host.Token);
        await using var friendHub = await RoomHubClient.ConnectAsync(api, friend.Token);
        await hostHub.WaitForAsync("two players", state => state.Players.Count == 2);

        // When the friend sends a sticker in the Lobby, then the race starts
        await friendHub.Connection.InvokeAsync("SendSticker", 1, Cancel);
        await hostHub.Connection.InvokeAsync("StartGame", Cancel);
        await hostHub.WaitForGameAsync("the game starting", game => game.Phase == "starting");

        // Then no sticker was sent (L2-028 criterion 4: stickers belong to a game being played)
        Assert.Empty(hostHub.Stickers());
    }

    [Fact]
    public async Task Given_a_watching_player_when_they_send_stickers_faster_than_one_a_second_then_the_server_drops_the_extra_ones()
    {
        await using var race = await RaceAsync();

        // When Pip sends three stickers at once, then one 999 ms later, then one a second after the first
        await race.PipHub.Connection.InvokeAsync("SendSticker", 1, Cancel);
        await race.PipHub.Connection.InvokeAsync("SendSticker", 2, Cancel);
        await race.PipHub.Connection.InvokeAsync("SendSticker", 3, Cancel);
        await api.PassAsync(TimeSpan.FromMilliseconds(999));
        await race.PipHub.Connection.InvokeAsync("SendSticker", 4, Cancel);
        await api.PassAsync(TimeSpan.FromMilliseconds(1));
        await race.PipHub.Connection.InvokeAsync("SendSticker", 5, Cancel);

        // Then the room is sent the first and the last only, with no error (L2-028 criterion 5)
        await race.HostHub.WaitForStickerAsync("5 from Pip", sticker => sticker.Sticker == 5);
        Assert.Equal([new StickerShownBody(1, race.Pip), new StickerShownBody(5, race.Pip)], race.HostHub.Stickers());
    }

    /// <summary>A host, a friend and Pip in a started race, all connected, with the first card dealt.</summary>
    private async Task<Race> RaceAsync()
    {
        using var http = api.CreateClient();
        var host = await RoomRequests.MakeAsync(http, "zuri", 0, 0);
        var friend = await RoomRequests.JoinAsync(http, host.Code, "nia", 8, 4);
        var pip = await RoomRequests.JoinAsync(http, host.Code, "pip", 5, 5);
        var hostHub = await RoomHubClient.ConnectAsync(api, host.Token);
        var friendHub = await RoomHubClient.ConnectAsync(api, friend.Token);
        var pipHub = await RoomHubClient.ConnectAsync(api, pip.Token);
        await pipHub.WaitForAsync("three players", state => state.Players.Count == 3);
        await hostHub.Connection.InvokeAsync("StartGame", Cancel);
        await pipHub.WaitForGameAsync("the game starting", game => game.Phase == "starting");
        await api.PassAsync(RoomGame.FirstCardAfter);
        foreach (var hub in new[] { hostHub, friendHub, pipHub })
        {
            await hub.WaitForGameAsync("the first card", game => game.Duel is not null);
        }

        return new Race(pip.PlayerId, hostHub, friendHub, pipHub);
    }

    private sealed record Race(Guid PipId, RoomHubClient HostHub, RoomHubClient FriendHub, RoomHubClient PipHub) : IAsyncDisposable
    {
        public string Pip => PipId.ToString();

        public async ValueTask DisposeAsync()
        {
            await HostHub.DisposeAsync();
            await FriendHub.DisposeAsync();
            await PipHub.DisposeAsync();
        }
    }
}

using System.Net;
using System.Net.Http.Json;
using AroundTheWorld.Api.Tests.Support;
using AroundTheWorld.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace AroundTheWorld.Api.Tests.Rooms;

/// <summary>
/// L2-023 criteria 3 to 6 and 8, L2-024 criterion 3, L2-043 criterion 1, L2-044 criteria 1 and
/// 2: a friend joins a room with its code through the API (docs/detailed-designs/rooms/join-room/).
/// </summary>
public sealed class JoinRoomTests(ApiFixture api) : IClassFixture<ApiFixture>
{
    private static CancellationToken Cancel => TestContext.Current.CancellationToken;

    [Fact]
    public async Task Given_a_waiting_room_when_a_friend_joins_with_its_code_then_they_are_in_it_with_a_token_of_their_own()
    {
        // Given a waiting room whose host is Zuri
        using var client = api.CreateClient();
        var host = await RoomRequests.MakeAsync(client, "zuri", 0, 0);

        // When a friend joins with its code as Nia
        using var response = await client.PostAsJsonAsync(RoomRequests.JoinPath, RoomRequests.Join(host.Code, "nia", 8, 4), Cancel);

        // Then they are in the room, after the host, with a token of their own (L2-023 3, L2-043 1)
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var entry = await response.Content.ReadFromJsonAsync<RoomEntryBody>(Cancel);
        Assert.NotNull(entry);
        Assert.Equal(host.Code, entry.Code);
        Assert.Matches("^[A-Za-z0-9_-]{43}$", entry.Token);
        Assert.NotEqual(host.Token, entry.Token);
        Assert.Equal(2, entry.Room.Players.Count);
        var (first, joined) = (entry.Room.Players[0], entry.Room.Players[1]);
        Assert.Equal(host.PlayerId, first.Id);
        Assert.True(first.Host);
        Assert.Equal(entry.PlayerId, joined.Id);
        Assert.False(joined.Host);
        Assert.Equal("nia", joined.Kid);
        Assert.Equal(new NicknameBody(8, 4), joined.Nickname);
        Assert.Equal(1, joined.Position);
    }

    [Fact]
    public async Task Given_a_code_typed_in_lower_case_when_a_friend_joins_then_it_matches_the_room_of_those_letters_in_capitals()
    {
        using var client = api.CreateClient();
        var host = await RoomRequests.MakeAsync(client);

        using var response = await client.PostAsJsonAsync(RoomRequests.JoinPath, RoomRequests.Join(host.Code.ToLowerInvariant(), "pip", 2, 2), Cancel);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(host.Code, (await response.Content.ReadFromJsonAsync<RoomEntryBody>(Cancel))!.Code);
    }

    [Fact]
    public async Task Given_two_friends_with_the_same_kid_when_they_join_then_both_are_that_kid_with_their_own_nicknames()
    {
        using var client = api.CreateClient();
        var host = await RoomRequests.MakeAsync(client, "kenji", 0, 0);

        var second = await RoomRequests.JoinAsync(client, host.Code, "kenji", 3, 4);

        Assert.Equal(["kenji", "kenji"], second.Room.Players.Select(player => player.Kid));
        Assert.Equal([new NicknameBody(0, 0), new NicknameBody(3, 4)], second.Room.Players.Select(player => player.Nickname));
    }

    [Fact]
    public async Task Given_a_code_no_room_holds_when_a_friend_joins_then_it_is_refused_with_room_not_found()
    {
        using var client = api.CreateClient();

        using var response = await client.PostAsJsonAsync(RoomRequests.JoinPath, RoomRequests.Join("QQQQ", "nia", 0, 0), Cancel);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        await Problems.AssertCodeAsync(response, "room_not_found");
    }

    [Fact]
    public async Task Given_a_room_with_8_players_when_another_friend_joins_then_it_is_refused_with_room_full_and_the_room_is_unchanged()
    {
        // Given a room with 8 players
        using var client = api.CreateClient();
        var host = await RoomRequests.MakeAsync(client);
        for (var friend = 1; friend < 8; friend++)
        {
            await RoomRequests.JoinAsync(client, host.Code, "milo", friend, friend);
        }

        // When another friend joins
        using var response = await client.PostAsJsonAsync(RoomRequests.JoinPath, RoomRequests.Join(host.Code, "pip", 9, 9), Cancel);

        // Then it is refused, and the room still holds 8 (L2-023 criterion 5)
        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        await Problems.AssertCodeAsync(response, "room_full");
        Assert.Equal(8, await CountPlayersAsync(host.Code));
    }

    [Fact]
    public async Task Given_a_room_of_7_that_another_friend_joins_while_a_join_is_saved_when_the_store_refuses_the_save_then_the_join_is_refused_with_room_full()
    {
        // Given a room with 7 players
        using var client = api.CreateClient();
        var host = await RoomRequests.MakeAsync(client);
        for (var friend = 1; friend < 7; friend++)
        {
            await RoomRequests.JoinAsync(client, host.Code, "milo", friend, friend);
        }

        // And a store in which another friend's join is saved just before this one, so the store
        // refuses this one's save as a whole, as the room store does (one unit of work)
        using var racing = api.WithFirstSaveRacedBy(async store =>
        {
            var room = await store.Rooms.SingleAsync(r => r.Code.Value == host.Code, Cancel);
            room.Join(Domain.Rooms.KidId.Pip, new Domain.Rooms.Nickname(7, 7), api.Clock.GetUtcNow());
            await store.SaveChangesAsync(Cancel);
        });
        using var racingClient = racing.CreateClient();

        // When this friend's join is saved
        using var response = await racingClient.PostAsJsonAsync(RoomRequests.JoinPath, RoomRequests.Join(host.Code, "nia", 8, 8), Cancel);

        // Then the store refuses it, the join is tried on the room as it now stands, and it is full
        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        await Problems.AssertCodeAsync(response, "room_full");
        Assert.Equal(8, await CountPlayersAsync(host.Code));
    }

    [Fact]
    public async Task Given_a_room_whose_game_has_started_when_a_friend_joins_then_it_is_refused_with_game_started()
    {
        // Given a room of two whose host has started the game
        using var client = api.CreateClient();
        var host = await RoomRequests.MakeAsync(client);
        await RoomRequests.JoinAsync(client, host.Code);
        await StartAsync(host.Code);

        // When another friend joins
        using var response = await client.PostAsJsonAsync(RoomRequests.JoinPath, RoomRequests.Join(host.Code, "pip", 2, 2), Cancel);

        // Then it is refused (L2-023 criterion 6)
        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        await Problems.AssertCodeAsync(response, "game_started");
        Assert.Equal(2, await CountPlayersAsync(host.Code));
    }

    [Fact]
    public async Task Given_a_friend_joins_when_the_store_is_inspected_then_the_room_was_last_active_at_the_join()
    {
        using var client = api.CreateClient();
        var host = await RoomRequests.MakeAsync(client);
        api.Clock.Advance(TimeSpan.FromMinutes(4));

        await RoomRequests.JoinAsync(client, host.Code);

        await using var scope = api.Services.CreateAsyncScope();
        var store = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var room = await store.Rooms.SingleAsync(r => r.Code.Value == host.Code, Cancel);
        Assert.Equal(api.Clock.GetUtcNow(), room.LastActivityAt);
    }

    [Theory]
    [InlineData("BOL", "nia", 0, 0, "invalid_code")]
    [InlineData("BOLTS", "nia", 0, 0, "invalid_code")]
    [InlineData("B0LT", "nia", 0, 0, "invalid_code")]
    [InlineData("", "nia", 0, 0, "invalid_code")]
    [InlineData("BOLT", "bolt", 0, 0, "invalid_kid")]
    [InlineData("BOLT", "nia", 10, 0, "invalid_nickname")]
    [InlineData("BOLT", "nia", 0, -1, "invalid_nickname")]
    public async Task Given_a_code_kid_or_nickname_outside_what_the_game_offers_when_a_friend_joins_then_it_is_refused_with_a_code(
        string code, string kid, int adjective, int animal, string refusal)
    {
        using var client = api.CreateClient();

        using var response = await client.PostAsJsonAsync(RoomRequests.JoinPath, RoomRequests.Join(code, kid, adjective, animal), Cancel);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        await Problems.AssertCodeAsync(response, refusal);
    }

    [Fact]
    public async Task Given_a_join_larger_than_1_KB_when_it_arrives_then_it_is_refused_before_anything_changes()
    {
        using var client = api.CreateClient();
        var host = await RoomRequests.MakeAsync(client);
        var padding = new string(' ', 1100);
        using var content = new StringContent(
            $"{{\"code\": \"{host.Code}\",{padding}\"kid\": \"nia\", \"nickname\": {{\"adjective\": 0, \"animal\": 0}}}}",
            System.Text.Encoding.UTF8,
            "application/json");

        using var response = await client.PostAsync(new Uri(RoomRequests.JoinPath, UriKind.Relative), content, Cancel);

        Assert.Equal(HttpStatusCode.RequestEntityTooLarge, response.StatusCode);
        Assert.Equal(1, await CountPlayersAsync(host.Code));
    }

    private async Task<int> CountPlayersAsync(string code)
    {
        await using var scope = api.Services.CreateAsyncScope();
        var store = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return (await store.Rooms.SingleAsync(room => room.Code.Value == code, Cancel)).Players.Count;
    }

    /// <summary>
    /// Starts the room's game as its host would. Starting is journey 14's hub method; until it
    /// is built, the domain's rule seeds a room that is playing.
    /// </summary>
    private async Task StartAsync(string code)
    {
        await using var scope = api.Services.CreateAsyncScope();
        var store = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var room = await store.Rooms.SingleAsync(r => r.Code.Value == code, Cancel);
        room.Start(room.Players.Single(player => player.IsHost), api.Clock.GetUtcNow());
        await store.SaveChangesAsync(Cancel);
    }
}

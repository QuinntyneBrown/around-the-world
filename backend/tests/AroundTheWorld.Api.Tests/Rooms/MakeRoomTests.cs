using System.Net;
using System.Net.Http.Json;
using AroundTheWorld.Api.Tests.Support;
using AroundTheWorld.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace AroundTheWorld.Api.Tests.Rooms;

/// <summary>
/// L2-022 criteria 1 and 2, L2-043 criterion 1, L2-044 criteria 1 to 3, L2-046 criterion 1:
/// a host makes a room through the API (docs/detailed-designs/rooms/make-room/).
/// </summary>
public sealed class MakeRoomTests(ApiFixture api) : IClassFixture<ApiFixture>
{
    private static CancellationToken Cancel => TestContext.Current.CancellationToken;

    [Fact]
    public async Task Given_a_kid_and_a_nickname_when_a_room_is_made_then_it_has_a_code_a_token_and_the_child_as_its_host()
    {
        // Given a kid and a nickname
        using var client = api.CreateClient();

        // When a room is made
        using var response = await client.PostAsJsonAsync(RoomRequests.Path, RoomRequests.Make("nia", 8, 4), Cancel);

        // Then it answers 201 with the room's code, the host's token and the room as it stands
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var entry = await response.Content.ReadFromJsonAsync<RoomEntryBody>(Cancel);
        Assert.NotNull(entry);
        Assert.Matches("^[A-Z]{4}$", entry.Code);
        Assert.Matches("^[A-Za-z0-9_-]{43}$", entry.Token);
        Assert.Equal(entry.Code, entry.Room.Code);
        Assert.Equal("waiting", entry.Room.Status);
        Assert.Equal(["times"], entry.Room.Setup.Kinds);
        Assert.Equal([2, 3, 4, 5, 6, 7, 8, 9, 10], entry.Room.Setup.Tables);
        Assert.Equal(12, entry.Room.Setup.TourLength);
        Assert.Equal("normal", entry.Room.Setup.CardSpeed);
        var host = Assert.Single(entry.Room.Players);
        Assert.Equal(entry.PlayerId, host.Id);
        Assert.Equal("nia", host.Kid);
        Assert.Equal(new NicknameBody(8, 4), host.Nickname);
        Assert.Equal(0, host.Position);
        Assert.True(host.Host);
    }

    [Fact]
    public async Task Given_a_room_is_made_when_the_store_is_inspected_then_it_holds_the_code_the_setup_and_the_players_indexes_kid_position_and_token()
    {
        // Given a room is made
        using var client = api.CreateClient();
        using var response = await client.PostAsJsonAsync(RoomRequests.Path, RoomRequests.Make("pip", 1, 2), Cancel);
        var entry = await response.Content.ReadFromJsonAsync<RoomEntryBody>(Cancel);

        // When the store is inspected
        await using var scope = api.Services.CreateAsyncScope();
        var store = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var room = await store.Rooms.Include(r => r.Players).SingleAsync(r => r.Code.Value == entry!.Code, Cancel);

        // Then the player is the nickname's indexes, the kid, the position and the token, and nothing more
        var player = Assert.Single(room.Players);
        Assert.Equal(1, player.Nickname.Adjective);
        Assert.Equal(2, player.Nickname.Animal);
        Assert.Equal(entry!.Token, player.Token.Value);
        Assert.Equal(api.Clock.GetUtcNow(), room.LastActivityAt);
    }

    [Fact]
    public async Task Given_two_rooms_when_they_are_made_then_their_codes_and_tokens_differ()
    {
        using var client = api.CreateClient();

        using var first = await client.PostAsJsonAsync(RoomRequests.Path, RoomRequests.Make("zuri", 0, 0), Cancel);
        using var second = await client.PostAsJsonAsync(RoomRequests.Path, RoomRequests.Make("zuri", 0, 0), Cancel);

        var one = await first.Content.ReadFromJsonAsync<RoomEntryBody>(Cancel);
        var two = await second.Content.ReadFromJsonAsync<RoomEntryBody>(Cancel);
        Assert.NotEqual(one!.Code, two!.Code);
        Assert.NotEqual(one.Token, two.Token);
    }

    [Theory]
    [InlineData("bolt", 0, 0, "invalid_kid")]
    [InlineData("", 0, 0, "invalid_kid")]
    [InlineData("Zuri", 0, 0, "invalid_kid")]
    [InlineData("zuri", -1, 0, "invalid_nickname")]
    [InlineData("zuri", 10, 0, "invalid_nickname")]
    [InlineData("zuri", 0, 10, "invalid_nickname")]
    public async Task Given_a_kid_or_a_nickname_outside_their_lists_when_a_room_is_asked_for_then_it_is_refused_with_a_code_and_nothing_is_made(
        string kid, int adjective, int animal, string code)
    {
        using var client = api.CreateClient();
        var roomsBefore = await CountRoomsAsync();

        using var response = await client.PostAsJsonAsync(RoomRequests.Path, RoomRequests.Make(kid, adjective, animal), Cancel);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        await Problems.AssertCodeAsync(response, code);
        Assert.Equal(roomsBefore, await CountRoomsAsync());
    }

    [Fact]
    public async Task Given_a_body_that_is_not_a_room_request_when_it_arrives_then_it_is_refused_with_invalid_request()
    {
        using var client = api.CreateClient();
        using var content = new StringContent("{\"kid\": \"zuri\", \"nickname\": \"Speedy Otter\"}", System.Text.Encoding.UTF8, "application/json");

        using var response = await client.PostAsync(new Uri(RoomRequests.Path, UriKind.Relative), content, Cancel);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        await Problems.AssertCodeAsync(response, "invalid_request");
    }

    [Fact]
    public async Task Given_a_body_larger_than_1_KB_when_it_arrives_then_it_is_refused_before_any_room_is_made()
    {
        using var client = api.CreateClient();
        var roomsBefore = await CountRoomsAsync();
        var padding = new string(' ', 1100);
        using var content = new StringContent($"{{\"kid\": \"zuri\",{padding}\"nickname\": {{\"adjective\": 0, \"animal\": 0}}}}", System.Text.Encoding.UTF8, "application/json");

        using var response = await client.PostAsync(new Uri(RoomRequests.Path, UriKind.Relative), content, Cancel);

        Assert.Equal(HttpStatusCode.RequestEntityTooLarge, response.StatusCode);
        await Problems.AssertCodeAsync(response, "too_large");
        Assert.Equal(roomsBefore, await CountRoomsAsync());
    }

    private async Task<int> CountRoomsAsync()
    {
        await using var scope = api.Services.CreateAsyncScope();
        return await scope.ServiceProvider.GetRequiredService<AppDbContext>().Rooms.CountAsync(Cancel);
    }
}

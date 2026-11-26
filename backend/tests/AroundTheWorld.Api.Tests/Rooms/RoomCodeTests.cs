using System.Net;
using System.Net.Http.Json;
using AroundTheWorld.Api.Tests.Support;

namespace AroundTheWorld.Api.Tests.Rooms;

/// <summary>
/// L2-022 criterion 1: a room's code is unique. The code generator is scripted, so a test can
/// draw a code that is already in use (docs/adr/0031-making-a-room.md).
/// </summary>
public sealed class RoomCodeTests(ApiFixture api) : IClassFixture<ApiFixture>
{
    private static CancellationToken Cancel => TestContext.Current.CancellationToken;

    [Fact]
    public async Task Given_a_code_in_use_when_it_is_drawn_for_a_new_room_then_another_is_drawn()
    {
        // Given a room holds BOLT
        using var client = api.WithCodes("BOLT", "BOLT", "CAKE").CreateClient();
        using var first = await client.PostAsJsonAsync(RoomRequests.Path, RoomRequests.Make("zuri", 0, 0), Cancel);

        // When BOLT is drawn again for a new room
        using var second = await client.PostAsJsonAsync(RoomRequests.Path, RoomRequests.Make("kenji", 1, 1), Cancel);

        // Then the new room has the next code drawn
        Assert.Equal("BOLT", (await first.Content.ReadFromJsonAsync<RoomEntryBody>(Cancel))!.Code);
        Assert.Equal("CAKE", (await second.Content.ReadFromJsonAsync<RoomEntryBody>(Cancel))!.Code);
    }

    [Fact]
    public async Task Given_every_code_drawn_is_in_use_when_ten_have_been_drawn_then_the_room_is_refused_with_no_free_code()
    {
        // Given a room holds MOON, and the generator draws only MOON
        using var client = api.WithCodes([.. Enumerable.Repeat("MOON", 12)]).CreateClient();
        using var made = await client.PostAsJsonAsync(RoomRequests.Path, RoomRequests.Make("milo", 2, 3), Cancel);
        Assert.Equal(HttpStatusCode.Created, made.StatusCode);

        // When another room is asked for
        using var refused = await client.PostAsJsonAsync(RoomRequests.Path, RoomRequests.Make("milo", 2, 3), Cancel);

        // Then it is refused with 503 and the code no_free_code
        Assert.Equal(HttpStatusCode.ServiceUnavailable, refused.StatusCode);
        await Problems.AssertCodeAsync(refused, "no_free_code");
    }
}

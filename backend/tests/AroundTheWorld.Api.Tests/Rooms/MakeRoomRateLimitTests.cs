using System.Net;
using System.Net.Http.Json;
using AroundTheWorld.Api.Tests.Support;

namespace AroundTheWorld.Api.Tests.Rooms;

/// <summary>
/// L2-022 criterion 4, L2-045 criterion 1: making a room is open to anyone and rate limited,
/// 10 rooms a minute for one address by default (docs/adr/0031-making-a-room.md).
/// </summary>
public sealed class MakeRoomRateLimitTests(ThrottledApiFixture api) : IClassFixture<ThrottledApiFixture>
{
    private static CancellationToken Cancel => TestContext.Current.CancellationToken;

    [Fact]
    public async Task Given_one_address_has_made_10_rooms_when_it_asks_for_another_then_it_is_refused_with_429_and_rate_limited()
    {
        // Given one address has made 10 rooms
        using var client = api.CreateClient();
        for (var room = 0; room < 10; room++)
        {
            using var made = await client.PostAsJsonAsync(RoomRequests.Path, RoomRequests.Make("pip", room, 0), Cancel);
            Assert.Equal(HttpStatusCode.Created, made.StatusCode);
        }

        // When it asks for another
        using var refused = await client.PostAsJsonAsync(RoomRequests.Path, RoomRequests.Make("pip", 0, 1), Cancel);

        // Then it is refused with 429, the code rate_limited and when to try again
        Assert.Equal(HttpStatusCode.TooManyRequests, refused.StatusCode);
        await Problems.AssertCodeAsync(refused, "rate_limited");
        Assert.NotNull(refused.Headers.RetryAfter?.Delta);
        Assert.InRange(refused.Headers.RetryAfter.Delta.Value, TimeSpan.FromSeconds(1), TimeSpan.FromSeconds(60));
    }
}

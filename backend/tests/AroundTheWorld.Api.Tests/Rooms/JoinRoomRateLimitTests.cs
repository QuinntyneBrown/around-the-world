using System.Net;
using System.Net.Http.Json;
using AroundTheWorld.Api.Tests.Support;

namespace AroundTheWorld.Api.Tests.Rooms;

/// <summary>
/// L2-045 criteria 1 and 2: joining with a code is open to anyone and rate limited, 10 codes a
/// minute for one address by default, so codes cannot be tried at speed
/// (docs/adr/0032-joining-a-room-and-the-lobby.md).
/// </summary>
public sealed class JoinRoomRateLimitTests(ThrottledApiFixture api) : IClassFixture<ThrottledApiFixture>
{
    private static CancellationToken Cancel => TestContext.Current.CancellationToken;

    [Fact]
    public async Task Given_one_address_has_tried_10_codes_when_it_tries_another_then_it_is_refused_with_429_and_rate_limited()
    {
        // Given one address has tried 10 codes, none of them a room's
        using var client = api.CreateClient();
        for (var tried = 0; tried < 10; tried++)
        {
            using var missed = await client.PostAsJsonAsync(RoomRequests.JoinPath, RoomRequests.Join($"QQQ{(char)('A' + tried)}", "nia", 0, 0), Cancel);
            Assert.Equal(HttpStatusCode.NotFound, missed.StatusCode);
        }

        // When it tries another
        using var refused = await client.PostAsJsonAsync(RoomRequests.JoinPath, RoomRequests.Join("QQQZ", "nia", 0, 0), Cancel);

        // Then it is refused with 429, the code rate_limited and when to try again
        Assert.Equal(HttpStatusCode.TooManyRequests, refused.StatusCode);
        await Problems.AssertCodeAsync(refused, "rate_limited");
        Assert.NotNull(refused.Headers.RetryAfter?.Delta);
    }
}

using System.Net;
using AroundTheWorld.Api.Tests.Support;

namespace AroundTheWorld.Api.Tests.Health;

/// <summary>
/// AGENTS.md (Backend) and L2-045 criterion 1: the health endpoints are open to anyone and so
/// rate limited, 60 requests a minute between them for one address by default (docs/adr/0037).
/// </summary>
public sealed class HealthRateLimitTests(ThrottledApiFixture api) : IClassFixture<ThrottledApiFixture>
{
    private static CancellationToken Cancel => TestContext.Current.CancellationToken;

    [Fact]
    public async Task Given_one_address_has_asked_for_health_60_times_in_a_minute_when_it_asks_again_then_it_is_refused_with_429_and_rate_limited()
    {
        // Given one address has asked whether the backend is live 30 times and ready 30 times
        using var client = api.CreateClient();
        for (var probe = 0; probe < 30; probe++)
        {
            using var live = await client.GetAsync(new Uri("/health/live", UriKind.Relative), Cancel);
            Assert.Equal(HttpStatusCode.OK, live.StatusCode);
            using var ready = await client.GetAsync(new Uri("/health/ready", UriKind.Relative), Cancel);
            Assert.Equal(HttpStatusCode.OK, ready.StatusCode);
        }

        // When it asks again
        using var refused = await client.GetAsync(new Uri("/health/live", UriKind.Relative), Cancel);

        // Then it is refused with 429 and the code rate_limited
        Assert.Equal(HttpStatusCode.TooManyRequests, refused.StatusCode);
        await Problems.AssertCodeAsync(refused, "rate_limited");
    }
}

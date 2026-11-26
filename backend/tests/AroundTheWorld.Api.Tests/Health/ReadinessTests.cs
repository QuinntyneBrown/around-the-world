using System.Net;
using System.Net.Http.Json;
using AroundTheWorld.Api.Tests.Support;

namespace AroundTheWorld.Api.Tests.Health;

/// <summary>
/// L2-053 criterion 3: the backend answers whether it is ready, that is whether its room store
/// can be reached (docs/detailed-designs/platform/operate-backend/, docs/adr/0037).
/// </summary>
public sealed class ReadinessTests(ApiFixture api) : IClassFixture<ApiFixture>
{
    private static CancellationToken Cancel => TestContext.Current.CancellationToken;

    [Fact]
    public async Task Given_the_room_store_can_be_reached_when_readiness_is_asked_for_then_it_answers_that_it_is_ready()
    {
        // Given the backend runs and its room store can be reached
        using var client = api.CreateClient();

        // When its readiness is asked for
        using var response = await client.GetAsync(new Uri("/health/ready", UriKind.Relative), Cancel);

        // Then it answers 200, ready, with no detail of the server
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(new HealthBody("ready"), await response.Content.ReadFromJsonAsync<HealthBody>(Cancel));
    }

    [Fact]
    public async Task Given_the_room_store_cannot_be_reached_when_readiness_is_asked_for_then_it_answers_503_not_ready_and_nothing_of_the_server()
    {
        // Given the room store cannot be reached, a fault injected through IAppDbContext
        using var client = api.WithRoomStoreDown().CreateClient();

        // When its readiness is asked for
        using var response = await client.GetAsync(new Uri("/health/ready", UriKind.Relative), Cancel);

        // Then it answers 503, not ready, and says nothing more
        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        Assert.Equal("{\"status\":\"not_ready\"}", await response.Content.ReadAsStringAsync(Cancel));
    }

    [Fact]
    public async Task Given_the_room_store_cannot_be_reached_when_liveness_is_asked_for_then_it_is_still_live()
    {
        // Given the room store cannot be reached
        using var client = api.WithRoomStoreDown().CreateClient();

        // When its liveness is asked for
        using var response = await client.GetAsync(new Uri("/health/live", UriKind.Relative), Cancel);

        // Then the process answers that it is live: liveness checks nothing (docs/adr/0009)
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(new HealthBody("live"), await response.Content.ReadFromJsonAsync<HealthBody>(Cancel));
    }

    private sealed record HealthBody(string Status);
}

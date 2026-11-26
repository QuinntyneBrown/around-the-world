using System.Net;
using System.Net.Http.Json;
using AroundTheWorld.Api.Tests.Support;

namespace AroundTheWorld.Api.Tests.Health;

/// <summary>L2-053 criterion 3: the backend answers whether it is live.</summary>
public sealed class LivenessTests(ApiFixture api) : IClassFixture<ApiFixture>
{
    [Fact]
    public async Task Given_the_backend_runs_when_its_liveness_is_asked_for_then_it_answers_that_it_is_live()
    {
        // Given the backend runs
        using var client = api.CreateClient();

        // When its liveness is asked for
        using var response = await client.GetAsync(new Uri("/health/live", UriKind.Relative), TestContext.Current.CancellationToken);

        // Then it answers 200, live, with no detail of the server
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<LivenessBody>(TestContext.Current.CancellationToken);
        Assert.Equal(new LivenessBody("live"), body);
    }

    private sealed record LivenessBody(string Status);
}

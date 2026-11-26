using System.Net;
using AroundTheWorld.Api.Tests.Support;

namespace AroundTheWorld.Api.Tests.Operations;

/// <summary>
/// L2-044 criterion 4: the CORS policy allows the frontend's origin, the setting
/// <c>Frontend:Origin</c>, for the API and the hub, and refuses a browser's request from any
/// other origin (docs/adr/0037).
/// </summary>
public sealed class CorsTests(FrontendOriginApiFixture api) : IClassFixture<FrontendOriginApiFixture>
{
    private static CancellationToken Cancel => TestContext.Current.CancellationToken;

    [Theory]
    [InlineData("/api/rooms")]
    [InlineData("/api/rooms/join")]
    [InlineData("/hubs/room/negotiate")]
    public async Task Given_the_frontends_origin_when_the_browser_asks_to_call_the_backend_then_it_is_allowed(string path)
    {
        // Given the backend whose setting names the game's origin
        using var client = api.CreateClient();

        // When a browser on that origin asks whether it may POST
        using var response = await client.SendAsync(Preflight(path, FrontendOriginApiFixture.Origin), Cancel);

        // Then the backend allows that origin
        Assert.True(response.Headers.TryGetValues("Access-Control-Allow-Origin", out var allowed), $"{path} sent no Access-Control-Allow-Origin.");
        Assert.Equal([FrontendOriginApiFixture.Origin], allowed);
    }

    [Theory]
    [InlineData("/api/rooms")]
    [InlineData("/hubs/room/negotiate")]
    public async Task Given_another_origin_when_the_browser_asks_to_call_the_backend_then_it_is_not_allowed(string path)
    {
        // Given the backend whose setting names the game's origin
        using var client = api.CreateClient();

        // When a browser on any other origin asks whether it may POST
        using var response = await client.SendAsync(Preflight(path, "https://elsewhere.test"), Cancel);

        // Then the backend allows no origin, so the browser refuses the request
        Assert.False(response.Headers.Contains("Access-Control-Allow-Origin"));
    }

    private static HttpRequestMessage Preflight(string path, string origin)
    {
        var request = new HttpRequestMessage(HttpMethod.Options, path);
        request.Headers.Add("Origin", origin);
        request.Headers.Add("Access-Control-Request-Method", "POST");
        request.Headers.Add("Access-Control-Request-Headers", "content-type");
        return request;
    }
}

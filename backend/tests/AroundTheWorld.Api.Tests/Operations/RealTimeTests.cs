using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;
using AroundTheWorld.Api.Tests.Support;

namespace AroundTheWorld.Api.Tests.Operations;

/// <summary>
/// L2-052 criteria 1 and 3, L2-053 criterion 3: with no Azure SignalR Service set the instance
/// serves SignalR itself, by WebSockets; with the service set, the negotiation is the service's
/// and the instance is ready only when the service is (docs/adr/0037). No test reaches Azure.
/// </summary>
public sealed class RealTimeTests
{
    private static CancellationToken Cancel => TestContext.Current.CancellationToken;

    public sealed class WithNoServiceSet(ApiFixture api) : IClassFixture<ApiFixture>
    {
        [Fact]
        public async Task Given_no_service_is_set_when_a_device_negotiates_then_the_instance_offers_its_own_connection_by_WebSockets_only()
        {
            // Given a room and no Azure SignalR Service set
            using var http = api.CreateClient();
            var host = await RoomRequests.MakeAsync(http);

            // When the device negotiates, presenting its token as SignalR's browser client does
            using var negotiation = await NegotiateAsync(http, host.Token);

            // Then the instance offers its own connection, by WebSockets and nothing else
            Assert.Equal(HttpStatusCode.OK, negotiation.StatusCode);
            using var body = JsonDocument.Parse(await negotiation.Content.ReadAsStringAsync(Cancel));
            Assert.True(body.RootElement.TryGetProperty("connectionToken", out _));
            Assert.False(body.RootElement.TryGetProperty("url", out _));
            var transports = body.RootElement.GetProperty("availableTransports").EnumerateArray()
                .Select(transport => transport.GetProperty("transport").GetString()).ToList();
            Assert.Equal(["WebSockets"], transports);
        }
    }

    public sealed class WithTheServiceSet(AzureSignalRApiFixture api) : IClassFixture<AzureSignalRApiFixture>
    {
        [Fact]
        public async Task Given_the_service_is_set_when_a_device_negotiates_then_the_instance_does_not_serve_the_connection_itself()
        {
            // Given Azure SignalR Service is set, and this instance has no connection to it
            using var http = api.CreateClient();
            var host = await RoomRequests.MakeAsync(http);

            // When the device negotiates
            using var negotiation = await NegotiateAsync(http, host.Token);

            // Then the negotiation is the service's: it hands out no connection of the instance's
            // own. Until the instance has tried the service, the SDK counts it online and sends the
            // device to the service with an access token carrying the player's token; once it knows
            // the service cannot be reached, it refuses with no detail of the room.
            var body = await negotiation.Content.ReadAsStringAsync(Cancel);
            Assert.DoesNotContain("connectionToken", body, StringComparison.Ordinal);
            if (negotiation.StatusCode == HttpStatusCode.OK)
            {
                using var redirect = JsonDocument.Parse(body);
                Assert.StartsWith("http://localhost:1/client/?hub=roomhub", redirect.RootElement.GetProperty("url").GetString(), StringComparison.Ordinal);
                Assert.Equal(host.Token, ClaimOf(redirect.RootElement.GetProperty("accessToken").GetString()!, "atw.room_token"));
            }
            else
            {
                Assert.Equal(HttpStatusCode.InternalServerError, negotiation.StatusCode);
                Assert.DoesNotContain(host.Token, body, StringComparison.Ordinal);
            }
        }

        /// <summary>A claim of the service's access token, a JWT, read without checking its signature.</summary>
        private static string? ClaimOf(string jwt, string claim)
        {
            var payload = jwt.Split('.')[1].Replace('-', '+').Replace('_', '/');
            payload = payload.PadRight(payload.Length + ((4 - (payload.Length % 4)) % 4), '=');
            using var claims = JsonDocument.Parse(Convert.FromBase64String(payload));
            return claims.RootElement.TryGetProperty(claim, out var value) ? value.GetString() : null;
        }

        [Fact]
        public async Task Given_the_service_answers_that_it_is_not_healthy_when_readiness_is_asked_for_then_the_instance_is_not_ready()
        {
            // Given the service answers that it is not healthy
            api.ServiceHealth.Healthy = false;
            using var http = api.CreateClient();

            // When readiness is asked for
            using var response = await http.GetAsync(new Uri("/health/ready", UriKind.Relative), Cancel);

            // Then the instance is not ready, having asked the service's health API
            Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
            Assert.Contains("HEAD http://localhost:1/api/health", api.ServiceHealth.Asked);
            api.ServiceHealth.Healthy = true;
        }

        [Fact]
        public async Task Given_the_service_answers_that_it_is_healthy_when_readiness_is_asked_for_then_the_instance_is_ready()
        {
            // Given the service answers that it is healthy
            api.ServiceHealth.Healthy = true;
            using var http = api.CreateClient();

            // When readiness is asked for
            using var response = await http.GetAsync(new Uri("/health/ready", UriKind.Relative), Cancel);

            // Then the instance is ready
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }
    }

    private static Task<HttpResponseMessage> NegotiateAsync(HttpClient http, string token)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, $"{RoomHubClient.HubPath}/negotiate?negotiateVersion=1");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return http.SendAsync(request, Cancel);
    }
}

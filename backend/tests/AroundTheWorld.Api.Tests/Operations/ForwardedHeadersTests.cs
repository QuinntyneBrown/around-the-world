using System.Net;
using System.Net.Http.Json;
using AroundTheWorld.Api.Tests.Support;

namespace AroundTheWorld.Api.Tests.Operations;

/// <summary>
/// Behind the hosting platform's ingress, where TLS ends, the rate limits count each device's
/// address from the forwarded headers of a known proxy only (L2-045, docs/adr/0037).
/// </summary>
public sealed class ForwardedHeadersTests
{
    private static CancellationToken Cancel => TestContext.Current.CancellationToken;

    public sealed class FromAKnownIngress(KnownIngressApiFixture api) : IClassFixture<KnownIngressApiFixture>
    {
        [Fact]
        public async Task Given_one_device_has_made_10_rooms_through_the_ingress_when_another_device_makes_one_then_it_is_made()
        {
            // Given one device behind the ingress has made 10 rooms, and is refused the 11th
            using var client = api.CreateClient();
            for (var room = 0; room < 10; room++)
            {
                using var made = await MakeFromAsync(client, "203.0.113.5", room);
                Assert.Equal(HttpStatusCode.Created, made.StatusCode);
            }

            using var refused = await MakeFromAsync(client, "203.0.113.5", 10);
            Assert.Equal(HttpStatusCode.TooManyRequests, refused.StatusCode);

            // When another device behind the same ingress makes a room
            using var other = await MakeFromAsync(client, "203.0.113.6", 11);

            // Then it is made: each device's own address is counted, not the ingress's
            Assert.Equal(HttpStatusCode.Created, other.StatusCode);
        }
    }

    public sealed class FromAnUnknownProxy(UnknownIngressApiFixture api) : IClassFixture<UnknownIngressApiFixture>
    {
        [Fact]
        public async Task Given_a_proxy_no_setting_names_when_its_requests_claim_other_addresses_then_they_are_counted_as_its_own()
        {
            // Given a proxy no setting names has made 10 rooms
            using var client = api.CreateClient();
            for (var room = 0; room < 10; room++)
            {
                using var made = await MakeFromAsync(client, "203.0.113.5", room);
                Assert.Equal(HttpStatusCode.Created, made.StatusCode);
            }

            // When its next request claims to come from another device
            using var spoofed = await MakeFromAsync(client, "203.0.113.6", 10);

            // Then the claim is ignored and the proxy's own address is refused
            Assert.Equal(HttpStatusCode.TooManyRequests, spoofed.StatusCode);
        }
    }

    private static Task<HttpResponseMessage> MakeFromAsync(HttpClient client, string device, int room)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, RoomRequests.Path)
        {
            Content = JsonContent.Create(RoomRequests.Make("pip", room % 10, room / 10)),
        };
        request.Headers.Add("X-Forwarded-For", device);
        request.Headers.Add("X-Forwarded-Proto", "https");
        return client.SendAsync(request, Cancel);
    }
}

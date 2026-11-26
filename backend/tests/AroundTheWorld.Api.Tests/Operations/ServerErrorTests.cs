using System.Net;
using System.Net.Http.Json;
using AroundTheWorld.Api.Tests.Support;

namespace AroundTheWorld.Api.Tests.Operations;

/// <summary>
/// L2-054 criterion 1, L2-044 criterion 3: a failure that is not a refusal is still a
/// ProblemDetails with a <c>code</c> a screen can branch on, <c>server_error</c>, and holds
/// nothing of the server (docs/adr/0037).
/// </summary>
public sealed class ServerErrorTests(ApiFixture api) : IClassFixture<ApiFixture>
{
    private static CancellationToken Cancel => TestContext.Current.CancellationToken;

    [Fact]
    public async Task Given_the_room_store_fails_when_a_room_is_made_then_the_answer_is_500_with_server_error_and_nothing_of_the_failure()
    {
        // Given the room store fails every save, a fault injected through IAppDbContext
        using var client = api.WithRoomStoreDown().CreateClient();

        // When a child makes a room
        using var response = await client.PostAsJsonAsync(RoomRequests.Path, RoomRequests.Make("zuri", 0, 0), Cancel);

        // Then the answer is 500, a ProblemDetails with the code server_error
        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        await Problems.AssertCodeAsync(response, "server_error");

        // And it says nothing of what failed
        var body = await response.Content.ReadAsStringAsync(Cancel);
        Assert.DoesNotContain("room store", body, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("InvalidOperationException", body, StringComparison.Ordinal);
    }
}

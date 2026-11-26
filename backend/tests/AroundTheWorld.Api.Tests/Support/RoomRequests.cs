using System.Net.Http.Json;

namespace AroundTheWorld.Api.Tests.Support;

/// <summary>What a test sends to make a room, and what the API answers, as the game sees it.</summary>
internal static class RoomRequests
{
    public const string Path = "/api/rooms";

    public static object Make(string kid, int adjective, int animal) =>
        new { kid, nickname = new { adjective, animal } };
}

internal sealed record RoomEntryBody(string Code, string Token, Guid PlayerId, RoomStateBody Room);

internal sealed record RoomStateBody(string Code, string Status, SetupBody Setup, IReadOnlyList<RoomPlayerBody> Players);

internal sealed record SetupBody(IReadOnlyList<string> Kinds, IReadOnlyList<int> Tables, int TourLength, string CardSpeed);

internal sealed record RoomPlayerBody(Guid Id, string Kid, NicknameBody Nickname, int Position, bool Host);

internal sealed record NicknameBody(int Adjective, int Animal);

/// <summary>Reads a refusal: a ProblemDetails with a <c>code</c> and no detail of the server.</summary>
internal static class Problems
{
    public static async Task AssertCodeAsync(HttpResponseMessage response, string code)
    {
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        var problem = await response.Content.ReadFromJsonAsync<Dictionary<string, object>>(TestContext.Current.CancellationToken);
        Assert.NotNull(problem);
        Assert.Equal(code, problem["code"].ToString());
        Assert.DoesNotContain("exception", problem.Keys, StringComparer.OrdinalIgnoreCase);
        Assert.DoesNotContain("stackTrace", problem.Keys, StringComparer.OrdinalIgnoreCase);
        Assert.DoesNotContain("errors", problem.Keys, StringComparer.OrdinalIgnoreCase);
    }
}

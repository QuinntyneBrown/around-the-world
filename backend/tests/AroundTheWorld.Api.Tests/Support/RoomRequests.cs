using System.Net.Http.Json;

namespace AroundTheWorld.Api.Tests.Support;

/// <summary>What a test sends to make a room, and what the API answers, as the game sees it.</summary>
internal static class RoomRequests
{
    public const string Path = "/api/rooms";

    public const string JoinPath = "/api/rooms/join";

    public static object Make(string kid, int adjective, int animal) =>
        new { kid, nickname = new { adjective, animal } };

    public static object Join(string code, string kid, int adjective, int animal) =>
        new { code, kid, nickname = new { adjective, animal } };

    /// <summary>Makes a room through the API and answers what the host received.</summary>
    public static async Task<RoomEntryBody> MakeAsync(HttpClient client, string kid = "zuri", int adjective = 0, int animal = 0)
    {
        using var made = await client.PostAsJsonAsync(Path, Make(kid, adjective, animal), TestContext.Current.CancellationToken);
        made.EnsureSuccessStatusCode();
        return (await made.Content.ReadFromJsonAsync<RoomEntryBody>(TestContext.Current.CancellationToken))!;
    }

    /// <summary>Joins a room through the API and answers what the player received.</summary>
    public static async Task<RoomEntryBody> JoinAsync(HttpClient client, string code, string kid = "nia", int adjective = 1, int animal = 1)
    {
        using var joined = await client.PostAsJsonAsync(JoinPath, Join(code, kid, adjective, animal), TestContext.Current.CancellationToken);
        joined.EnsureSuccessStatusCode();
        return (await joined.Content.ReadFromJsonAsync<RoomEntryBody>(TestContext.Current.CancellationToken))!;
    }
}

internal sealed record RoomEntryBody(string Code, string Token, Guid PlayerId, RoomStateBody Room);

internal sealed record RoomStateBody(string Code, string Status, SetupBody Setup, IReadOnlyList<RoomPlayerBody> Players);

internal sealed record SetupBody(IReadOnlyList<string> Kinds, IReadOnlyList<int> Tables, int TourLength, string CardSpeed);

internal sealed record RoomPlayerBody(Guid Id, string Kid, NicknameBody Nickname, int Position, bool Host);

internal sealed record NicknameBody(int Adjective, int Animal);

internal sealed record CardBody(string Kind, int Left, int Right)
{
    public int Answer() => Kind switch
    {
        "times" => Left * Right,
        "plus" => Left + Right,
        "minus" => Left - Right,
        _ => Left / Right,
    };
}

internal sealed record GamePlayerBody(string Id, string Kid, NicknameBody? Nickname, int Distance, IReadOnlyList<int> Stamps);

internal sealed record GameDuelBody(
    int Number,
    int Desk,
    string Traveller,
    string DeskHolder,
    CardBody Card,
    int TimeLeftMs,
    int TravellerFrozenMs,
    int DeskHolderFrozenMs,
    int? TravellerWrong,
    int? DeskHolderWrong,
    string Outcome,
    string? Winner,
    int? Answer,
    int SinceDecidedMs);

internal sealed record TourMoveBody(string Kind, string Traveller, int From, int To, bool PassedEmptyDesk, string? SatDown);

/// <summary>The game as the room hub sends it (<c>GameChanged</c>, docs/adr/0033).</summary>
internal sealed record GameStateBody(
    int TourLength,
    int SecondsToAnswer,
    string Phase,
    int FirstCardInMs,
    IReadOnlyList<GamePlayerBody> Players,
    IReadOnlyList<string?> Desks,
    string Traveller,
    int TravellerDesk,
    IReadOnlyList<string> Standings,
    GameDuelBody? Duel,
    TourMoveBody? LastMove,
    string? Ending,
    string? Winner)
{
    public GamePlayerBody Player(Guid id) => Players.Single(player => player.Id == id.ToString());
}

/// <summary>Reads a refusal: a ProblemDetails with a <c>code</c> and no detail of the server.</summary>
/// <summary>A sticker as every player of the room is sent it: its id and the sender's player id (ADR 0035).</summary>
internal sealed record StickerShownBody(int Sticker, string From);

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

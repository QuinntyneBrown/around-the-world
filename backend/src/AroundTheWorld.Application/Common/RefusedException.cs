namespace AroundTheWorld.Application.Common;

/// <summary>
/// A request the backend refuses, with the <c>code</c> a screen branches on and the HTTP
/// status (L2-054 criterion 1). The API writes it as ProblemDetails with no detail of the
/// server (docs/detailed-designs/rooms/guard-room/).
/// </summary>
public sealed class RefusedException(string code, int status, string title) : Exception(title)
{
    public string Code { get; } = code;

    public int Status { get; } = status;
}

/// <summary>The codes a refusal carries, as the screens know them.</summary>
public static class ErrorCodes
{
    public const string InvalidRequest = "invalid_request";
    public const string InvalidKid = "invalid_kid";
    public const string InvalidNickname = "invalid_nickname";
    public const string RateLimited = "rate_limited";
    public const string NoFreeCode = "no_free_code";
    public const string TooLarge = "too_large";
}

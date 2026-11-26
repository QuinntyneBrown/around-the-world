using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;

namespace AroundTheWorld.Api.Hubs;

/// <summary>
/// Makes the connection token a request presents the identity of its user: from the
/// <c>Authorization: Bearer</c> header, or, for the hub, the <c>access_token</c> query parameter
/// that a browser's WebSocket carries (docs/adr/0031). It checks nothing; a token that names no
/// player is refused by the request it is sent with (docs/adr/0032). Being a claim, the token
/// reaches the hub the same way whether the instance holds the connection or Azure SignalR Service
/// relays it with the claims of its negotiation (docs/adr/0037). The token is never logged.
/// </summary>
public sealed class RoomTokenAuthentication(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder)
    : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    /// <summary>The scheme's name.</summary>
    public const string SchemeName = "RoomToken";

    /// <summary>The claim that holds the connection token.</summary>
    public const string TokenClaim = "atw.room_token";

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var token = PresentedToken(Request);
        if (token is null)
        {
            return Task.FromResult(AuthenticateResult.NoResult());
        }

        var identity = new ClaimsIdentity([new Claim(TokenClaim, token)], SchemeName);
        return Task.FromResult(AuthenticateResult.Success(new AuthenticationTicket(new ClaimsPrincipal(identity), SchemeName)));
    }

    private static string? PresentedToken(HttpRequest request)
    {
        var header = request.Headers.Authorization.ToString();
        if (header.StartsWith("Bearer ", StringComparison.Ordinal) && header.Length > "Bearer ".Length)
        {
            return header["Bearer ".Length..];
        }

        var query = request.Query["access_token"].ToString();
        return query.Length > 0 && request.Path.StartsWithSegments("/hubs", StringComparison.Ordinal) ? query : null;
    }
}

using AroundTheWorld.Application.Common;
using Microsoft.AspNetCore.SignalR;

namespace AroundTheWorld.Api.Hubs;

/// <summary>The connection a hub request came from, for this request's scope.</summary>
public sealed class HubCurrentPlayer : ICurrentPlayer
{
    public string? Token { get; private set; }

    public string? ConnectionId { get; private set; }

    internal void Use(HubCallerContext connection)
    {
        Token = connection.Items.TryGetValue(CurrentPlayerFilter.TokenKey, out var token) ? token as string : null;
        ConnectionId = connection.ConnectionId;
    }
}

/// <summary>
/// Reads the connection token once, when a connection opens: SignalR's access token, which the
/// browser's WebSockets transport sends as the query parameter <c>access_token</c>, or a bearer
/// header from a client that can send one (docs/adr/0031). Each hub request's scope then knows
/// its caller. A refusal is sent back as a hub error whose message is its <c>code</c> and
/// nothing of the server (L2-044 criterion 3).
/// </summary>
public sealed class CurrentPlayerFilter : IHubFilter
{
    internal const string TokenKey = "atw.token";

    public async ValueTask<object?> InvokeMethodAsync(
        HubInvocationContext invocationContext,
        Func<HubInvocationContext, ValueTask<object?>> next)
    {
        invocationContext.ServiceProvider.GetRequiredService<HubCurrentPlayer>().Use(invocationContext.Context);
        try
        {
            return await next(invocationContext);
        }
        catch (RefusedException refused)
        {
            throw new HubException(refused.Code);
        }
    }

    public Task OnConnectedAsync(HubLifetimeContext context, Func<HubLifetimeContext, Task> next)
    {
        context.Context.Items[TokenKey] = PresentedToken(context.Context.GetHttpContext());
        context.ServiceProvider.GetRequiredService<HubCurrentPlayer>().Use(context.Context);
        return next(context);
    }

    public Task OnDisconnectedAsync(HubLifetimeContext context, Exception? exception, Func<HubLifetimeContext, Exception?, Task> next)
    {
        context.ServiceProvider.GetRequiredService<HubCurrentPlayer>().Use(context.Context);
        return next(context, exception);
    }

    private static string? PresentedToken(HttpContext? http)
    {
        if (http is null)
        {
            return null;
        }

        var query = http.Request.Query["access_token"].ToString();
        if (query.Length > 0)
        {
            return query;
        }

        var header = http.Request.Headers.Authorization.ToString();
        return header.StartsWith("Bearer ", StringComparison.Ordinal) ? header["Bearer ".Length..] : null;
    }
}

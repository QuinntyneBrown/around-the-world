using AroundTheWorld.Api.Rooms;
using AroundTheWorld.Application.Common;
using AroundTheWorld.Application.Health;
using AroundTheWorld.Application.Rooms;
using Microsoft.AspNetCore.Http.Connections;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Azure.SignalR;

namespace AroundTheWorld.Api.Hubs;

/// <summary>
/// The room's one real-time channel (docs/adr/0037): WebSockets only, messages of at most 1 KB,
/// no detail of the server in an error, the hub's rate limits (docs/adr/0035), and the caller
/// known from the token its connection presented (docs/adr/0032). When the setting
/// <c>Azure:SignalR:ConnectionString</c> holds a value the connections are served through Azure
/// SignalR Service, which offers WebSockets only and carries the caller's claims into its own
/// access token; otherwise the instance serves them itself, as every test does (L2-052).
/// </summary>
public static class RealTime
{
    /// <summary>The setting that switches Azure SignalR Service on (docs/operations/settings.md).</summary>
    public const string ServiceSetting = "Azure:SignalR:ConnectionString";

    public static IServiceCollection AddRealTime(this IServiceCollection services, IConfiguration configuration)
    {
        services
            .AddAuthentication(RoomTokenAuthentication.SchemeName)
            .AddScheme<Microsoft.AspNetCore.Authentication.AuthenticationSchemeOptions, RoomTokenAuthentication>(RoomTokenAuthentication.SchemeName, null);

        var signalR = services.AddSignalR(options =>
        {
            options.MaximumReceiveMessageSize = RateLimitPolicies.MaxBodyBytes;
            options.EnableDetailedErrors = false;
            options.AddFilter<HubRateLimitFilter>();
            options.AddFilter<CurrentPlayerFilter>();
        });
        services.AddScoped<HubCurrentPlayer>();
        services.AddScoped<ICurrentPlayer>(provider => provider.GetRequiredService<HubCurrentPlayer>());
        services.AddScoped<IRoomNotifier, HubRoomNotifier>();

        var connectionString = configuration[ServiceSetting];
        if (!string.IsNullOrWhiteSpace(connectionString))
        {
            signalR.AddAzureSignalR(options =>
            {
                options.ConnectionString = connectionString;
                options.TransportTypeDetector = _ => HttpTransportType.WebSockets;
                options.ClaimsProvider = context => context.User.Claims;
            });
            services.AddSingleton(new ServiceEndpoint(connectionString));
            services.AddHttpClient(SignalRServiceProbe.HttpClientName);
            services.AddScoped<IReadinessProbe, SignalRServiceProbe>();
        }

        return services;
    }
}

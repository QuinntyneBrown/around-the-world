namespace AroundTheWorld.Api.Hosting;

/// <summary>
/// One CORS policy, the default for the API and the hub: it allows the origin of the
/// <c>game</c> application, the setting <c>Frontend:Origin</c>, and no other (L2-044 criterion 4,
/// docs/adr/0037). Credentials are allowed for that origin because SignalR's browser client sends
/// its negotiation with them. With no setting no other origin is allowed; the game calls the
/// backend on its own origin, which needs no CORS (docs/adr/0031).
/// </summary>
public static class FrontendCors
{
    public static IServiceCollection AddFrontendCors(this IServiceCollection services, IConfiguration configuration)
    {
        var origin = configuration["Frontend:Origin"];
        services.AddCors(options => options.AddDefaultPolicy(policy =>
        {
            if (!string.IsNullOrWhiteSpace(origin))
            {
                policy.WithOrigins(origin.TrimEnd('/')).AllowAnyHeader().AllowAnyMethod().AllowCredentials();
            }
        }));
        return services;
    }
}

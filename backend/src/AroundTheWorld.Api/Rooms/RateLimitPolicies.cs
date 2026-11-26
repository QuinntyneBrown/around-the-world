using System.Globalization;
using System.Threading.RateLimiting;
using AroundTheWorld.Application.Common;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace AroundTheWorld.Api.Rooms;

/// <summary>
/// The rate limits on what is open to anyone (L2-045), each a fixed window counted for each
/// address, in memory and for its window only (docs/adr/0031-making-a-room.md). Their numbers are
/// settings (docs/operations/settings.md).
/// </summary>
public static class RateLimitPolicies
{
    /// <summary>The policy of making a room.</summary>
    public const string MakeRoom = "make-room";

    /// <summary>The policy of joining a room with a code.</summary>
    public const string JoinRoom = "join-room";

    /// <summary>The policy of the health endpoints, shared by both (docs/adr/0037).</summary>
    public const string Health = "health";

    /// <summary>The largest body a request open to anyone may carry (L2-044 criterion 2).</summary>
    public const int MaxBodyBytes = 1024;

    public static IServiceCollection AddRoomRateLimits(this IServiceCollection services, IConfiguration configuration)
    {
        var makeRoom = Limit(configuration, "MakeRoom", 10);
        var joinRoom = Limit(configuration, "JoinRoom", 10);
        var health = Limit(configuration, "Health", 60);

        services.AddRateLimiter(options =>
        {
            options.AddPolicy(MakeRoom, context => PerAddress(context, makeRoom));
            options.AddPolicy(JoinRoom, context => PerAddress(context, joinRoom));
            options.AddPolicy(Health, context => PerAddress(context, health));
            options.OnRejected = (context, cancellationToken) => RefuseAsync(context, cancellationToken);
        });
        return services;
    }

    /// <summary>
    /// A policy's numbers from its settings: its default in a window of 60 seconds when absent
    /// (10 rooms and 10 codes to confirm, 60 health requests).
    /// </summary>
    private static FixedWindowRateLimiterOptions Limit(IConfiguration configuration, string policy, int permits)
    {
        var settings = configuration.GetSection($"RateLimits:{policy}");
        return new FixedWindowRateLimiterOptions
        {
            PermitLimit = settings.GetValue("PermitLimit", permits),
            Window = TimeSpan.FromSeconds(settings.GetValue("WindowSeconds", 60)),
            QueueLimit = 0,
        };
    }

    private static RateLimitPartition<string> PerAddress(HttpContext context, FixedWindowRateLimiterOptions limit) =>
        RateLimitPartition.GetFixedWindowLimiter(context.Connection.RemoteIpAddress?.ToString() ?? "unknown", _ => limit);

    /// <summary>
    /// Requires the rate limit each endpoint marked <see cref="OpenToAnyoneAttribute"/> names, so
    /// the one declaration on the action is the whole of it.
    /// </summary>
    public static TBuilder RequireOpenToAnyoneLimits<TBuilder>(this TBuilder endpoints)
        where TBuilder : IEndpointConventionBuilder
    {
        endpoints.Add(endpoint =>
        {
            var openToAnyone = endpoint.Metadata.OfType<OpenToAnyoneAttribute>().FirstOrDefault();
            if (openToAnyone is not null)
            {
                endpoint.Metadata.Add(new EnableRateLimitingAttribute(openToAnyone.RateLimitPolicy));
            }
        });
        return endpoints;
    }

    private static async ValueTask RefuseAsync(OnRejectedContext context, CancellationToken cancellationToken)
    {
        var retryAfter = context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var wait) ? wait : TimeSpan.FromMinutes(1);
        var response = context.HttpContext.Response;
        response.StatusCode = StatusCodes.Status429TooManyRequests;
        response.Headers.RetryAfter = Math.Ceiling(retryAfter.TotalSeconds).ToString(CultureInfo.InvariantCulture);
        var problems = context.HttpContext.RequestServices.GetRequiredService<IProblemDetailsService>();
        await problems.WriteAsync(new ProblemDetailsContext
        {
            HttpContext = context.HttpContext,
            ProblemDetails = new ProblemDetails
            {
                Status = StatusCodes.Status429TooManyRequests,
                Title = "Too many requests. Wait a moment, then try again.",
                Extensions = { ["code"] = ErrorCodes.RateLimited },
            },
        });
        _ = cancellationToken;
    }
}

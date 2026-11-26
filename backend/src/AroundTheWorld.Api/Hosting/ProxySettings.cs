using System.Net;
using Microsoft.AspNetCore.HttpOverrides;

namespace AroundTheWorld.Api.Hosting;

/// <summary>
/// Behind the hosting platform's ingress, where TLS ends, the backend reads
/// <c>X-Forwarded-For</c> and <c>X-Forwarded-Proto</c> from the known proxies only, one proxy
/// deep, so the rate limits count each device's own address (docs/adr/0037). The proxies are
/// the settings <c>ForwardedHeaders:KnownProxies</c> (addresses) and
/// <c>ForwardedHeaders:KnownNetworks</c> (CIDR ranges), each a comma-separated list; loopback is
/// always known. A forwarded header from any other address is ignored.
/// </summary>
public static class ProxySettings
{
    public static IServiceCollection AddKnownProxies(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<ForwardedHeadersOptions>(options =>
        {
            options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
            options.ForwardLimit = 1;
            foreach (var proxy in List(configuration, "ForwardedHeaders:KnownProxies"))
            {
                options.KnownProxies.Add(IPAddress.Parse(proxy));
            }

            foreach (var network in List(configuration, "ForwardedHeaders:KnownNetworks"))
            {
                options.KnownIPNetworks.Add(System.Net.IPNetwork.Parse(network));
            }
        });
        return services;
    }

    private static string[] List(IConfiguration configuration, string key) =>
        (configuration[key] ?? string.Empty).Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
}

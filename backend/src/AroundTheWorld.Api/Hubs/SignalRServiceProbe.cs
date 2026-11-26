using AroundTheWorld.Application.Health;
using Microsoft.Azure.SignalR;

namespace AroundTheWorld.Api.Hubs;

/// <summary>
/// Ready when Azure SignalR Service answers its health API, <c>HEAD {endpoint}/api/health</c>,
/// within 2 seconds (docs/adr/0037). Registered only when the service is set. What failed stays
/// on the server.
/// </summary>
public sealed class SignalRServiceProbe(IHttpClientFactory clients, ServiceEndpoint service) : IReadinessProbe
{
    /// <summary>The name of the HTTP client the probe asks with.</summary>
    public const string HttpClientName = "azure-signalr-health";

    /// <summary>How long the probe waits for the service.</summary>
    public static readonly TimeSpan Timeout = TimeSpan.FromSeconds(2);

    public async Task<bool> IsReadyAsync(CancellationToken cancellationToken)
    {
        using var waiting = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        waiting.CancelAfter(Timeout);
        try
        {
            var client = clients.CreateClient(HttpClientName);
            using var request = new HttpRequestMessage(HttpMethod.Head, new Uri(new Uri(service.Endpoint.TrimEnd('/') + "/"), "api/health"));
            using var response = await client.SendAsync(request, waiting.Token);
            return response.IsSuccessStatusCode;
        }
        catch (Exception failure) when (failure is HttpRequestException || (failure is OperationCanceledException && !cancellationToken.IsCancellationRequested))
        {
            return false;
        }
    }
}

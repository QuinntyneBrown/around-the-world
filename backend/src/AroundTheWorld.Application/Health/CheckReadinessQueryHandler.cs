using MediatR;

namespace AroundTheWorld.Application.Health;

/// <summary>
/// Ready only when every registered <see cref="IReadinessProbe"/> is: the room store's always,
/// and Azure SignalR Service's when the service is set (docs/adr/0037). A probe that fails
/// counts as not ready.
/// </summary>
public sealed class CheckReadinessQueryHandler(IEnumerable<IReadinessProbe> probes) : IRequestHandler<CheckReadinessQuery, bool>
{
    public async Task<bool> Handle(CheckReadinessQuery request, CancellationToken cancellationToken)
    {
        foreach (var probe in probes)
        {
            if (!await probe.IsReadyAsync(cancellationToken))
            {
                return false;
            }
        }

        return true;
    }
}

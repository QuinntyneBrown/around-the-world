using AroundTheWorld.Application.Common;
using AroundTheWorld.Application.Health;

namespace AroundTheWorld.Infrastructure.Health;

/// <summary>
/// Ready when the room store can be reached through <see cref="IAppDbContext"/>. A store that
/// throws instead of answering is not ready; what it threw stays on the server.
/// </summary>
public sealed class RoomStoreProbe(IAppDbContext store) : IReadinessProbe
{
    public async Task<bool> IsReadyAsync(CancellationToken cancellationToken)
    {
        try
        {
            return await store.CanConnectAsync(cancellationToken);
        }
        catch (Exception failure) when (failure is not OperationCanceledException)
        {
            return false;
        }
    }
}

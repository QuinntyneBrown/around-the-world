using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace AroundTheWorld.Infrastructure.Persistence;

/// <summary>
/// Applies the room store's migrations. Only the `migrate` command runs it; the API never
/// migrates on startup (AGENTS.md, Backend; docs/adr/0009).
/// </summary>
public static class RoomStoreMigrator
{
    public static async Task MigrateRoomStoreAsync(this IServiceProvider services, CancellationToken cancellationToken)
    {
        await using var scope = services.CreateAsyncScope();
        var store = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await store.Database.MigrateAsync(cancellationToken);
    }
}

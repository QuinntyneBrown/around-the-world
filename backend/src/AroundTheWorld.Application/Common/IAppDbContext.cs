namespace AroundTheWorld.Application.Common;

/// <summary>
/// The room store as the handlers see it. Each room's state is read and written through it,
/// so no instance keeps a room in its own memory between requests. The room's sets arrive
/// with the rooms (journey 12). Tests inject database faults through this port.
/// </summary>
public interface IAppDbContext
{
    Task<int> SaveChangesAsync(CancellationToken cancellationToken);
}

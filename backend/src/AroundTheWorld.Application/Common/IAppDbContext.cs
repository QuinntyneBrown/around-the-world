using AroundTheWorld.Domain.Rooms;
using Microsoft.EntityFrameworkCore;

namespace AroundTheWorld.Application.Common;

/// <summary>
/// The room store as the handlers see it. Each room's state is read and written through it,
/// so no instance keeps a room in its own memory between requests. Tests inject database
/// faults through this port.
/// </summary>
public interface IAppDbContext
{
    /// <summary>The rooms, each with its players.</summary>
    DbSet<Room> Rooms { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken);

    /// <summary>
    /// Forgets every room read so far and every change not saved, so the next read sees the
    /// store as it now stands; a handler tries again after another change reached a room first.
    /// </summary>
    void Forget();

    /// <summary>Whether the room store can be reached now, for the ready endpoint (L2-053 criterion 3).</summary>
    Task<bool> CanConnectAsync(CancellationToken cancellationToken);
}

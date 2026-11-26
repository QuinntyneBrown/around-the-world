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
}

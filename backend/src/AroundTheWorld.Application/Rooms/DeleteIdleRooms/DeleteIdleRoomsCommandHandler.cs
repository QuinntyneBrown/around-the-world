using AroundTheWorld.Application.Common;
using AroundTheWorld.Domain.Rooms;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AroundTheWorld.Application.Rooms.DeleteIdleRooms;

/// <summary>
/// Removes the idle rooms in one unit of work; their players go with them, so the store holds
/// nothing about a deleted room (L2-046 criterion 2).
/// </summary>
public sealed class DeleteIdleRoomsCommandHandler(IAppDbContext store) : IRequestHandler<DeleteIdleRoomsCommand, int>
{
    public async Task<int> Handle(DeleteIdleRoomsCommand request, CancellationToken cancellationToken)
    {
        var lastActiveBefore = request.Now - Room.IdleLimit;
        var idle = await store.Rooms
            .Where(room => room.LastActivityAt <= lastActiveBefore)
            .ToListAsync(cancellationToken);
        store.Rooms.RemoveRange(idle);
        await store.SaveChangesAsync(cancellationToken);
        return idle.Count;
    }
}

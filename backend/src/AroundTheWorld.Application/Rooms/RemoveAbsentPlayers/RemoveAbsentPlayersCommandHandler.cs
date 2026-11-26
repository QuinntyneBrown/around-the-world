using AroundTheWorld.Application.Common;
using AroundTheWorld.Domain.Rooms;
using AroundTheWorld.Domain.Tours;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AroundTheWorld.Application.Rooms.RemoveAbsentPlayers;

/// <summary>
/// Finds, by the indexed time each player went away, the rooms with a player away for 30 seconds
/// or more, removes them from each room on its own and tells the players who remain of the room
/// and its game; a room left with nobody is deleted with nothing left of it (L2-027 criterion 3,
/// L2-046 criterion 2). A room another change saved first is left for the next tick, which finds
/// it as it now stands (docs/adr/0036).
/// </summary>
public sealed class RemoveAbsentPlayersCommandHandler(IAppDbContext store, IRoomNotifier notifier, IRandomSource random)
    : IRequestHandler<RemoveAbsentPlayersCommand, int>
{
    public async Task<int> Handle(RemoveAbsentPlayersCommand request, CancellationToken cancellationToken)
    {
        var awaySince = request.Now - Room.SpotHeldFor;
        var rooms = await store.Rooms
            .Where(room => room.Players.Any(player => player.AwaySince != null && player.AwaySince <= awaySince))
            .Select(room => room.Id)
            .ToListAsync(cancellationToken);
        var changed = 0;
        foreach (var id in rooms)
        {
            store.Forget();
            var room = await store.Rooms.SingleOrDefaultAsync(r => r.Id == id, cancellationToken);
            if (room is null || room.RemoveAbsent(request.Now, random).Count == 0)
            {
                continue;
            }

            var empty = room.Players.Count == 0;
            if (empty)
            {
                store.Rooms.Remove(room);
            }

            try
            {
                await store.SaveChangesAsync(cancellationToken);
            }
            catch (DbUpdateConcurrencyException)
            {
                continue;
            }

            changed++;
            if (!empty)
            {
                await RoomChanges.AnnounceAsync(notifier, room, request.Now, cancellationToken);
            }
        }

        return changed;
    }
}

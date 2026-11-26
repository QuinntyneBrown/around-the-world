using AroundTheWorld.Application.Common;
using AroundTheWorld.Domain.Rooms;
using AroundTheWorld.Domain.Tours;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AroundTheWorld.Application.Rooms.AdvanceGames;

/// <summary>
/// Finds the playing rooms whose game is due, by the indexed time it is due, and runs what fell
/// due in each, saving each room on its own and telling its players. A room another change or
/// another instance saved first is left for the next tick, which finds it as it now stands
/// (docs/adr/0033).
/// </summary>
public sealed class AdvanceGamesCommandHandler(IAppDbContext store, IRoomNotifier notifier, IRandomSource random)
    : IRequestHandler<AdvanceGamesCommand, int>
{
    public async Task<int> Handle(AdvanceGamesCommand request, CancellationToken cancellationToken)
    {
        var due = await store.Rooms
            .Where(room => room.Status == RoomStatus.Playing && room.GameDueAt != null && room.GameDueAt <= request.Now)
            .Select(room => room.Id)
            .ToListAsync(cancellationToken);
        var changed = 0;
        foreach (var id in due)
        {
            store.Forget();
            var room = await store.Rooms.SingleOrDefaultAsync(r => r.Id == id, cancellationToken);
            if (room is null || !room.AdvanceGame(request.Now, random))
            {
                continue;
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
            await RoomChanges.AnnounceAsync(notifier, room, request.Now, cancellationToken, gameOnly: true);
        }

        return changed;
    }
}

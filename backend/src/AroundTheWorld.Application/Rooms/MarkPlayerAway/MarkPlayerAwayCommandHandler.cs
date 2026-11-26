using AroundTheWorld.Application.Common;
using AroundTheWorld.Domain.Rooms;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AroundTheWorld.Application.Rooms.MarkPlayerAway;

/// <summary>
/// Finds the player whose token the lost connection presented and marks them away, when the lost
/// connection is still their current one: a connection the device replaced before the server
/// noticed the old one was gone marks nobody (docs/adr/0036). It changes nothing else, so the
/// duel carries on (L2-029 criterion 3). A change that reached the room first makes it try again
/// on the room as it now stands.
/// </summary>
public sealed class MarkPlayerAwayCommandHandler(IAppDbContext store, ICurrentPlayer caller, TimeProvider clock)
    : IRequestHandler<MarkPlayerAwayCommand>
{
    public async Task Handle(MarkPlayerAwayCommand request, CancellationToken cancellationToken)
    {
        if (caller.Token is not { Length: > 0 } presented || caller.ConnectionId is not { } connectionId)
        {
            return;
        }

        var token = ConnectionToken.From(presented);
        for (var tried = 1; ; tried++)
        {
            store.Forget();
            var room = await store.Rooms.SingleOrDefaultAsync(r => r.Players.Any(p => p.Token == token), cancellationToken);
            var player = room?.Players.Single(p => p.Token == token);
            if (room is null || player is null || !room.MarkAway(player, connectionId, clock.GetUtcNow()))
            {
                return;
            }

            try
            {
                await store.SaveChangesAsync(cancellationToken);
                return;
            }
            catch (DbUpdateConcurrencyException) when (tried < JoinRoom.JoinRoomCommandHandler.MaxTries)
            {
            }
        }
    }
}

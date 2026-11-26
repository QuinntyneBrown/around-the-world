using AroundTheWorld.Application.Common;
using AroundTheWorld.Domain.Rooms;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AroundTheWorld.Application.Rooms.LeaveRoom;

/// <summary>
/// Removes the player from their room. When the room is then empty it is deleted, with nothing
/// left of it in the store; otherwise it is saved and every player left is told, the earliest
/// joiner now the host when the host left (L2-025 criterion 5, L2-046 criterion 2). A change
/// that reached the room first makes the leave try again on the room as it now stands.
/// </summary>
public sealed class LeaveRoomCommandHandler(
    IAppDbContext store,
    RoomPlayerContext context,
    ICurrentPlayer caller,
    IRoomNotifier notifier,
    TimeProvider clock)
    : IRequestHandler<LeaveRoomCommand>
{
    public async Task Handle(LeaveRoomCommand request, CancellationToken cancellationToken)
    {
        var (room, player) = (context.Room, context.Player);
        for (var tried = 1; ; tried++)
        {
            var empty = room.Leave(player, clock.GetUtcNow());
            if (empty)
            {
                store.Rooms.Remove(room);
            }

            try
            {
                await store.SaveChangesAsync(cancellationToken);
            }
            catch (DbUpdateConcurrencyException) when (tried < JoinRoom.JoinRoomCommandHandler.MaxTries)
            {
                store.Forget();
                var token = player.Token;
                room = await store.Rooms.SingleAsync(r => r.Players.Any(p => p.Token == token), cancellationToken);
                player = room.Players.Single(p => p.Token == token);
                continue;
            }

            if (caller.ConnectionId is { } connectionId)
            {
                await notifier.DetachAsync(connectionId, room.Id, cancellationToken);
            }

            if (!empty)
            {
                await notifier.RoomChangedAsync(room.Id, RoomStateDto.Of(room), cancellationToken);
            }

            return;
        }
    }
}

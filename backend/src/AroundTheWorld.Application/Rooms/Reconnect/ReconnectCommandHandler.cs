using AroundTheWorld.Application.Common;
using MediatR;

namespace AroundTheWorld.Application.Rooms.Reconnect;

/// <summary>
/// Binds the connection to the player its token names, who is then no longer away and has the
/// same spot (L2-029 criterion 2, L2-043 criterion 4, docs/adr/0036), adds it to its room's
/// players and sends it the room, and its game, as they stand.
/// </summary>
public sealed class ReconnectCommandHandler(
    IAppDbContext store,
    RoomPlayerContext context,
    ICurrentPlayer caller,
    IRoomNotifier notifier,
    TimeProvider clock)
    : IRequestHandler<ReconnectCommand>
{
    public async Task Handle(ReconnectCommand request, CancellationToken cancellationToken)
    {
        var connectionId = caller.ConnectionId!;
        var (room, _) = await RoomChanges.SaveAsync(
            store,
            context,
            (room, player) =>
            {
                room.Return(player, connectionId);
                return true;
            },
            cancellationToken);
        await notifier.AttachAsync(connectionId, room.Id, cancellationToken);
        await notifier.SendRoomAsync(connectionId, RoomStateDto.Of(room), cancellationToken);
        if (GameStateDto.Of(room, clock.GetUtcNow()) is { } game)
        {
            await notifier.SendGameAsync(connectionId, game, cancellationToken);
        }
    }
}

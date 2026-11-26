using AroundTheWorld.Application.Common;
using MediatR;

namespace AroundTheWorld.Application.Rooms.Reconnect;

/// <summary>Adds the connection to its room's players and sends it the room as it stands.</summary>
public sealed class ReconnectCommandHandler(RoomPlayerContext context, ICurrentPlayer caller, IRoomNotifier notifier)
    : IRequestHandler<ReconnectCommand>
{
    public async Task Handle(ReconnectCommand request, CancellationToken cancellationToken)
    {
        var connectionId = caller.ConnectionId!;
        await notifier.AttachAsync(connectionId, context.Room.Id, cancellationToken);
        await notifier.SendRoomAsync(connectionId, RoomStateDto.Of(context.Room), cancellationToken);
    }
}

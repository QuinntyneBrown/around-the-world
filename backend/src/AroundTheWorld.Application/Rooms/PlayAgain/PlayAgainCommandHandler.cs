using AroundTheWorld.Application.Common;
using MediatR;

namespace AroundTheWorld.Application.Rooms.PlayAgain;

/// <summary>
/// Returns a room whose game is over to its Lobby, with the same players, host and setup, and
/// tells every player, whose device then opens the Lobby; any player may, and the first does
/// (L2-035 criterion 3, docs/adr/0033).
/// </summary>
public sealed class PlayAgainCommandHandler(IAppDbContext store, RoomPlayerContext context, IRoomNotifier notifier, TimeProvider clock)
    : IRequestHandler<PlayAgainCommand>
{
    public async Task Handle(PlayAgainCommand request, CancellationToken cancellationToken)
    {
        var now = clock.GetUtcNow();
        var (room, returned) = await RoomChanges.SaveAsync(store, context, (room, _) => room.PlayAgain(now), cancellationToken);
        if (returned)
        {
            await RoomChanges.AnnounceAsync(notifier, room, now, cancellationToken);
        }
    }
}

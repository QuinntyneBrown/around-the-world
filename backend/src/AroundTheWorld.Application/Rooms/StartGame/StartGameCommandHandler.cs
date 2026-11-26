using AroundTheWorld.Application.Common;
using MediatR;

namespace AroundTheWorld.Application.Rooms.StartGame;

/// <summary>
/// Starts the room's game for every player and tells them, the room and its game in the same
/// step; only the host may, with a friend in the room (L2-025 criteria 1, 2 and 4, docs/adr/0033).
/// </summary>
public sealed class StartGameCommandHandler(IAppDbContext store, RoomPlayerContext context, IRoomNotifier notifier, TimeProvider clock)
    : IRequestHandler<StartGameCommand>
{
    public async Task Handle(StartGameCommand request, CancellationToken cancellationToken)
    {
        var now = clock.GetUtcNow();
        var (room, _) = await RoomChanges.SaveAsync(store, context, (room, player) => { room.Start(player, now); return true; }, cancellationToken);
        await RoomChanges.AnnounceAsync(notifier, room, now, cancellationToken);
    }
}

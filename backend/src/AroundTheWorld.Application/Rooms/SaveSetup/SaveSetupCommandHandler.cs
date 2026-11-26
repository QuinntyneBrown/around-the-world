using AroundTheWorld.Application.Common;
using AroundTheWorld.Domain.Rooms;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AroundTheWorld.Application.Rooms.SaveSetup;

/// <summary>
/// Replaces the room's setup with the host's, saves it in one unit of work and tells every
/// player, so each Lobby shows it (L2-018 criterion 2). A refusal leaves the setup unchanged
/// (L2-025 criterion 4). A change that reached the room first makes the save try again.
/// </summary>
public sealed class SaveSetupCommandHandler(
    IAppDbContext store,
    RoomPlayerContext context,
    IRoomNotifier notifier,
    TimeProvider clock)
    : IRequestHandler<SaveSetupCommand>
{
    public async Task Handle(SaveSetupCommand request, CancellationToken cancellationToken)
    {
        var setup = GameSetups.Parse(request.Setup!);
        var (room, player) = (context.Room, context.Player);
        for (var tried = 1; ; tried++)
        {
            try
            {
                room.SaveSetup(player, setup, clock.GetUtcNow());
            }
            catch (RoomRuleException broken)
            {
                throw RoomRefusals.Of(broken.Rule);
            }

            try
            {
                await store.SaveChangesAsync(cancellationToken);
            }
            catch (DbUpdateConcurrencyException) when (tried < JoinRoom.JoinRoomCommandHandler.MaxTries)
            {
                (room, player) = await RoomPlayers.ReloadAsync(store, player.Token, cancellationToken);
                continue;
            }

            await notifier.RoomChangedAsync(room.Id, RoomStateDto.Of(room), cancellationToken);
            return;
        }
    }
}

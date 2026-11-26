using AroundTheWorld.Application.Common;
using AroundTheWorld.Domain.Rooms;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AroundTheWorld.Application.Rooms.JoinRoom;

/// <summary>
/// Finds the room the code names, adds the player, saves in one unit of work and tells the
/// players already in it (docs/detailed-designs/rooms/join-room/). When another change reached
/// the room first, the store refuses the save and the join is tried again on the room as it
/// now stands, so a room of 7 admits only one of two friends who join at once
/// (docs/adr/0032-joining-a-room-and-the-lobby.md).
/// </summary>
public sealed class JoinRoomCommandHandler(IAppDbContext store, IRoomNotifier notifier, TimeProvider clock)
    : IRequestHandler<JoinRoomCommand, RoomEntryDto>
{
    /// <summary>How many times a join meets a change made first before it gives up.</summary>
    public const int MaxTries = 5;

    public async Task<RoomEntryDto> Handle(JoinRoomCommand request, CancellationToken cancellationToken)
    {
        var code = RoomCode.Parse(request.Code)!;
        var kid = Kids.Parse(request.Kid!);
        var nickname = new Nickname(request.Nickname!.Adjective, request.Nickname.Animal);

        for (var tried = 1; ; tried++)
        {
            var room = await store.Rooms.SingleOrDefaultAsync(r => r.Code == code, cancellationToken)
                ?? throw new RefusedException(ErrorCodes.RoomNotFound, 404, "No room has that code.");
            RoomPlayer player;
            try
            {
                player = room.Join(kid, nickname, clock.GetUtcNow());
            }
            catch (RoomRuleException broken)
            {
                throw RoomRefusals.Of(broken.Rule);
            }

            try
            {
                await store.SaveChangesAsync(cancellationToken);
            }
            catch (DbUpdateConcurrencyException) when (tried < MaxTries)
            {
                store.Forget();
                continue;
            }

            var state = RoomStateDto.Of(room);
            await notifier.RoomChangedAsync(room.Id, state, cancellationToken);
            return new RoomEntryDto(room.Code.Value, player.Token.Value, player.Id, state);
        }
    }
}

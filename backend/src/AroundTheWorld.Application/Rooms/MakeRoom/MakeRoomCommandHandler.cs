using AroundTheWorld.Application.Common;
using AroundTheWorld.Domain.Rooms;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AroundTheWorld.Application.Rooms.MakeRoom;

/// <summary>
/// Draws codes until one no room holds, makes the room with the caller as its host and saves
/// it in one unit of work (docs/detailed-designs/rooms/make-room/). After
/// <see cref="MaxDraws"/> codes in use it refuses with <c>no_free_code</c> (ADR 0031).
/// </summary>
public sealed class MakeRoomCommandHandler(IAppDbContext store, IRoomCodeGenerator codes, TimeProvider clock)
    : IRequestHandler<MakeRoomCommand, RoomEntryDto>
{
    /// <summary>How many codes the handler draws before it gives up.</summary>
    public const int MaxDraws = 10;

    public async Task<RoomEntryDto> Handle(MakeRoomCommand request, CancellationToken cancellationToken)
    {
        var code = await DrawUnusedCodeAsync(cancellationToken);
        var room = Room.Make(
            code,
            Kids.Parse(request.Kid!),
            new Nickname(request.Nickname!.Adjective, request.Nickname.Animal),
            clock.GetUtcNow());
        store.Rooms.Add(room);
        await store.SaveChangesAsync(cancellationToken);

        var host = room.Players[0];
        return new RoomEntryDto(room.Code.Value, host.Token.Value, host.Id, RoomStateDto.Of(room));
    }

    private async Task<RoomCode> DrawUnusedCodeAsync(CancellationToken cancellationToken)
    {
        for (var draw = 0; draw < MaxDraws; draw++)
        {
            var code = codes.Draw();
            if (!await store.Rooms.AnyAsync(room => room.Code == code, cancellationToken))
            {
                return code;
            }
        }

        throw new RefusedException(ErrorCodes.NoFreeCode, 503, "No room code is free right now.");
    }
}

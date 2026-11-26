using AroundTheWorld.Application.Common;
using AroundTheWorld.Domain.Rooms;

namespace AroundTheWorld.Application.Rooms;

/// <summary>A room's rule refusing a request, as the refusal a screen branches on (L2-054 criterion 1).</summary>
public static class RoomRefusals
{
    public static RefusedException Of(RoomRule rule) => rule switch
    {
        RoomRule.Full => new RefusedException(ErrorCodes.RoomFull, 409, "That room is full."),
        RoomRule.GameStarted => new RefusedException(ErrorCodes.GameStarted, 409, "That room's game has started."),
        RoomRule.NotHost => new RefusedException(ErrorCodes.NotHost, 403, "Only the host may do that."),
        RoomRule.NotEnoughPlayers => new RefusedException(ErrorCodes.NotEnoughPlayers, 409, "A game needs at least two players."),
        _ => new RefusedException(ErrorCodes.NotInRoom, 403, "Not in a room."),
    };
}

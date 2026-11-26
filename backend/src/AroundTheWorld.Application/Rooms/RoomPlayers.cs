using AroundTheWorld.Application.Common;
using AroundTheWorld.Domain.Rooms;
using Microsoft.EntityFrameworkCore;

namespace AroundTheWorld.Application.Rooms;

/// <summary>Reads a player and their room again, after another change reached the room first.</summary>
public static class RoomPlayers
{
    /// <summary>Forgets what was read and finds the player who holds the token, and their room, as they now stand.</summary>
    public static async Task<(Room Room, RoomPlayer Player)> ReloadAsync(IAppDbContext store, ConnectionToken token, CancellationToken cancellationToken)
    {
        store.Forget();
        var room = await store.Rooms.SingleOrDefaultAsync(r => r.Players.Any(p => p.Token == token), cancellationToken)
            ?? throw new RefusedException(ErrorCodes.NotInRoom, 403, "Not in a room.");
        return (room, room.Players.Single(p => p.Token == token));
    }
}

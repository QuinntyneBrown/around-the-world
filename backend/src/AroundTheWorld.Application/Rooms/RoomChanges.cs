using AroundTheWorld.Application.Common;
using AroundTheWorld.Domain.Rooms;
using Microsoft.EntityFrameworkCore;

namespace AroundTheWorld.Application.Rooms;

/// <summary>
/// Applies a player's change to their room and saves it in one unit of work. When another change
/// reached the room first, the store refuses the save, and the change is applied again to the room
/// as it now stands, at most <see cref="JoinRoom.JoinRoomCommandHandler.MaxTries"/> times
/// (docs/adr/0032, docs/adr/0033). A rule's refusal is the refusal a screen branches on.
/// </summary>
public static class RoomChanges
{
    public static async Task<(Room Room, T Result)> SaveAsync<T>(
        IAppDbContext store,
        RoomPlayerContext context,
        Func<Room, RoomPlayer, T> change,
        CancellationToken cancellationToken)
    {
        var (room, player) = (context.Room, context.Player);
        for (var tried = 1; ; tried++)
        {
            T result;
            try
            {
                result = change(room, player);
            }
            catch (RoomRuleException broken)
            {
                throw RoomRefusals.Of(broken.Rule);
            }

            try
            {
                await store.SaveChangesAsync(cancellationToken);
                return (room, result);
            }
            catch (DbUpdateConcurrencyException) when (tried < JoinRoom.JoinRoomCommandHandler.MaxTries)
            {
                (room, player) = await RoomPlayers.ReloadAsync(store, player.Token, cancellationToken);
            }
        }
    }

    /// <summary>
    /// Tells every player of the room and, when it has one, of its game. While a game is played
    /// only the game changes, so the room is sent only when its players or its status change.
    /// </summary>
    public static async Task AnnounceAsync(IRoomNotifier notifier, Room room, DateTimeOffset now, CancellationToken cancellationToken, bool gameOnly = false)
    {
        if (!gameOnly || room.Status != RoomStatus.Playing)
        {
            await notifier.RoomChangedAsync(room.Id, RoomStateDto.Of(room), cancellationToken);
        }

        if (GameStateDto.Of(room, now) is { } game)
        {
            await notifier.GameChangedAsync(room.Id, game, cancellationToken);
        }
    }
}

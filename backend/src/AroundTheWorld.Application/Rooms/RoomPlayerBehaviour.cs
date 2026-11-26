using AroundTheWorld.Application.Common;
using AroundTheWorld.Domain.Rooms;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AroundTheWorld.Application.Rooms;

/// <summary>
/// A request a room's own player sends over their connection. It carries no room's code or id:
/// the room acted on is the one the connection's token names (L2-043 criteria 2 and 3).
/// </summary>
public interface IRoomPlayerRequest;

/// <summary>The player a room-player request came from, and their room, found by its token.</summary>
public sealed class RoomPlayerContext
{
    private Room? _room;
    private RoomPlayer? _player;

    public Room Room => _room ?? throw new InvalidOperationException("No room player was found for this request.");

    public RoomPlayer Player => _player ?? throw new InvalidOperationException("No room player was found for this request.");

    internal void Use(Room room, RoomPlayer player) => (_room, _player) = (room, player);
}

/// <summary>
/// Finds, for a room-player request, the player who holds the token the connection presented
/// and hands the handler that player and their room. With no such player it refuses with
/// <c>not_in_room</c> and nothing changes (L2-043 criterion 2). The hub itself checks nothing.
/// </summary>
public sealed class RoomPlayerBehaviour<TRequest, TResponse>(IAppDbContext store, ICurrentPlayer caller, RoomPlayerContext context)
    : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    public async Task<TResponse> Handle(TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken cancellationToken)
    {
        if (request is IRoomPlayerRequest)
        {
            var token = caller.Token is { Length: > 0 } presented ? ConnectionToken.From(presented) : null;
            var room = token is null
                ? null
                : await store.Rooms.SingleOrDefaultAsync(r => r.Players.Any(player => player.Token == token), cancellationToken);
            var player = room?.Players.Single(p => p.Token == token);
            if (room is null || player is null)
            {
                throw new RefusedException(ErrorCodes.NotInRoom, 403, "Not in a room.");
            }

            context.Use(room, player);
        }

        return await next(cancellationToken);
    }
}

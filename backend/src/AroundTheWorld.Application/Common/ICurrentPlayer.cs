namespace AroundTheWorld.Application.Common;

/// <summary>
/// The connection a hub request came from: the token it presented and its id
/// (docs/detailed-designs/rooms/guard-room/). The token is never logged.
/// </summary>
public interface ICurrentPlayer
{
    /// <summary>The connection token the connection presented, or null when it presented none.</summary>
    string? Token { get; }

    /// <summary>The id of the connection, or null outside a hub.</summary>
    string? ConnectionId { get; }
}

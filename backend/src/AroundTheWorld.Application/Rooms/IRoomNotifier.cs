namespace AroundTheWorld.Application.Rooms;

/// <summary>
/// Tells a room's players of a change as it is saved, over the room's one real-time channel
/// (docs/detailed-designs/rooms/wait-in-lobby/). No Lobby polls: this push is what shows a join
/// or a leave within 1 second (L2-024 criterion 2).
/// </summary>
public interface IRoomNotifier
{
    /// <summary>Adds a connection to the room's players, so it hears every later change.</summary>
    Task AttachAsync(string connectionId, Guid roomId, CancellationToken cancellationToken);

    /// <summary>Removes a connection from the room's players.</summary>
    Task DetachAsync(string connectionId, Guid roomId, CancellationToken cancellationToken);

    /// <summary>Sends the room as it stands to one connection.</summary>
    Task SendRoomAsync(string connectionId, RoomStateDto room, CancellationToken cancellationToken);

    /// <summary>Sends the room's new state to every connection attached to it.</summary>
    Task RoomChangedAsync(Guid roomId, RoomStateDto room, CancellationToken cancellationToken);

    /// <summary>Sends the game as it stands to one connection (docs/adr/0033).</summary>
    Task SendGameAsync(string connectionId, GameStateDto game, CancellationToken cancellationToken);

    /// <summary>
    /// Sends the game's new state to every connection attached to the room, in the step that saves
    /// it: every player sees the same game (L2-026 criterion 5, L2-027 criterion 1).
    /// </summary>
    Task GameChangedAsync(Guid roomId, GameStateDto game, CancellationToken cancellationToken);

    /// <summary>
    /// Sends a sticker to every connection attached to the room, the sender's included
    /// (L2-028 criterion 3, docs/adr/0035).
    /// </summary>
    Task StickerShownAsync(Guid roomId, StickerShownDto sticker, CancellationToken cancellationToken);
}

/// <summary>A sticker as the room's players are sent it: its id, 1 to 6, and the sender's player id.</summary>
public sealed record StickerShownDto(int Sticker, string From);

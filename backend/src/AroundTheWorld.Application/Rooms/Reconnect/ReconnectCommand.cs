using MediatR;

namespace AroundTheWorld.Application.Rooms.Reconnect;

/// <summary>
/// Attaches a connection to the place its token names, on its first connection and on every
/// one after, and sends it the room as it stands (docs/detailed-designs/rooms/wait-in-lobby/).
/// </summary>
public sealed record ReconnectCommand : IRequest, IRoomPlayerRequest;

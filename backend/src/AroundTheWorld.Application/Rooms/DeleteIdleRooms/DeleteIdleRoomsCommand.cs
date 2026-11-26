using MediatR;

namespace AroundTheWorld.Application.Rooms.DeleteIdleRooms;

/// <summary>
/// Deletes every room nobody has done anything in for <see cref="Domain.Rooms.Room.IdleLimit"/>
/// at <paramref name="Now"/>, with its players (L2-027 criterion 4); answers how many.
/// </summary>
public sealed record DeleteIdleRoomsCommand(DateTimeOffset Now) : IRequest<int>;

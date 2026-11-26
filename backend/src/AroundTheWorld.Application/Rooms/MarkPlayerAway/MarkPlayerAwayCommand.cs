using MediatR;

namespace AroundTheWorld.Application.Rooms.MarkPlayerAway;

/// <summary>
/// A connection was lost: its player's spot is held for 30 seconds from now (L2-029,
/// docs/adr/0036-coming-back-after-a-lost-connection.md). It is not a room player's request, so a
/// connection whose player has left or been removed ends in silence.
/// </summary>
public sealed record MarkPlayerAwayCommand : IRequest;

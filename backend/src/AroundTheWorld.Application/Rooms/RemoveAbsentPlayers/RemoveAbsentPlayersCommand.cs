using MediatR;

namespace AroundTheWorld.Application.Rooms.RemoveAbsentPlayers;

/// <summary>
/// Removes every player whose connection has been lost for 30 seconds or more by
/// <paramref name="Now"/> (L2-029 criteria 4, 5 and 6, docs/adr/0036). Answers how many rooms changed.
/// </summary>
public sealed record RemoveAbsentPlayersCommand(DateTimeOffset Now) : IRequest<int>;

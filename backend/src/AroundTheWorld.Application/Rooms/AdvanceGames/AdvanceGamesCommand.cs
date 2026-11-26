using MediatR;

namespace AroundTheWorld.Application.Rooms.AdvanceGames;

/// <summary>
/// Brings every playing room whose game is due by <paramref name="Now"/> up to that time: the
/// first card, a classmate's answer, a card's time running out, the next card (docs/adr/0033).
/// Answers how many rooms changed.
/// </summary>
public sealed record AdvanceGamesCommand(DateTimeOffset Now) : IRequest<int>;

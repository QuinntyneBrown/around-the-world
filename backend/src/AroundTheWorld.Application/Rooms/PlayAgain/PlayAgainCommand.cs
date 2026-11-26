using MediatR;

namespace AroundTheWorld.Application.Rooms.PlayAgain;

/// <summary>"Play again" on the Podium: the room returns to its Lobby (L2-035 criterion 3).</summary>
public sealed record PlayAgainCommand : IRequest, IRoomPlayerRequest;

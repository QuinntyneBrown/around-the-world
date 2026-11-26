using MediatR;

namespace AroundTheWorld.Application.Rooms.StartGame;

/// <summary>The host starts the room's game: "Start the race" (L2-025 criterion 2).</summary>
public sealed record StartGameCommand : IRequest, IRoomPlayerRequest;

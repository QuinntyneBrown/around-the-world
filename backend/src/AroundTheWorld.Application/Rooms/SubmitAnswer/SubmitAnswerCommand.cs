using MediatR;

namespace AroundTheWorld.Application.Rooms.SubmitAnswer;

/// <summary>
/// A player's answer: a number and nothing else, no time, no player and no room (L2-026
/// criterion 1, L2-040 criterion 1). The room is the one the connection's token names.
/// </summary>
public sealed record SubmitAnswerCommand(int Answer) : IRequest, IRoomPlayerRequest;

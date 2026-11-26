using MediatR;

namespace AroundTheWorld.Application.Rooms.SaveSetup;

/// <summary>
/// The host saves the game's setup to their room: setup values only, no free text (L2-018
/// criterion 2, L2-040 criterion 1).
/// </summary>
public sealed record SaveSetupCommand(GameSetupDto? Setup) : IRequest, IRoomPlayerRequest;

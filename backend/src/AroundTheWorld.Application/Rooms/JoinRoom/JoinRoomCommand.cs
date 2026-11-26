using MediatR;

namespace AroundTheWorld.Application.Rooms.JoinRoom;

/// <summary>
/// Joins the room a code names (L2-023 criterion 3). It carries the code as typed, a kid id
/// and the nickname's two indexes, and nothing else a child typed (L2-040 criterion 1).
/// </summary>
public sealed record JoinRoomCommand(string? Code, string? Kid, NicknameDto? Nickname) : IRequest<RoomEntryDto>;

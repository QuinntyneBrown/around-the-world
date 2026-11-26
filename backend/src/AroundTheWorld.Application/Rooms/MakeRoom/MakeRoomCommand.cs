using MediatR;

namespace AroundTheWorld.Application.Rooms.MakeRoom;

/// <summary>
/// Makes a room whose host is the caller (L2-022 criterion 1). It carries a kid id and the
/// nickname's two indexes, and nothing a child typed (L2-040 criterion 1).
/// </summary>
public sealed record MakeRoomCommand(string? Kid, NicknameDto? Nickname) : IRequest<RoomEntryDto>;

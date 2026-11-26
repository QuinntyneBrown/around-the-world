using MediatR;

namespace AroundTheWorld.Application.Rooms.LeaveRoom;

/// <summary>The player leaves their room (L2-025 criterion 5, L2-030 criterion 8).</summary>
public sealed record LeaveRoomCommand : IRequest, IRoomPlayerRequest;

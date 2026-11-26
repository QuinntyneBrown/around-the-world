using AroundTheWorld.Application.Rooms;
using Microsoft.AspNetCore.SignalR;

namespace AroundTheWorld.Api.Hubs;

/// <summary>
/// Tells a room's players of a change over <see cref="RoomHub"/>: each room is a SignalR group,
/// which Azure SignalR Service carries across instances in a deployed system.
/// </summary>
public sealed class HubRoomNotifier(IHubContext<RoomHub> hub) : IRoomNotifier
{
    public Task AttachAsync(string connectionId, Guid roomId, CancellationToken cancellationToken) =>
        hub.Groups.AddToGroupAsync(connectionId, Group(roomId), cancellationToken);

    public Task DetachAsync(string connectionId, Guid roomId, CancellationToken cancellationToken) =>
        hub.Groups.RemoveFromGroupAsync(connectionId, Group(roomId), cancellationToken);

    public Task SendRoomAsync(string connectionId, RoomStateDto room, CancellationToken cancellationToken) =>
        hub.Clients.Client(connectionId).SendAsync(RoomHub.RoomChanged, room, cancellationToken);

    public Task RoomChangedAsync(Guid roomId, RoomStateDto room, CancellationToken cancellationToken) =>
        hub.Clients.Group(Group(roomId)).SendAsync(RoomHub.RoomChanged, room, cancellationToken);

    private static string Group(Guid roomId) => $"room:{roomId:N}";
}

using AroundTheWorld.Application.Rooms;
using AroundTheWorld.Application.Rooms.LeaveRoom;
using AroundTheWorld.Application.Rooms.Reconnect;
using AroundTheWorld.Application.Rooms.SaveSetup;
using MediatR;
using Microsoft.AspNetCore.SignalR;

namespace AroundTheWorld.Api.Hubs;

/// <summary>
/// The room's one real-time channel (AGENTS.md, Backend). Each method checks nothing itself and
/// sends one MediatR request; the room is always the one the connection's token names
/// (docs/detailed-designs/rooms/wait-in-lobby/, docs/adr/0032-joining-a-room-and-the-lobby.md).
/// A connection whose token names no player is closed.
/// </summary>
public sealed class RoomHub(ISender sender) : Hub
{
    /// <summary>Where the hub is, on the game's own origin (docs/adr/0031-making-a-room.md).</summary>
    public const string Path = "/hubs/room";

    /// <summary>The event that carries the room's new state to its players.</summary>
    public const string RoomChanged = nameof(RoomChanged);

    /// <summary>Attaches the connection to its player's room and sends it the room as it stands.</summary>
    public override Task OnConnectedAsync() => sender.Send(new ReconnectCommand(), Context.ConnectionAborted);

    /// <summary>The host saves the game's setup to the room (L2-018 criterion 2).</summary>
    public Task SaveSetup(GameSetupDto? setup) => sender.Send(new SaveSetupCommand(setup), Context.ConnectionAborted);

    /// <summary>The player leaves their room (L2-025 criterion 5).</summary>
    public Task LeaveRoom() => sender.Send(new LeaveRoomCommand(), Context.ConnectionAborted);
}

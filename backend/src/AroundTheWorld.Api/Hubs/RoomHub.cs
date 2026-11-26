using AroundTheWorld.Application.Rooms;
using AroundTheWorld.Application.Rooms.LeaveRoom;
using AroundTheWorld.Application.Rooms.PlayAgain;
using AroundTheWorld.Application.Rooms.Reconnect;
using AroundTheWorld.Application.Rooms.SaveSetup;
using AroundTheWorld.Application.Rooms.SendSticker;
using AroundTheWorld.Application.Rooms.StartGame;
using AroundTheWorld.Application.Rooms.SubmitAnswer;
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

    /// <summary>The event that carries the game's new state to the room's players (docs/adr/0033).</summary>
    public const string GameChanged = nameof(GameChanged);

    /// <summary>The event that carries a sticker to the room's players (docs/adr/0035).</summary>
    public const string StickerShown = nameof(StickerShown);

    /// <summary>Attaches the connection to its player's room and sends it the room as it stands.</summary>
    public override Task OnConnectedAsync() => sender.Send(new ReconnectCommand(), Context.ConnectionAborted);

    /// <summary>The host saves the game's setup to the room (L2-018 criterion 2).</summary>
    public Task SaveSetup(GameSetupDto? setup) => sender.Send(new SaveSetupCommand(setup), Context.ConnectionAborted);

    /// <summary>The host starts the room's game (L2-025 criterion 2).</summary>
    public Task StartGame() => sender.Send(new StartGameCommand(), Context.ConnectionAborted);

    /// <summary>
    /// The player's answer, a number and nothing else (L2-026 criterion 1). There is no method by
    /// which a client claims a win, a hop or the end of a tour (L2-026 criterion 2).
    /// </summary>
    public Task SubmitAnswer(int answer) => sender.Send(new SubmitAnswerCommand(answer), Context.ConnectionAborted);

    /// <summary>
    /// A watching player's sticker, its id and nothing else (L2-028 criteria 2 and 3): there is no
    /// method by which a player sends text.
    /// </summary>
    public Task SendSticker(int sticker) => sender.Send(new SendStickerCommand(sticker), Context.ConnectionAborted);

    /// <summary>"Play again" from the Podium: the room returns to its Lobby (L2-035 criterion 3).</summary>
    public Task PlayAgain() => sender.Send(new PlayAgainCommand(), Context.ConnectionAborted);

    /// <summary>The player leaves their room (L2-025 criterion 5).</summary>
    public Task LeaveRoom() => sender.Send(new LeaveRoomCommand(), Context.ConnectionAborted);
}

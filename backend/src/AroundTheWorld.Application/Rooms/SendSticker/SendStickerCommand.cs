using MediatR;

namespace AroundTheWorld.Application.Rooms.SendSticker;

/// <summary>
/// A watching player's sticker: its id and nothing else, no text, no player and no room (L2-028
/// criterion 3, L2-040 criterion 1). The room is the one the connection's token names.
/// </summary>
public sealed record SendStickerCommand(int Sticker) : IRequest, IRoomPlayerRequest;

using AroundTheWorld.Domain.Rooms;
using MediatR;

namespace AroundTheWorld.Application.Rooms.SendSticker;

/// <summary>
/// Sends a watching player's sticker to every player of their room, the sender included, as its
/// id and the sender's player id. It ends in silence, with no error, when the id is not one of the
/// six, the room's game is not being played, or the current duel holds the sender (L2-028
/// criteria 3 and 4, docs/adr/0035). It saves nothing: a sticker is never written to the room
/// store (L2-046 criterion 1).
/// </summary>
public sealed class SendStickerCommandHandler(RoomPlayerContext context, IRoomNotifier notifier)
    : IRequestHandler<SendStickerCommand>
{
    public Task Handle(SendStickerCommand request, CancellationToken cancellationToken)
    {
        if (!StickerId.TryParse(request.Sticker, out var sticker) || !context.Room.MaySendSticker(context.Player))
        {
            return Task.CompletedTask;
        }

        return notifier.StickerShownAsync(
            context.Room.Id,
            new StickerShownDto(sticker.Value, context.Player.Id.ToString()),
            cancellationToken);
    }
}

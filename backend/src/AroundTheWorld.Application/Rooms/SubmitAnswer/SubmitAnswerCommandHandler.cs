using AroundTheWorld.Application.Common;
using AroundTheWorld.Domain.Tours;
using MediatR;

namespace AroundTheWorld.Application.Rooms.SubmitAnswer;

/// <summary>
/// Stamps the answer's arrival with the server's clock as it begins, applies it to the room's game
/// as it stands and saves it; an answer whose save meets a change saved first is applied again,
/// with the same arrival, to the room as it now stands. Every player is then told the game
/// (L2-026 criteria 1, 3, 4 and 7, L2-027 criterion 1, docs/adr/0033). The arrival is the only time
/// used; no client's time is read.
/// </summary>
public sealed class SubmitAnswerCommandHandler(
    IAppDbContext store,
    RoomPlayerContext context,
    IRoomNotifier notifier,
    TimeProvider clock,
    IRandomSource random)
    : IRequestHandler<SubmitAnswerCommand>
{
    public async Task Handle(SubmitAnswerCommand request, CancellationToken cancellationToken)
    {
        var receivedAt = clock.GetUtcNow();
        var (room, result) = await RoomChanges.SaveAsync(
            store,
            context,
            (room, player) => room.Answer(player, request.Answer, receivedAt, random),
            cancellationToken);
        if (result == AnswerResult.Ignored)
        {
            return;
        }

        await RoomChanges.AnnounceAsync(notifier, room, clock.GetUtcNow(), cancellationToken, gameOnly: true);
    }
}

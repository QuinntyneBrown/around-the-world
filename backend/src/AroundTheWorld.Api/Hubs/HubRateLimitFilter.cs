using Microsoft.AspNetCore.SignalR;

namespace AroundTheWorld.Api.Hubs;

/// <summary>
/// Limits how often one connection may send what the room's players would all see
/// (docs/detailed-designs/rooms/guard-room/, docs/adr/0035): one <c>SendSticker</c> a second,
/// counted on <see cref="TimeProvider"/>; the others are dropped without an error and never reach
/// <see cref="RoomHub"/> (L2-028 criterion 5). The time of the last sticker let through is kept in
/// the connection's own items, so it goes with the connection and nothing grows with the stickers
/// sent or the connections made.
/// </summary>
public sealed class HubRateLimitFilter(TimeProvider clock) : IHubFilter
{
    /// <summary>One sticker a second for each connection (L2-028 criterion 5).</summary>
    public static readonly TimeSpan StickerEvery = TimeSpan.FromSeconds(1);

    private const string LastStickerKey = "atw.last-sticker";

    public async ValueTask<object?> InvokeMethodAsync(
        HubInvocationContext invocationContext,
        Func<HubInvocationContext, ValueTask<object?>> next)
    {
        if (invocationContext.HubMethodName == nameof(RoomHub.SendSticker))
        {
            var items = invocationContext.Context.Items;
            var now = clock.GetUtcNow();
            if (items.TryGetValue(LastStickerKey, out var last) && last is DateTimeOffset at && now - at < StickerEvery)
            {
                return null;
            }

            items[LastStickerKey] = now;
        }

        return await next(invocationContext);
    }
}

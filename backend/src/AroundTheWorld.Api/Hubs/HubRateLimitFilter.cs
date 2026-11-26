using Microsoft.AspNetCore.SignalR;

namespace AroundTheWorld.Api.Hubs;

/// <summary>
/// Limits how often one connection may send an answer or what the room's players would all see
/// (docs/detailed-designs/rooms/guard-room/, docs/adr/0035, docs/adr/0037): 5 <c>SubmitAnswer</c>
/// a second (L2-045 criterion 3) and 1 <c>SendSticker</c> a second (L2-028 criterion 5) by
/// default, counted on <see cref="TimeProvider"/>. A message beyond its limit is dropped without
/// an error and never reaches <see cref="RoomHub"/>. The times of the last messages let through
/// are kept in the connection's own items, at most as many as the limit, so they go with the
/// connection and nothing grows with the messages sent or the connections made.
/// </summary>
public sealed class HubRateLimitFilter(TimeProvider clock, IConfiguration configuration) : IHubFilter
{
    /// <summary>The window each limit is counted in.</summary>
    public static readonly TimeSpan Window = TimeSpan.FromSeconds(1);

    private readonly Dictionary<string, int> _perSecond = new(StringComparer.Ordinal)
    {
        [nameof(RoomHub.SubmitAnswer)] = configuration.GetValue("RateLimits:Answers:PerSecond", 5),
        [nameof(RoomHub.SendSticker)] = configuration.GetValue("RateLimits:Stickers:PerSecond", 1),
    };

    public async ValueTask<object?> InvokeMethodAsync(
        HubInvocationContext invocationContext,
        Func<HubInvocationContext, ValueTask<object?>> next)
    {
        if (_perSecond.TryGetValue(invocationContext.HubMethodName, out var limit)
            && !LetThrough(invocationContext.Context.Items, invocationContext.HubMethodName, limit))
        {
            return null;
        }

        return await next(invocationContext);
    }

    /// <summary>
    /// Whether a message may pass: fewer than <paramref name="limit"/> passed in the last second.
    /// The times are a ring of <paramref name="limit"/> entries; the oldest is the one replaced.
    /// </summary>
    private bool LetThrough(IDictionary<object, object?> items, string method, int limit)
    {
        var key = $"atw.limit.{method}";
        if (!items.TryGetValue(key, out var kept) || kept is not Passed passed)
        {
            passed = new Passed(limit);
            items[key] = passed;
        }

        return passed.TryPass(clock.GetUtcNow());
    }

    /// <summary>The times of the last messages that passed, oldest next to be replaced.</summary>
    private sealed class Passed(int limit)
    {
        private readonly DateTimeOffset?[] _times = new DateTimeOffset?[Math.Max(limit, 0)];
        private int _oldest;

        public bool TryPass(DateTimeOffset now)
        {
            if (_times.Length == 0 || (_times[_oldest] is { } oldest && now - oldest < Window))
            {
                return false;
            }

            _times[_oldest] = now;
            _oldest = (_oldest + 1) % _times.Length;
            return true;
        }
    }
}

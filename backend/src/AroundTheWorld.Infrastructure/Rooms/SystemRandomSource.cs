using AroundTheWorld.Domain.Tours;

namespace AroundTheWorld.Infrastructure.Rooms;

/// <summary>The random numbers the server's flash cards are drawn from (docs/adr/0018).</summary>
public sealed class SystemRandomSource : IRandomSource
{
    public int Below(int limit) => Random.Shared.Next(limit);
}

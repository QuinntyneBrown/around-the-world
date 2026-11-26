namespace AroundTheWorld.Api.Rooms;

/// <summary>
/// Marks an endpoint as open to anyone, accepted without a connection token, and names its rate
/// limit policy in the same declaration (L2-045 criterion 1). Making a room, joining with a code
/// and the two health endpoints carry it, and nothing else does
/// (docs/detailed-designs/rooms/guard-room/, docs/adr/0037).
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = false)]
public sealed class OpenToAnyoneAttribute(string rateLimitPolicy) : Attribute
{
    public string RateLimitPolicy { get; } = rateLimitPolicy;
}

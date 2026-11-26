using MediatR;

namespace AroundTheWorld.Application.Health;

/// <summary>Asks whether this instance can serve a room now (L2-053 criterion 3).</summary>
public sealed record CheckReadinessQuery : IRequest<bool>;

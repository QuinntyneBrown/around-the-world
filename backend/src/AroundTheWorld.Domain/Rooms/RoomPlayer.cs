namespace AroundTheWorld.Domain.Rooms;

/// <summary>
/// One player in a room: the nickname's two indexes, the kid, the position and the connection
/// token (L2-046 criterion 1), with the host mark and the time of joining, which describe no
/// child (docs/adr/0031-making-a-room.md).
/// </summary>
public sealed class RoomPlayer
{
    private RoomPlayer()
    {
    }

    internal RoomPlayer(KidId kid, Nickname nickname, int position, bool isHost, ConnectionToken token, DateTimeOffset joinedAt)
    {
        Id = Guid.NewGuid();
        Kid = kid;
        Nickname = nickname;
        Position = position;
        IsHost = isHost;
        Token = token;
        JoinedAt = joinedAt;
    }

    public Guid Id { get; private set; }

    public KidId Kid { get; private set; }

    public Nickname Nickname { get; private set; } = null!;

    public int Position { get; private set; }

    public bool IsHost { get; private set; }

    public ConnectionToken Token { get; private set; } = null!;

    public DateTimeOffset JoinedAt { get; private set; }

    /// <summary>The id of the SignalR connection that last presented the player's token (docs/adr/0036).</summary>
    public string? ConnectionId { get; private set; }

    /// <summary>When the player's connection was lost, while their spot is held; null while connected.</summary>
    public DateTimeOffset? AwaySince { get; private set; }

    /// <summary>Whether the player has been away for the time their spot is held, at that time.</summary>
    public bool IsAbsentAt(DateTimeOffset now) => AwaySince is { } since && now - since >= Room.SpotHeldFor;

    /// <summary>Marks the player as the host, when the host left (L2-025 criterion 5).</summary>
    internal void BecomeHost() => IsHost = true;

    internal void Bind(string connectionId) => (ConnectionId, AwaySince) = (connectionId, null);

    internal bool MarkAway(string connectionId, DateTimeOffset now)
    {
        if (ConnectionId != connectionId || AwaySince is not null)
        {
            return false;
        }

        AwaySince = now;
        return true;
    }
}

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
}

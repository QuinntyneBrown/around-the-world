using AroundTheWorld.Domain.Rooms;

namespace AroundTheWorld.Application.Rooms;

/// <summary>A nickname as its two list indexes, as it travels (L2-040 criterion 1).</summary>
public sealed record NicknameDto(int Adjective, int Animal);

/// <summary>The room's setup, as every player's Lobby shows it.</summary>
public sealed record GameSetupDto(IReadOnlyList<string> Kinds, IReadOnlyList<int> Tables, int TourLength, string CardSpeed);

/// <summary>One player as every player in the room sees them: no token (L2-043).</summary>
public sealed record RoomPlayerDto(Guid Id, string Kid, NicknameDto Nickname, int Position, bool Host);

/// <summary>The room as its players see it: the code, the status, the setup and the players.</summary>
public sealed record RoomStateDto(string Code, string Status, GameSetupDto Setup, IReadOnlyList<RoomPlayerDto> Players)
{
    public static RoomStateDto Of(Room room) => new(
        room.Code.Value,
        Wire(room.Status),
        new GameSetupDto(
            [.. room.Setup.Kinds.Select(Wire)],
            [.. room.Setup.Tables],
            room.Setup.TourLength,
            Wire(room.Setup.CardSpeed)),
        [.. room.Players
            .OrderBy(player => player.Position)
            .Select(player => new RoomPlayerDto(
                player.Id,
                Wire(player.Kid),
                new NicknameDto(player.Nickname.Adjective, player.Nickname.Animal),
                player.Position,
                player.IsHost))]);

    /// <summary>An enumeration value as the game names it: <c>Zuri</c> is <c>zuri</c>.</summary>
    internal static string Wire<T>(T value)
        where T : struct, Enum => value.ToString().ToLowerInvariant();
}

/// <summary>
/// What a player receives on entering a room: the code, their connection token, their id in
/// the room and the room as it stands. The token is returned here once and nowhere else.
/// </summary>
public sealed record RoomEntryDto(string Code, string Token, Guid PlayerId, RoomStateDto Room);

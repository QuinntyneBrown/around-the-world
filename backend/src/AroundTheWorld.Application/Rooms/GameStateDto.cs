using AroundTheWorld.Domain.Rooms;
using AroundTheWorld.Domain.Tours;

namespace AroundTheWorld.Application.Rooms;

/// <summary>A flash card as it travels: the kind and the two numbers, never the answer (L2-026 criterion 5).</summary>
public sealed record CardDto(string Kind, int Left, int Right);

/// <summary>
/// One player of the game as every device sees them: a room's player by id, kid and nickname's
/// indexes, or a classmate (<c>classmate</c>); their distance travelled and their stamps.
/// </summary>
public sealed record GamePlayerDto(string Id, string Kid, NicknameDto? Nickname, int Distance, IReadOnlyList<int> Stamps);

/// <summary>
/// The duel of the last card dealt. While it is open it holds no answer; the time left and each
/// side's freeze left are durations from the moment it was sent, never a time of the server's.
/// </summary>
public sealed record GameDuelDto(
    int Number,
    int Desk,
    string Traveller,
    string DeskHolder,
    CardDto Card,
    int TimeLeftMs,
    int TravellerFrozenMs,
    int DeskHolderFrozenMs,
    int? TravellerWrong,
    int? DeskHolderWrong,
    string Outcome,
    string? Winner,
    int? Answer,
    int SinceDecidedMs);

/// <summary>What a decided duel did to the ring.</summary>
public sealed record TourMoveDto(string Kind, string Traveller, int From, int To, bool PassedEmptyDesk, string? SatDown);

/// <summary>
/// A room's game as every device is sent it, after each change (<c>GameChanged</c>,
/// docs/adr/0033-deciding-a-game-on-the-server.md): the tour length, the card's time, where the
/// game is, every player and classmate, each desk's holder, the traveller and their desk, the
/// standings, the current duel, the last move and how the tour ended. It holds one entry for
/// each player and desk and one duel, so it is bounded by the tour (L2-048 criterion 5).
/// </summary>
public sealed record GameStateDto(
    int TourLength,
    int SecondsToAnswer,
    string Phase,
    int FirstCardInMs,
    IReadOnlyList<GamePlayerDto> Players,
    IReadOnlyList<string?> Desks,
    string Traveller,
    int TravellerDesk,
    IReadOnlyList<string> Standings,
    GameDuelDto? Duel,
    TourMoveDto? LastMove,
    string? Ending,
    string? Winner)
{
    /// <summary>The room's game as it stands at <paramref name="now"/>, or null when it has none.</summary>
    public static GameStateDto? Of(Room room, DateTimeOffset now)
    {
        if (room.Game is not { } game)
        {
            return null;
        }

        var tour = game.Tour;
        var ordered = tour.Ordered();
        return new GameStateDto(
            game.TourLength,
            (int)game.CardTime.TotalSeconds,
            Camel(game.Phase),
            game.Phase == GamePhase.Starting ? Ms(game.NextCardAt - now) : 0,
            [.. game.Players.Select(player => new GamePlayerDto(
                player.Id,
                player.Kid is { } kid ? RoomStateDto.Wire(kid) : "classmate",
                player.Nickname is { } nickname ? new NicknameDto(nickname.Adjective, nickname.Animal) : null,
                tour.DistanceOf(player.Id),
                [.. tour.StampsOf(player.Id)]))],
            [.. tour.Holders],
            tour.Traveller,
            tour.Desk,
            [.. ordered.Select(runner => runner.Player)],
            DuelOf(game, now),
            game.LastMove is { } move
                ? new TourMoveDto(Camel(move.Kind), move.Traveller, move.From, move.To, move.PassedEmptyDesk, move.SatDown)
                : null,
            game.Ending is { } ending ? Camel(ending) : null,
            game.Ending is null ? null : ordered[0].Player);
    }

    private static GameDuelDto? DuelOf(RoomGame game, DateTimeOffset now)
    {
        if (game.Duel is not { } duel)
        {
            return null;
        }

        var open = duel.Outcome == DuelOutcome.Open;
        return new GameDuelDto(
            game.CardsDealt,
            game.DuelDesk,
            duel.Traveller,
            duel.DeskHolder,
            new CardDto(RoomStateDto.Wire(duel.Card.Kind), duel.Card.Left, duel.Card.Right),
            open ? Ms(game.CardDeadline - now) : 0,
            open ? Ms(duel.TravellerFrozenUntil - now) : 0,
            open ? Ms(duel.DeskHolderFrozenUntil - now) : 0,
            duel.TravellerWrong,
            duel.DeskHolderWrong,
            Camel(duel.Outcome),
            duel.Winner is { } winner ? Camel(winner) : null,
            open ? null : duel.Card.Answer(),
            game.DecidedAt is { } decided ? Ms(now - decided) : 0);
    }

    /// <summary>A duration in whole milliseconds, never below 0.</summary>
    private static int Ms(TimeSpan? span) => span is { } value && value > TimeSpan.Zero ? (int)value.TotalMilliseconds : 0;

    /// <summary>An enumeration value as the game names it: <c>DeskHolder</c> is <c>deskHolder</c>.</summary>
    private static string Camel<T>(T value)
        where T : struct, Enum
    {
        var name = value.ToString();
        return char.ToLowerInvariant(name[0]) + name[1..];
    }
}

using AroundTheWorld.Domain.Rooms;

namespace AroundTheWorld.Application.Rooms;

/// <summary>A setup as it travels, checked against what Game Setup offers (L2-016, L2-017, L2-018 criterion 4).</summary>
public static class GameSetups
{
    private static readonly Dictionary<string, MathsKind> Kinds =
        Enum.GetValues<MathsKind>().ToDictionary(kind => RoomStateDto.Wire(kind), StringComparer.Ordinal);

    private static readonly Dictionary<string, CardSpeed> Speeds =
        Enum.GetValues<CardSpeed>().ToDictionary(speed => RoomStateDto.Wire(speed), StringComparer.Ordinal);

    private static readonly int[] TourLengths = [6, 12, 24];

    /// <summary>Whether every value is one Game Setup offers.</summary>
    public static bool IsOffered(GameSetupDto? setup)
    {
        if (setup?.Kinds is not { Count: > 0 } kinds || setup.Tables is not { } tables)
        {
            return false;
        }

        var kindsOffered = kinds.All(kind => kind is not null && Kinds.ContainsKey(kind)) && kinds.Distinct().Count() == kinds.Count;
        var tablesOffered = tables.All(table => table is >= 2 and <= 12) && tables.Distinct().Count() == tables.Count;
        var timesHasTables = !kinds.Contains("times") || tables.Count > 0;
        return kindsOffered && tablesOffered && timesHasTables
            && TourLengths.Contains(setup.TourLength)
            && setup.CardSpeed is not null && Speeds.ContainsKey(setup.CardSpeed);
    }

    /// <summary>The domain's setup from one that is offered, its kinds and tables in Game Setup's order.</summary>
    public static GameSetup Parse(GameSetupDto setup) => GameSetup.Of(
        setup.Kinds.Select(kind => Kinds[kind]).Order(),
        setup.Tables.Order(),
        setup.TourLength,
        Speeds[setup.CardSpeed]);
}

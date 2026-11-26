using System.Text.Json;
using AroundTheWorld.Domain.Rooms;
using AroundTheWorld.Domain.Tours;

namespace AroundTheWorld.UnitTests.Tours;

/// <summary>
/// L2-001 to L2-007: the server's duel and tour play every case of the table the device's rules
/// play too (docs/specs/tour-cases.json, docs/adr/0033-deciding-a-game-on-the-server.md), one
/// case per row, so a rule changed on one side alone fails the other's run.
/// </summary>
public sealed class TourCasesTests
{
    private static readonly DateTimeOffset Start = new(2026, 1, 5, 9, 0, 0, TimeSpan.Zero);

    private static readonly JsonElement Cases = JsonDocument.Parse(
        File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "Tours", "tour-cases.json"))).RootElement;

    public static TheoryData<string> Duels() => [.. Cases.GetProperty("duels").EnumerateArray().Select(c => c.GetProperty("id").GetString()!)];

    public static TheoryData<string> Tours() => [.. Cases.GetProperty("tours").EnumerateArray().Select(c => c.GetProperty("id").GetString()!)];

    [Theory]
    [MemberData(nameof(Duels))]
    public void The_server_duel_plays_the_shared_case(string id)
    {
        var duelCase = Find("duels", id);
        var card = duelCase.GetProperty("card");
        var duel = new Duel(
            new Card(Enum.Parse<MathsKind>(card.GetProperty("kind").GetString()!, ignoreCase: true), card.GetProperty("left").GetInt32(), card.GetProperty("right").GetInt32()),
            "T",
            "H");
        foreach (var step in duelCase.GetProperty("steps").EnumerateArray())
        {
            if (step.TryGetProperty("timeOut", out _))
            {
                Assert.Equal(step.GetProperty("result").GetBoolean(), duel.TimeOut());
                continue;
            }

            var by = step.GetProperty("by").GetString() switch { "traveller" => "T", "deskHolder" => "H", _ => "O" };
            var result = duel.Give(by, step.GetProperty("value").GetInt32(), At(step.GetProperty("atMs")));
            Assert.Equal(step.GetProperty("result").GetString(), Wire(result));
        }

        Assert.Equal(duelCase.GetProperty("outcome").GetString(), Wire(duel.Outcome));
        var winner = duelCase.GetProperty("winner");
        Assert.Equal(winner.ValueKind == JsonValueKind.Null ? null : winner.GetString(), duel.Winner is { } side ? Wire(side) : null);
    }

    [Theory]
    [MemberData(nameof(Tours))]
    public void The_server_tour_plays_the_shared_case(string id)
    {
        var tourCase = Find("tours", id);
        var length = tourCase.GetProperty("tourLength").GetInt32();
        var endsAt = tourCase.TryGetProperty("endsAtMs", out var ends) ? At(ends) : DateTimeOffset.MaxValue;
        var seated = tourCase.GetProperty("seated").EnumerateArray().Select(desk => (desk.GetInt32(), $"P{desk.GetInt32()}")).ToList();
        var tour = Tour.Start(length, "T", seated, Start, endsAt);

        foreach (var duel in tourCase.GetProperty("duels").EnumerateArray())
        {
            var winner = duel.GetProperty("winner").GetString() == "traveller" ? DuelSide.Traveller : DuelSide.DeskHolder;
            var move = tour.ApplyDuel(winner, At(duel.GetProperty("atMs")));
            if (duel.TryGetProperty("move", out var expected))
            {
                Assert.Equal(expected.GetProperty("kind").GetString(), Wire(move.Kind));
                Assert.Equal(expected.GetProperty("traveller").GetString(), move.Traveller);
                Assert.Equal(expected.GetProperty("from").GetInt32(), move.From);
                Assert.Equal(expected.GetProperty("to").GetInt32(), move.To);
                Assert.Equal(expected.GetProperty("passedEmptyDesk").GetBoolean(), move.PassedEmptyDesk);
                var satDown = expected.GetProperty("satDown");
                Assert.Equal(satDown.ValueKind == JsonValueKind.Null ? null : satDown.GetString(), move.SatDown);
            }
        }

        var then = tourCase.GetProperty("then");
        Assert.Equal(then.GetProperty("traveller").GetString(), tour.Traveller);
        Assert.Equal(then.GetProperty("desk").GetInt32(), tour.Desk);
        if (then.TryGetProperty("holders", out var holders))
        {
            Assert.Equal(holders.EnumerateArray().Select(h => h.ValueKind == JsonValueKind.Null ? null : h.GetString()), tour.Holders);
        }

        if (then.TryGetProperty("distances", out var distances))
        {
            foreach (var distance in distances.EnumerateObject())
            {
                Assert.Equal(distance.Value.GetInt32(), tour.DistanceOf(distance.Name));
            }
        }

        if (then.TryGetProperty("stamps", out var stamps))
        {
            foreach (var player in stamps.EnumerateObject())
            {
                Assert.Equal(player.Value.EnumerateArray().Select(desk => desk.GetInt32()), tour.StampsOf(player.Name));
            }
        }

        if (then.TryGetProperty("ordered", out var ordered))
        {
            Assert.Equal(ordered.EnumerateArray().Select(p => p.GetString()), tour.Ordered().Select(r => r.Player));
        }

        var ending = then.GetProperty("ending");
        Assert.Equal(ending.ValueKind == JsonValueKind.Null ? null : ending.GetString(), tour.Ending(At(then.GetProperty("endingAtMs"))) is { } e ? Wire(e) : null);
    }

    private static JsonElement Find(string table, string id) =>
        Cases.GetProperty(table).EnumerateArray().Single(c => c.GetProperty("id").GetString() == id);

    private static DateTimeOffset At(JsonElement ms) => Start.AddMilliseconds(ms.GetInt64());

    /// <summary>An enumeration value as the table names it: <c>DeskHolder</c> is <c>deskHolder</c>.</summary>
    private static string Wire<T>(T value)
        where T : struct, Enum
    {
        var name = value.ToString();
        return char.ToLowerInvariant(name[0]) + name[1..];
    }
}

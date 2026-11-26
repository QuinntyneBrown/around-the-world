using AroundTheWorld.Domain.Rooms;

namespace AroundTheWorld.Application.Rooms;

/// <summary>The five kids' ids as the game sends them: <c>zuri</c>, <c>kenji</c>, <c>nia</c>, <c>milo</c>, <c>pip</c>.</summary>
public static class Kids
{
    private static readonly Dictionary<string, KidId> ById =
        Enum.GetValues<KidId>().ToDictionary(kid => RoomStateDto.Wire(kid), StringComparer.Ordinal);

    public static bool IsKid(string? id) => id is not null && ById.ContainsKey(id);

    public static KidId Parse(string id) => ById[id];
}

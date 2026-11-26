using System.Reflection;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.Json.Serialization.Metadata;
using AroundTheWorld.Domain.Tours;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace AroundTheWorld.Infrastructure.Persistence;

/// <summary>
/// A room's game as one JSON column (docs/adr/0033-deciding-a-game-on-the-server.md). The domain's
/// types keep their state behind private setters; this reads and writes them without the domain
/// knowing how it is stored. It holds ids, kids, numbers and times, nothing about a child (L2-046).
/// </summary>
internal static class GameColumn
{
    private static readonly JsonSerializerOptions Options = new()
    {
        Converters = { new JsonStringEnumConverter() },
        TypeInfoResolver = new DefaultJsonTypeInfoResolver { Modifiers = { WithPrivateSetters } },
    };

    public static readonly ValueConverter<RoomGame?, string?> Converter = new(
        game => Write(game),
        json => Read(json));

    /// <summary>Compares two games by what is stored, and snapshots one as a copy, so a game changed in place is saved.</summary>
    public static readonly ValueComparer<RoomGame?> Comparer = new(
        (one, other) => Write(one) == Write(other),
        game => (Write(game) ?? string.Empty).GetHashCode(StringComparison.Ordinal),
        game => Read(Write(game)));

    private static string? Write(RoomGame? game) => game is null ? null : JsonSerializer.Serialize(game, Options);

    private static RoomGame? Read(string? json) => json is null ? null : JsonSerializer.Deserialize<RoomGame>(json, Options);

    /// <summary>
    /// Makes each domain type with a private parameterless constructor from it, writes each
    /// property through its private setter, and leaves out the properties worked out from others.
    /// </summary>
    private static void WithPrivateSetters(JsonTypeInfo info)
    {
        if (info.Kind != JsonTypeInfoKind.Object || info.Type.Assembly != typeof(RoomGame).Assembly)
        {
            return;
        }

        if (info.Type.GetConstructor(BindingFlags.Instance | BindingFlags.NonPublic, Type.EmptyTypes) is { } made)
        {
            info.CreateObject = () => made.Invoke(null);
        }

        foreach (var property in info.Properties.ToList())
        {
            var setter = (property.AttributeProvider as PropertyInfo)?.GetSetMethod(nonPublic: true);
            if (setter is null)
            {
                info.Properties.Remove(property);
            }
            else if (property.Set is null)
            {
                property.Set = (target, value) => setter.Invoke(target, [value]);
            }
        }
    }
}

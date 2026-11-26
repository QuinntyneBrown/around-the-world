using System.Net.Http.Json;
using AroundTheWorld.Api.Tests.Support;
using AroundTheWorld.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace AroundTheWorld.Api.Tests.Rooms;

/// <summary>
/// L2-027 criterion 4, L2-046 criterion 2: a room nobody has done anything in for 10 minutes is
/// deleted, and the store then holds nothing about it (docs/adr/0031-making-a-room.md).
/// </summary>
public sealed class IdleRoomTests(ApiFixture api) : IClassFixture<ApiFixture>
{
    private static CancellationToken Cancel => TestContext.Current.CancellationToken;

    [Fact]
    public async Task Given_a_room_nobody_has_touched_when_10_minutes_pass_then_it_and_its_players_are_deleted()
    {
        // Given a room made now
        using var client = api.CreateClient();
        using var made = await client.PostAsJsonAsync(RoomRequests.Path, RoomRequests.Make("milo", 4, 5), Cancel);
        var code = (await made.Content.ReadFromJsonAsync<RoomEntryBody>(Cancel))!.Code;

        // When 10 minutes pass with nothing done in it, and the rooms are swept
        var sweep = api.SweepAt(api.Clock.GetUtcNow().AddMinutes(10));
        api.Clock.Advance(TimeSpan.FromMinutes(10));
        await sweep;

        // Then the store holds nothing about it
        await using var scope = api.Services.CreateAsyncScope();
        var store = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.False(await store.Rooms.AnyAsync(room => room.Code.Value == code, Cancel));
        Assert.Equal(0, await store.Set<Domain.Rooms.RoomPlayer>().CountAsync(Cancel));
    }

    [Fact]
    public async Task Given_a_room_made_9_minutes_ago_when_the_rooms_are_swept_then_it_is_kept()
    {
        // Given a room made 9 minutes ago
        using var client = api.CreateClient();
        using var made = await client.PostAsJsonAsync(RoomRequests.Path, RoomRequests.Make("zuri", 1, 1), Cancel);
        var code = (await made.Content.ReadFromJsonAsync<RoomEntryBody>(Cancel))!.Code;
        var sweep = api.SweepAt(api.Clock.GetUtcNow().AddMinutes(9));
        api.Clock.Advance(TimeSpan.FromMinutes(9));

        // When the rooms are swept
        await sweep;

        // Then it is kept
        await using var scope = api.Services.CreateAsyncScope();
        var store = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.True(await store.Rooms.AnyAsync(room => room.Code.Value == code, Cancel));
    }
}

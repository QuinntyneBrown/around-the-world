using AroundTheWorld.Api.Tests.Support;
using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.SignalR.Client;

namespace AroundTheWorld.Api.Tests.Rooms;

/// <summary>
/// L2-045 criterion 3: one connection's answers beyond 5 a second are dropped before they reach
/// the room, without an error (docs/detailed-designs/rooms/guard-room/, docs/adr/0037).
/// </summary>
public sealed class AnswerRateLimitTests(ApiFixture api) : IClassFixture<ApiFixture>
{
    private static CancellationToken Cancel => TestContext.Current.CancellationToken;

    [Fact]
    public async Task Given_a_connection_has_sent_5_answers_in_a_second_when_it_sends_more_then_they_are_dropped_until_a_second_has_passed()
    {
        // Given a player connected to their room
        using var http = api.CreateClient();
        var host = await RoomRequests.MakeAsync(http);
        await using var hub = await RoomHubClient.ConnectAsync(api, host.Token);
        await hub.WaitForAsync("the room", room => room.Players.Count == 1);

        // When they send 7 answers at the same moment
        for (var answer = 0; answer < 7; answer++)
        {
            try
            {
                await hub.Connection.InvokeAsync("SubmitAnswer", answer, Cancel);
            }
            catch (HubException)
            {
                // The room's own refusal (no game is playing); the limit is what is measured.
            }
        }

        // Then only 5 reached the room; the others were dropped
        Assert.Equal(5, api.HandledCount("SubmitAnswerCommand", host.Token));

        // And a second later an answer reaches the room again
        api.Clock.Advance(TimeSpan.FromSeconds(1));
        await Assert.ThrowsAsync<HubException>(() => hub.Connection.InvokeAsync("SubmitAnswer", 7, Cancel));
        Assert.Equal(6, api.HandledCount("SubmitAnswerCommand", host.Token));
    }
}

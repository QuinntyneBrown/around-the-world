using AroundTheWorld.Api.Tests.Support;
using AroundTheWorld.Domain.Rooms;
using AroundTheWorld.Domain.Tours;
using AroundTheWorld.Infrastructure.Persistence;
using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.SignalR.Client;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace AroundTheWorld.Api.Tests.Rooms;

/// <summary>
/// L2-001, L2-002, L2-003, L2-004, L2-005, L2-026, L2-027 criteria 1, 5 and 6, L2-044 criterion 1:
/// the server decides every duel of a game with friends from the answers it receives, applies the
/// freeze, the hop, the sit and a card nobody answers itself, and every player is sent the same
/// game (docs/detailed-designs/rooms/decide-game-on-server/, docs/adr/0033).
/// </summary>
public sealed class DecideDuelTests(ApiFixture api) : IClassFixture<ApiFixture>
{
    private static CancellationToken Cancel => TestContext.Current.CancellationToken;

    [Fact]
    public async Task Given_a_duel_when_the_traveller_answers_correctly_first_then_everyone_sees_the_hop_and_the_desk_holders_answer_is_ignored()
    {
        // Given the host travelling against the friend at desk 2 over the first card
        await using var race = await RaceAsync();
        var card = race.Card;

        // When the host answers it correctly, then the friend does
        await race.HostHub.Connection.InvokeAsync("SubmitAnswer", card.Answer(), Cancel);
        await race.FriendHub.Connection.InvokeAsync("SubmitAnswer", card.Answer(), Cancel);

        // Then every player sees the host win, the answer, the hop to desk 3 and the positions
        // (L2-001 criteria 1 and 4, L2-002 criteria 1 to 3, L2-027 criterion 1)
        var seen = await race.FriendHub.WaitForGameAsync("the duel decided", game => game.Phase == "decided");
        Assert.Equal("won", seen.Duel!.Outcome);
        Assert.Equal("traveller", seen.Duel.Winner);
        Assert.Equal(card.Answer(), seen.Duel.Answer);
        Assert.Equal(new TourMoveBody("hop", race.Host, 2, 3, false, null), seen.LastMove);
        Assert.Equal(race.Host, seen.Traveller);
        Assert.Equal(3, seen.TravellerDesk);
        Assert.Equal(race.Friend, seen.Desks[1]);
        Assert.Equal(2, seen.Player(race.HostId).Distance);
        Assert.Equal([1, 3], seen.Player(race.HostId).Stamps);
        Assert.Equal(race.Host, seen.Standings[0]);
        Assert.Single(race.HostHub.Games(), game => game.Phase == "decided");
    }

    [Fact]
    public async Task Given_a_duel_when_the_desk_holder_wins_then_they_travel_on_and_the_beaten_traveller_sits_down()
    {
        await using var race = await RaceAsync();

        await race.FriendHub.Connection.InvokeAsync("SubmitAnswer", race.Card.Answer(), Cancel);

        // L2-001 criterion 2, L2-003 criteria 1 to 3
        var seen = await race.HostHub.WaitForGameAsync("the duel decided", game => game.Phase == "decided");
        Assert.Equal("deskHolder", seen.Duel!.Winner);
        Assert.Equal(new TourMoveBody("deskHolderTravels", race.Friend, 2, 3, false, race.Host), seen.LastMove);
        Assert.Equal(race.Friend, seen.Traveller);
        Assert.Equal(race.Host, seen.Desks[1]);
        Assert.Equal(1, seen.Player(race.FriendId).Distance);
        Assert.Empty(seen.Player(race.FriendId).Stamps);
    }

    [Fact]
    public async Task Given_a_wrong_answer_when_the_same_player_answers_again_within_1_second_then_it_is_ignored_and_the_rival_can_still_win()
    {
        await using var race = await RaceAsync();
        var wrong = race.Card.Answer() + 1;

        // When the host answers wrongly, then correctly at once, then the friend answers correctly
        await race.HostHub.Connection.InvokeAsync("SubmitAnswer", wrong, Cancel);
        var frozen = await race.FriendHub.WaitForGameAsync("the host frozen", game => game.Duel?.TravellerWrong is not null);
        await race.HostHub.Connection.InvokeAsync("SubmitAnswer", race.Card.Answer(), Cancel);
        await api.PassAsync(TimeSpan.FromMilliseconds(500));
        await race.FriendHub.Connection.InvokeAsync("SubmitAnswer", race.Card.Answer(), Cancel);

        // Then everyone saw the host frozen for 1 second with the wrong answer (L2-004 criterion 1),
        // the host's answer while frozen was ignored whatever the device showed (L2-026 criterion 4),
        // and the friend won (L2-004 criterion 3)
        Assert.Equal(wrong, frozen.Duel!.TravellerWrong);
        Assert.Equal(1000, frozen.Duel.TravellerFrozenMs);
        Assert.Equal(0, frozen.Duel.DeskHolderFrozenMs);
        var seen = await race.HostHub.WaitForGameAsync("the duel decided", game => game.Phase == "decided");
        Assert.Equal("deskHolder", seen.Duel!.Winner);
    }

    [Fact]
    public async Task Given_a_frozen_player_when_1_second_has_passed_then_they_can_answer_the_same_card_again()
    {
        await using var race = await RaceAsync();
        await race.HostHub.Connection.InvokeAsync("SubmitAnswer", race.Card.Answer() + 1, Cancel);
        await race.FriendHub.WaitForGameAsync("the host frozen", game => game.Duel?.TravellerWrong is not null);

        await api.PassAsync(TimeSpan.FromSeconds(1));
        await race.HostHub.Connection.InvokeAsync("SubmitAnswer", race.Card.Answer(), Cancel);

        // L2-004 criterion 2
        var seen = await race.FriendHub.WaitForGameAsync("the duel decided", game => game.Phase == "decided");
        Assert.Equal("traveller", seen.Duel!.Winner);
    }

    [Fact]
    public async Task Given_a_card_nobody_answers_when_its_time_runs_out_then_everyone_sees_its_answer_and_the_same_two_get_a_new_card_2_seconds_later()
    {
        await using var race = await RaceAsync();

        // When the card's 6 seconds pass with no correct answer
        await api.PassAsync(TimeSpan.FromSeconds(6));

        // Then nobody hops and every player sees "Time's up!" with the answer (L2-005 2, L2-026 6)
        var timeUp = await race.FriendHub.WaitForGameAsync("time up", game => game.Phase == "timeUp");
        Assert.Equal("timedOut", timeUp.Duel!.Outcome);
        Assert.Equal(race.Card.Answer(), timeUp.Duel.Answer);
        Assert.Null(timeUp.LastMove);
        Assert.Equal(2, timeUp.TravellerDesk);

        // When 2 more seconds pass
        await api.PassAsync(TimeSpan.FromSeconds(2));

        // Then the same two players duel over a new card, nobody frozen
        var next = await race.FriendHub.WaitForGameAsync("the second card", game => game.Duel?.Number == 2);
        Assert.Equal("open", next.Duel!.Outcome);
        Assert.Equal((race.Host, race.Friend), (next.Duel.Traveller, next.Duel.DeskHolder));
        Assert.NotEqual(race.Card, next.Duel.Card);
        Assert.Equal(0, next.Duel.TravellerFrozenMs);
    }

    [Fact]
    public async Task Given_a_decided_duel_when_3_point_8_seconds_pass_then_the_next_card_is_dealt_and_a_classmate_answers_at_its_pace()
    {
        // Given the host has won at desk 2
        await using var race = await RaceAsync();
        await race.HostHub.Connection.InvokeAsync("SubmitAnswer", race.Card.Answer(), Cancel);
        await race.HostHub.WaitForGameAsync("the duel decided", game => game.Phase == "decided");

        // When 3.8 seconds pass (L2-027 criterion 6)
        await api.PassAsync(TimeSpan.FromMilliseconds(3800));

        // Then the host duels the classmate at desk 3
        var second = await race.FriendHub.WaitForGameAsync("the second card", game => game.Duel?.Number == 2);
        Assert.Equal(3, second.Duel!.Desk);
        Assert.Equal("classmate", second.Players.Single(player => player.Id == second.Duel.DeskHolder).Kid);

        // When 80% of the card's time passes, the pace of a classmate at desk 3 (L2-027 criterion 5)
        await api.PassAsync(TimeSpan.FromMilliseconds(4800));

        // Then the classmate's right answer won, and the host sits at desk 3
        var seen = await race.FriendHub.WaitForGameAsync("the classmate's win", game => game.Duel?.Number == 2 && game.Phase == "decided");
        Assert.Equal("deskHolder", seen.Duel!.Winner);
        Assert.Equal(race.Host, seen.Desks[2]);
    }

    [Fact]
    public async Task Given_a_duel_when_a_client_claims_a_win_a_hop_or_the_end_of_the_tour_then_the_claim_reaches_nothing()
    {
        await using var race = await RaceAsync();

        foreach (var claim in new[] { "ClaimWin", "Hop", "EndTour" })
        {
            await Assert.ThrowsAsync<HubException>(() => race.HostHub.Connection.InvokeAsync(claim, Cancel));
        }

        // L2-026 criterion 2: the duel is still open at desk 2
        var room = await RoomAsync(race.Code);
        Assert.Equal(DuelOutcome.Open, room.Game!.Duel!.Outcome);
        Assert.Equal(2, room.Game.Tour.Desk);
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(1000)]
    public async Task Given_an_answer_that_is_not_a_whole_number_from_0_to_999_when_it_arrives_then_it_is_refused_with_invalid_answer(int answer)
    {
        await using var race = await RaceAsync();

        var refused = await Assert.ThrowsAsync<HubException>(() => race.HostHub.Connection.InvokeAsync("SubmitAnswer", answer, Cancel));

        // L2-044 criterion 1
        Assert.Contains("invalid_answer", refused.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Given_a_room_still_waiting_when_an_answer_arrives_then_it_is_refused_with_not_playing()
    {
        using var http = api.CreateClient();
        var host = await RoomRequests.MakeAsync(http);
        await using var hostHub = await RoomHubClient.ConnectAsync(api, host.Token);
        await hostHub.WaitForAsync("the host alone", state => state.Players.Count == 1);

        var refused = await Assert.ThrowsAsync<HubException>(() => hostHub.Connection.InvokeAsync("SubmitAnswer", 24, Cancel));

        Assert.Contains("not_playing", refused.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Given_two_correct_answers_together_when_the_desk_holders_is_saved_first_then_the_travellers_finds_the_duel_won_and_is_ignored()
    {
        // Given the first card, and a store in which the friend's correct answer is saved just
        // before the host's, which arrived at the same moment
        await using var race = await RaceAsync();
        var answer = race.Card.Answer();
        using var racing = api.WithFirstSaveRacedBy(async store =>
        {
            var room = await store.Rooms.SingleAsync(r => r.Code.Value == race.Code, Cancel);
            var friend = room.Players.Single(player => player.Id == race.FriendId);
            room.Answer(friend, answer, api.Clock.GetUtcNow(), new FirstRandom());
            await store.SaveChangesAsync(Cancel);
        });
        await using var hostOnRacing = await RoomHubClient.ConnectAsync(racing.Server, race.HostToken);
        await hostOnRacing.WaitForGameAsync("the first card", game => game.Duel is not null);

        // When the host's answer is saved
        await hostOnRacing.Connection.InvokeAsync("SubmitAnswer", answer, Cancel);

        // Then it was applied again to the room as it then stood, found the duel won, and the friend
        // keeps the win (L2-026 criteria 1 and 7)
        var room = await RoomAsync(race.Code);
        Assert.Equal(DuelSide.DeskHolder, room.Game!.Duel!.Winner);
        Assert.Equal(race.Friend, room.Game.Tour.Traveller);
    }

    private async Task<Room> RoomAsync(string code)
    {
        await using var scope = api.Services.CreateAsyncScope();
        var store = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return await store.Rooms.SingleAsync(room => room.Code.Value == code, Cancel);
    }

    /// <summary>A host and a friend in a started race, both connected, with the first card dealt.</summary>
    private async Task<Race> RaceAsync()
    {
        using var http = api.CreateClient();
        var host = await RoomRequests.MakeAsync(http, "zuri", 0, 0);
        var friend = await RoomRequests.JoinAsync(http, host.Code, "nia", 8, 4);
        var hostHub = await RoomHubClient.ConnectAsync(api, host.Token);
        var friendHub = await RoomHubClient.ConnectAsync(api, friend.Token);
        await friendHub.WaitForAsync("two players", state => state.Players.Count == 2);
        await hostHub.Connection.InvokeAsync("StartGame", Cancel);
        await friendHub.WaitForGameAsync("the game starting", game => game.Phase == "starting");
        await api.PassAsync(RoomGame.FirstCardAfter);
        var first = await friendHub.WaitForGameAsync("the first card", game => game.Duel is not null);
        await hostHub.WaitForGameAsync("the first card", game => game.Duel is not null);
        return new Race(host.Code, host.PlayerId, friend.PlayerId, host.Token, hostHub, friendHub, first.Duel!.Card);
    }

    private sealed record Race(string Code, Guid HostId, Guid FriendId, string HostToken, RoomHubClient HostHub, RoomHubClient FriendHub, CardBody Card) : IAsyncDisposable
    {
        public string Host => HostId.ToString();

        public string Friend => FriendId.ToString();

        public async ValueTask DisposeAsync()
        {
            await HostHub.DisposeAsync();
            await FriendHub.DisposeAsync();
        }
    }

    private sealed class FirstRandom : IRandomSource
    {
        public int Below(int limit) => 0;
    }
}

using AroundTheWorld.Application.Rooms.AdvanceGames;
using AroundTheWorld.Application.Rooms.RemoveAbsentPlayers;
using MediatR;

namespace AroundTheWorld.Api.Rooms;

/// <summary>
/// The game's clock on the server (docs/adr/0033-deciding-a-game-on-the-server.md): every 250 ms
/// on <see cref="TimeProvider"/> it brings each playing room whose game is due up to now, so a
/// card is dealt, a classmate answers and a card's time runs out without a player's message. A
/// test advances a fake clock rather than waiting. Every instance runs it; the room's concurrency
/// token lets one instance's save of a room stand. After the games it removes each player whose
/// connection has been lost for 30 seconds (docs/adr/0036). A failed tick is logged without any
/// detail of a room and tried again at the next.
/// </summary>
public sealed partial class RoomTimers(IServiceScopeFactory scopes, TimeProvider clock, ILogger<RoomTimers> logger)
    : BackgroundService
{
    /// <summary>How often the games are brought up to now.</summary>
    public static readonly TimeSpan Every = TimeSpan.FromMilliseconds(250);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(Every, clock);
        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            var now = clock.GetUtcNow();
            await SendAsync(new AdvanceGamesCommand(now), stoppingToken);
            await SendAsync(new RemoveAbsentPlayersCommand(now), stoppingToken);
        }
    }

    private async Task SendAsync(IRequest<int> tick, CancellationToken stoppingToken)
    {
        try
        {
            await using var scope = scopes.CreateAsyncScope();
            var sender = scope.ServiceProvider.GetRequiredService<ISender>();
            await sender.Send(tick, stoppingToken);
        }
        catch (Exception failure) when (failure is not OperationCanceledException)
        {
            LogTickFailed(logger, failure.GetType().Name);
        }
    }

    [LoggerMessage(Level = LogLevel.Warning, Message = "Bringing the games up to now failed ({Failure}); trying again at the next tick.")]
    private static partial void LogTickFailed(ILogger logger, string failure);
}

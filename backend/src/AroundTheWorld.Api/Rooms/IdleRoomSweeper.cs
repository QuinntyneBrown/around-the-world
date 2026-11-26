using AroundTheWorld.Application.Rooms.DeleteIdleRooms;
using MediatR;

namespace AroundTheWorld.Api.Rooms;

/// <summary>
/// Once a minute on <see cref="TimeProvider"/>, deletes the rooms nobody has done anything in for
/// 10 minutes (L2-027 criterion 4, docs/adr/0031-making-a-room.md). A test advances a fake clock
/// rather than waiting. A failed sweep is logged without any detail of a room and tried again
/// at the next tick.
/// </summary>
public sealed partial class IdleRoomSweeper(IServiceScopeFactory scopes, TimeProvider clock, ILogger<IdleRoomSweeper> logger)
    : BackgroundService
{
    /// <summary>How often the rooms are swept.</summary>
    public static readonly TimeSpan Every = TimeSpan.FromMinutes(1);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(Every, clock);
        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            try
            {
                await using var scope = scopes.CreateAsyncScope();
                var sender = scope.ServiceProvider.GetRequiredService<ISender>();
                await sender.Send(new DeleteIdleRoomsCommand(clock.GetUtcNow()), stoppingToken);
            }
            catch (Exception failure) when (failure is not OperationCanceledException)
            {
                LogSweepFailed(logger, failure.GetType().Name);
            }
        }
    }

    [LoggerMessage(Level = LogLevel.Warning, Message = "Sweeping the idle rooms failed ({Failure}); trying again at the next tick.")]
    private static partial void LogSweepFailed(ILogger logger, string failure);
}

using AroundTheWorld.Application.Common;
using AroundTheWorld.Application.Rooms;
using AroundTheWorld.Application.Rooms.AdvanceGames;
using AroundTheWorld.Application.Rooms.DeleteIdleRooms;
using AroundTheWorld.Domain.Rooms;
using AroundTheWorld.Infrastructure.Persistence;
using MediatR;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http.Connections;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.SignalR.Client;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Time.Testing;

namespace AroundTheWorld.Api.Tests.Support;

/// <summary>
/// The backend on the in-memory test server, as every acceptance test drives it: through the
/// API. Each fixture has its own EF Core InMemory store, a <see cref="FakeTimeProvider"/> the
/// test advances instead of sleeping, and real SignalR clients connected to the test server.
/// No real database, no network and no Azure SignalR Service (AGENTS.md, Backend tests).
/// </summary>
public class ApiFixture : WebApplicationFactory<Program>
{
    private readonly string _storeName = $"room-store-{Guid.NewGuid():N}";

    private readonly SweepWatcher _sweeps = new();

    private readonly SweepWatcher _games = new();

    private readonly RequestLog _requests = new();

    /// <summary>
    /// Completes when the idle rooms have been swept at that time or later, so a test awaits the
    /// sweep after advancing <see cref="Clock"/> instead of sleeping; it fails after 10 seconds,
    /// naming the last sweep that did arrive.
    /// </summary>
    public Task SweepAt(DateTimeOffset at) => _sweeps.WaitForAsync(at, TimeSpan.FromSeconds(10));

    /// <summary>
    /// Completes when the room's timers have brought the games up to that time or later, so a test
    /// awaits the tick after advancing <see cref="Clock"/>; it fails after 10 seconds, naming the
    /// last tick that did arrive.
    /// </summary>
    public Task GamesAt(DateTimeOffset at) => _games.WaitForAsync(at, TimeSpan.FromSeconds(10));

    /// <summary>
    /// Completes when a request of that name (such as <c>MarkPlayerAwayCommand</c>) from the
    /// connection that presented the token has been handled, so a test awaits what the hub does
    /// when a connection is lost; it fails after 10 seconds, naming the requests that were handled.
    /// </summary>
    public Task HandledForAsync(string request, string token) => _requests.WaitForAsync(request, token, TimeSpan.FromSeconds(10));

    /// <summary>
    /// Completes when a request of that name carrying a time (<c>Now</c>) at or after
    /// <paramref name="at"/> has been handled, such as the room's timers' sweep of absent players.
    /// </summary>
    public Task HandledAtAsync(string request, DateTimeOffset at) => _requests.WaitForAtAsync(request, at, TimeSpan.FromSeconds(10));

    /// <summary>Moves the clock on and waits until the games have caught up with it.</summary>
    public async Task PassAsync(TimeSpan time)
    {
        Clock.Advance(time);
        await GamesAt(Clock.GetUtcNow());
    }

    /// <summary>The clock of the backend under test. Advance it; never sleep.</summary>
    public FakeTimeProvider Clock { get; } = new(new DateTimeOffset(2026, 1, 5, 9, 0, 0, TimeSpan.Zero));

    /// <summary>
    /// Whether making a room is limited as in production. Other tests make rooms freely, so a
    /// test of another rule is never refused by the limit (<see cref="ThrottledApiFixture"/>).
    /// </summary>
    protected virtual bool ThrottledAsInProduction => false;

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        if (!ThrottledAsInProduction)
        {
            builder.UseSetting("RateLimits:MakeRoom:PermitLimit", "1000");
            builder.UseSetting("RateLimits:JoinRoom:PermitLimit", "1000");
        }

        builder.ConfigureServices(services =>
        {
            services.RemoveAll<DbContextOptions<AppDbContext>>();
            services.RemoveAll<IDbContextOptionsConfiguration<AppDbContext>>();
            services.AddDbContext<AppDbContext>(options => options.UseInMemoryDatabase(_storeName));

            services.RemoveAll<TimeProvider>();
            services.AddSingleton<TimeProvider>(Clock);

            services.AddSingleton(_sweeps);
            services.AddTransient<IPipelineBehavior<DeleteIdleRoomsCommand, int>, SweepSignal>();
            services.AddKeyedSingleton("games", _games);
            services.AddTransient<IPipelineBehavior<AdvanceGamesCommand, int>, GamesSignal>();
            services.AddSingleton(_requests);
            services.AddTransient(typeof(IPipelineBehavior<,>), typeof(RequestLogged<,>));
        });
    }

    /// <summary>
    /// The same backend, store and clock, whose code generator draws these codes in order and
    /// then the last one again, so a test can draw a code that is already in use.
    /// </summary>
    public WebApplicationFactory<Program> WithCodes(params string[] codes) =>
        WithWebHostBuilder(builder => builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<IRoomCodeGenerator>();
            services.AddSingleton<IRoomCodeGenerator>(new ScriptedCodes(codes));
        }));

    /// <summary>
    /// The same backend, store and clock, in which the first save of a request is refused as a
    /// whole because the rival's change, saved through a store of its own, reached the room
    /// first: a fault injected through <see cref="IAppDbContext"/>. The room store refuses
    /// such a unit of work entirely; EF Core InMemory has no transactions, so the double
    /// refuses it before anything of it is written.
    /// </summary>
    public WebApplicationFactory<Program> WithFirstSaveRacedBy(Func<AppDbContext, Task> rival) =>
        WithWebHostBuilder(builder => builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<IAppDbContext>();
            services.AddScoped<IAppDbContext>(provider => new FirstSaveRaced(
                provider.GetRequiredService<AppDbContext>(),
                provider.GetRequiredService<IServiceScopeFactory>(),
                rival));
        }));

    /// <summary>
    /// A real SignalR client connected to a hub of the test server over WebSockets, the hub's
    /// one transport. The caller starts it and disposes it.
    /// </summary>
    public HubConnection CreateHubConnection(string hubPath) => HubConnections.Create(Server, hubPath);
}

/// <summary>A store whose first save is refused, after a rival's change was saved through a store of its own.</summary>
internal sealed class FirstSaveRaced(AppDbContext inner, IServiceScopeFactory scopes, Func<AppDbContext, Task> rival) : IAppDbContext
{
    private bool _raced;

    public DbSet<Room> Rooms => inner.Rooms;

    public void Forget() => inner.Forget();

    public async Task<int> SaveChangesAsync(CancellationToken cancellationToken)
    {
        if (!_raced)
        {
            _raced = true;
            await using var scope = scopes.CreateAsyncScope();
            await rival(scope.ServiceProvider.GetRequiredService<AppDbContext>());
            throw new DbUpdateConcurrencyException("Another change reached the room first.");
        }

        return await inner.SaveChangesAsync(cancellationToken);
    }
}

/// <summary>The backend with the rate limits of production: their defaults, from no setting (L2-045).</summary>
public sealed class ThrottledApiFixture : ApiFixture
{
    protected override bool ThrottledAsInProduction => true;
}

/// <summary>A code generator that draws the codes it was given, in order, then the last again.</summary>
internal sealed class ScriptedCodes(IReadOnlyList<string> codes) : IRoomCodeGenerator
{
    private int _next;

    public RoomCode Draw() => RoomCode.From(codes[Math.Min(Interlocked.Increment(ref _next) - 1, codes.Count - 1)]);
}

/// <summary>Records each sweep of idle rooms the backend finished, by the time it swept at.</summary>
internal sealed class SweepWatcher
{
    private readonly Lock _gate = new();
    private readonly List<(DateTimeOffset At, TaskCompletionSource Done)> _waiting = [];
    private DateTimeOffset? _last;

    public async Task WaitForAsync(DateTimeOffset at, TimeSpan timeout)
    {
        var done = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        lock (_gate)
        {
            if (_last >= at)
            {
                return;
            }

            _waiting.Add((at, done));
        }

        try
        {
            await done.Task.WaitAsync(timeout, TestContext.Current.CancellationToken);
        }
        catch (TimeoutException)
        {
            Assert.Fail($"No sweep at {at:O} arrived; the last was at {(_last is { } last ? last.ToString("O") : "none")}.");
        }
    }

    public void Swept(DateTimeOffset at)
    {
        List<TaskCompletionSource> ready;
        lock (_gate)
        {
            _last = _last is { } last && last > at ? last : at;
            ready = [.. _waiting.Where(waiter => waiter.At <= at).Select(waiter => waiter.Done)];
            _waiting.RemoveAll(waiter => waiter.At <= at);
        }

        ready.ForEach(done => done.TrySetResult());
    }
}

/// <summary>Tells the <see cref="SweepWatcher"/> once a sweep of idle rooms has been saved.</summary>
internal sealed class SweepSignal(SweepWatcher sweeps) : IPipelineBehavior<DeleteIdleRoomsCommand, int>
{
    public async Task<int> Handle(DeleteIdleRoomsCommand request, RequestHandlerDelegate<int> next, CancellationToken cancellationToken)
    {
        var deleted = await next(cancellationToken);
        sweeps.Swept(request.Now);
        return deleted;
    }
}

/// <summary>Tells the games' <see cref="SweepWatcher"/> once the room's timers have brought the games up to a time.</summary>
internal sealed class GamesSignal([FromKeyedServices("games")] SweepWatcher games) : IPipelineBehavior<AdvanceGamesCommand, int>
{
    public async Task<int> Handle(AdvanceGamesCommand request, RequestHandlerDelegate<int> next, CancellationToken cancellationToken)
    {
        var changed = await next(cancellationToken);
        games.Swept(request.Now);
        return changed;
    }
}

/// <summary>Records each request the backend handled, by its type's name and the time it carried, if any.</summary>
internal sealed class RequestLog
{
    private readonly Lock _gate = new();
    private readonly List<(string Name, DateTimeOffset? At, string? Token)> _handled = [];
    private readonly List<(Func<bool> Ready, TaskCompletionSource Done)> _waiting = [];

    public Task WaitForAsync(string name, string token, TimeSpan timeout) =>
        WaitAsync(() => _handled.Any(handled => handled.Name == name && handled.Token == token), $"{name} for the token", timeout);

    public Task WaitForAtAsync(string name, DateTimeOffset at, TimeSpan timeout) =>
        WaitAsync(() => _handled.Any(handled => handled.Name == name && handled.At >= at), $"{name} at {at:O}", timeout);

    public void Handled(string name, DateTimeOffset? at, string? token)
    {
        List<TaskCompletionSource> ready;
        lock (_gate)
        {
            _handled.Add((name, at, token));
            ready = [.. _waiting.Where(waiter => waiter.Ready()).Select(waiter => waiter.Done)];
            _waiting.RemoveAll(waiter => waiter.Ready());
        }

        ready.ForEach(done => done.TrySetResult());
    }

    private async Task WaitAsync(Func<bool> ready, string what, TimeSpan timeout)
    {
        var done = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        lock (_gate)
        {
            if (ready())
            {
                return;
            }

            _waiting.Add((ready, done));
        }

        try
        {
            await done.Task.WaitAsync(timeout, TestContext.Current.CancellationToken);
        }
        catch (TimeoutException)
        {
            string handled;
            lock (_gate)
            {
                handled = string.Join(", ", _handled.Select(request => request.Name).Distinct());
            }

            Assert.Fail($"No {what} was handled; what was: {(handled.Length == 0 ? "nothing" : handled)}.");
        }
    }
}

/// <summary>Tells the <see cref="RequestLog"/> of every request once it has been handled, failed or not.</summary>
internal sealed class RequestLogged<TRequest, TResponse>(RequestLog log, ICurrentPlayer caller) : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    public async Task<TResponse> Handle(TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken cancellationToken)
    {
        try
        {
            return await next(cancellationToken);
        }
        finally
        {
            var at = typeof(TRequest).GetProperty("Now")?.GetValue(request) as DateTimeOffset?;
            log.Handled(typeof(TRequest).Name, at, caller.Token);
        }
    }
}

/// <summary>Real SignalR clients on a test server, over WebSockets, the hub's one transport.</summary>
internal static class HubConnections
{
    public static HubConnection Create(TestServer server, string hubPath) =>
        new HubConnectionBuilder()
            .WithUrl(new Uri(server.BaseAddress, hubPath), options =>
            {
                options.Transports = HttpTransportType.WebSockets;
                options.SkipNegotiation = true;
                options.HttpMessageHandlerFactory = _ => server.CreateHandler();
                options.WebSocketFactory = (context, cancellationToken) =>
                    new ValueTask<System.Net.WebSockets.WebSocket>(
                        server.CreateWebSocketClient().ConnectAsync(context.Uri, cancellationToken));
            })
            .Build();
}

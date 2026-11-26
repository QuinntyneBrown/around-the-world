using AroundTheWorld.Application.Common;
using AroundTheWorld.Application.Rooms;
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

    /// <summary>
    /// Completes when the idle rooms have been swept at that time or later, so a test awaits the
    /// sweep after advancing <see cref="Clock"/> instead of sleeping; it fails after 10 seconds,
    /// naming the last sweep that did arrive.
    /// </summary>
    public Task SweepAt(DateTimeOffset at) => _sweeps.WaitForAsync(at, TimeSpan.FromSeconds(10));

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
    public HubConnection CreateHubConnection(string hubPath) =>
        new HubConnectionBuilder()
            .WithUrl(new Uri(Server.BaseAddress, hubPath), options =>
            {
                options.Transports = HttpTransportType.WebSockets;
                options.SkipNegotiation = true;
                options.HttpMessageHandlerFactory = _ => Server.CreateHandler();
                options.WebSocketFactory = (context, cancellationToken) =>
                    new ValueTask<System.Net.WebSockets.WebSocket>(
                        Server.CreateWebSocketClient().ConnectAsync(context.Uri, cancellationToken));
            })
            .Build();
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

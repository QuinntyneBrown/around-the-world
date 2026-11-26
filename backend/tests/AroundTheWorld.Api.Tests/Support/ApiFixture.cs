using AroundTheWorld.Infrastructure.Persistence;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http.Connections;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.SignalR.Client;
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
public sealed class ApiFixture : WebApplicationFactory<Program>
{
    private readonly string _storeName = $"room-store-{Guid.NewGuid():N}";

    /// <summary>The clock of the backend under test. Advance it; never sleep.</summary>
    public FakeTimeProvider Clock { get; } = new(new DateTimeOffset(2026, 1, 5, 9, 0, 0, TimeSpan.Zero));

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.ConfigureServices(services =>
        {
            services.RemoveAll<DbContextOptions<AppDbContext>>();
            services.RemoveAll<IDbContextOptionsConfiguration<AppDbContext>>();
            services.AddDbContext<AppDbContext>(options => options.UseInMemoryDatabase(_storeName));

            services.RemoveAll<TimeProvider>();
            services.AddSingleton<TimeProvider>(Clock);
        });
    }

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

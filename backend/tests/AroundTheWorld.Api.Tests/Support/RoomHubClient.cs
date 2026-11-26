using System.Text.Json;
using Microsoft.AspNetCore.SignalR.Client;

namespace AroundTheWorld.Api.Tests.Support;

/// <summary>
/// A player's real SignalR client on the room hub of the test server, presenting their token,
/// with every room state it received. A test awaits a state with a timeout that fails naming
/// what did arrive; it never sleeps (AGENTS.md, Backend tests).
/// </summary>
internal sealed class RoomHubClient : IAsyncDisposable
{
    public const string HubPath = "/hubs/room";

    private static readonly TimeSpan Timeout = TimeSpan.FromSeconds(5);

    private readonly Lock _gate = new();
    private readonly List<RoomStateBody> _received = [];
    private readonly List<(Func<RoomStateBody, bool> Wanted, TaskCompletionSource<RoomStateBody> Done)> _waiting = [];
    private readonly TaskCompletionSource<Exception?> _closed = new(TaskCreationOptions.RunContinuationsAsynchronously);

    private RoomHubClient(HubConnection connection)
    {
        Connection = connection;
        connection.On<RoomStateBody>("RoomChanged", Received);
        connection.Closed += error =>
        {
            _closed.TrySetResult(error);
            return Task.CompletedTask;
        };
    }

    public HubConnection Connection { get; }

    /// <summary>Connects with the token, as the game's <c>access_token</c>.</summary>
    public static async Task<RoomHubClient> ConnectAsync(ApiFixture api, string token)
    {
        var client = new RoomHubClient(api.CreateHubConnection($"{HubPath}?access_token={Uri.EscapeDataString(token)}"));
        await client.Connection.StartAsync(TestContext.Current.CancellationToken);
        return client;
    }

    /// <summary>The first state received, now or later, that is what the test wants.</summary>
    public async Task<RoomStateBody> WaitForAsync(string what, Func<RoomStateBody, bool> wanted)
    {
        var done = new TaskCompletionSource<RoomStateBody>(TaskCreationOptions.RunContinuationsAsynchronously);
        lock (_gate)
        {
            var already = _received.FirstOrDefault(wanted);
            if (already is not null)
            {
                return already;
            }

            _waiting.Add((wanted, done));
        }

        try
        {
            return await done.Task.WaitAsync(Timeout, TestContext.Current.CancellationToken);
        }
        catch (TimeoutException)
        {
            Assert.Fail($"No room state with {what} arrived; what did arrive: {Describe()}.");
            throw;
        }
    }

    /// <summary>Completes when the server has closed the connection; fails after the timeout.</summary>
    public async Task<Exception?> ClosedAsync()
    {
        try
        {
            return await _closed.Task.WaitAsync(Timeout, TestContext.Current.CancellationToken);
        }
        catch (TimeoutException)
        {
            Assert.Fail($"The connection was not closed; it is {Connection.State}, and received: {Describe()}.");
            throw;
        }
    }

    public IReadOnlyList<RoomStateBody> Received()
    {
        lock (_gate)
        {
            return [.. _received];
        }
    }

    public async ValueTask DisposeAsync() => await Connection.DisposeAsync();

    private void Received(RoomStateBody state)
    {
        List<TaskCompletionSource<RoomStateBody>> ready;
        lock (_gate)
        {
            _received.Add(state);
            ready = [.. _waiting.Where(waiter => waiter.Wanted(state)).Select(waiter => waiter.Done)];
            _waiting.RemoveAll(waiter => waiter.Wanted(state));
        }

        ready.ForEach(done => done.TrySetResult(state));
    }

    private string Describe()
    {
        lock (_gate)
        {
            return _received.Count == 0 ? "nothing" : string.Join("; ", _received.Select(state => JsonSerializer.Serialize(state)));
        }
    }
}

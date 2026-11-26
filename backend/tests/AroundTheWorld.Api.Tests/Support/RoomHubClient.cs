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

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly Lock _gate = new();
    private readonly List<RoomStateBody> _received = [];
    private readonly List<(Func<RoomStateBody, bool> Wanted, TaskCompletionSource<RoomStateBody> Done)> _waiting = [];
    private readonly List<(string Json, GameStateBody Game)> _games = [];
    private readonly List<(Func<GameStateBody, bool> Wanted, TaskCompletionSource<GameStateBody> Done)> _waitingGames = [];
    private readonly List<StickerShownBody> _stickers = [];
    private readonly List<(Func<StickerShownBody, bool> Wanted, TaskCompletionSource<StickerShownBody> Done)> _waitingStickers = [];
    private readonly TaskCompletionSource<Exception?> _closed = new(TaskCreationOptions.RunContinuationsAsynchronously);

    private RoomHubClient(HubConnection connection)
    {
        Connection = connection;
        connection.On<RoomStateBody>("RoomChanged", Received);
        connection.On<JsonElement>("GameChanged", ReceivedGame);
        connection.On<StickerShownBody>("StickerShown", ReceivedSticker);
        connection.Closed += error =>
        {
            _closed.TrySetResult(error);
            return Task.CompletedTask;
        };
    }

    public HubConnection Connection { get; }

    /// <summary>Connects with the token, as the game's <c>access_token</c>.</summary>
    public static Task<RoomHubClient> ConnectAsync(ApiFixture api, string token) => ConnectAsync(api.Server, token);

    /// <summary>Connects with the token to another test server, such as one whose store is raced.</summary>
    public static async Task<RoomHubClient> ConnectAsync(Microsoft.AspNetCore.TestHost.TestServer server, string token)
    {
        var client = new RoomHubClient(HubConnections.Create(server, $"{HubPath}?access_token={Uri.EscapeDataString(token)}"));
        await client.Connection.StartAsync(TestContext.Current.CancellationToken);
        return client;
    }

    /// <summary>The first state received, now or later, that is what the test wants.</summary>
    public Task<RoomStateBody> WaitForAsync(string what, Func<RoomStateBody, bool> wanted) => WaitForAsync(what, wanted, 0);

    /// <summary>The first state received from now on that is what the test wants.</summary>
    public Task<RoomStateBody> WaitForNextAsync(string what, Func<RoomStateBody, bool> wanted)
    {
        lock (_gate)
        {
            return WaitForAsync(what, wanted, _received.Count);
        }
    }

    private async Task<RoomStateBody> WaitForAsync(string what, Func<RoomStateBody, bool> wanted, int skipping)
    {
        var done = new TaskCompletionSource<RoomStateBody>(TaskCreationOptions.RunContinuationsAsynchronously);
        lock (_gate)
        {
            var already = _received.Skip(skipping).FirstOrDefault(wanted);
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

    /// <summary>The first game received, now or later, that is what the test wants.</summary>
    public async Task<GameStateBody> WaitForGameAsync(string what, Func<GameStateBody, bool> wanted)
    {
        var done = new TaskCompletionSource<GameStateBody>(TaskCreationOptions.RunContinuationsAsynchronously);
        lock (_gate)
        {
            var already = _games.Select(game => game.Game).FirstOrDefault(wanted);
            if (already is not null)
            {
                return already;
            }

            _waitingGames.Add((wanted, done));
        }

        try
        {
            return await done.Task.WaitAsync(Timeout, TestContext.Current.CancellationToken);
        }
        catch (TimeoutException)
        {
            Assert.Fail($"No game with {what} arrived; what did arrive: {DescribeGames()}.");
            throw;
        }
    }

    /// <summary>Every game received, as the JSON that arrived, to prove what it holds and does not.</summary>
    public IReadOnlyList<string> GamesAsJson()
    {
        lock (_gate)
        {
            return [.. _games.Select(game => game.Json)];
        }
    }

    public IReadOnlyList<GameStateBody> Games()
    {
        lock (_gate)
        {
            return [.. _games.Select(game => game.Game)];
        }
    }

    /// <summary>The first sticker received, now or later, that is what the test wants.</summary>
    public async Task<StickerShownBody> WaitForStickerAsync(string what, Func<StickerShownBody, bool> wanted)
    {
        var done = new TaskCompletionSource<StickerShownBody>(TaskCreationOptions.RunContinuationsAsynchronously);
        lock (_gate)
        {
            var already = _stickers.FirstOrDefault(wanted);
            if (already is not null)
            {
                return already;
            }

            _waitingStickers.Add((wanted, done));
        }

        try
        {
            return await done.Task.WaitAsync(Timeout, TestContext.Current.CancellationToken);
        }
        catch (TimeoutException)
        {
            Assert.Fail($"No sticker {what} arrived; what did arrive: {DescribeStickers()}.");
            throw;
        }
    }

    /// <summary>Every sticker received, in order.</summary>
    public IReadOnlyList<StickerShownBody> Stickers()
    {
        lock (_gate)
        {
            return [.. _stickers];
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

    private void ReceivedGame(JsonElement json)
    {
        var game = json.Deserialize<GameStateBody>(JsonOptions)!;
        List<TaskCompletionSource<GameStateBody>> ready;
        lock (_gate)
        {
            _games.Add((json.GetRawText(), game));
            ready = [.. _waitingGames.Where(waiter => waiter.Wanted(game)).Select(waiter => waiter.Done)];
            _waitingGames.RemoveAll(waiter => waiter.Wanted(game));
        }

        ready.ForEach(done => done.TrySetResult(game));
    }

    private void ReceivedSticker(StickerShownBody sticker)
    {
        List<TaskCompletionSource<StickerShownBody>> ready;
        lock (_gate)
        {
            _stickers.Add(sticker);
            ready = [.. _waitingStickers.Where(waiter => waiter.Wanted(sticker)).Select(waiter => waiter.Done)];
            _waitingStickers.RemoveAll(waiter => waiter.Wanted(sticker));
        }

        ready.ForEach(done => done.TrySetResult(sticker));
    }

    private string DescribeStickers()
    {
        lock (_gate)
        {
            return _stickers.Count == 0 ? "nothing" : string.Join("; ", _stickers);
        }
    }

    private string DescribeGames()
    {
        lock (_gate)
        {
            return _games.Count == 0 ? "nothing" : string.Join("; ", _games.Select(game => game.Json));
        }
    }

    private string Describe()
    {
        lock (_gate)
        {
            return _received.Count == 0 ? "nothing" : string.Join("; ", _received.Select(state => JsonSerializer.Serialize(state)));
        }
    }
}

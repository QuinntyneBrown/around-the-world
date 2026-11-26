using System.Diagnostics;
using System.Net.Http.Json;
using AroundTheWorld.Api.Tests.Support;
using Microsoft.AspNetCore.SignalR.Client;
using OpenTelemetry.Metrics;

namespace AroundTheWorld.Api.Tests.Operations;

/// <summary>
/// L2-053 criteria 1 and 2: each request and each hub message emits a trace and metrics through
/// OpenTelemetry, with the route as its template, and no log, metric or span holds a nickname,
/// room code, connection token, message body or query string (docs/adr/0037). An activity source
/// is seen by every tracer in the process, so these tests run alone, with no other test server's
/// spans arriving.
/// </summary>
[Collection(RunsAlone.Name)]
public sealed class TelemetryTests(TelemetryApiFixture api) : IClassFixture<TelemetryApiFixture>
{
    private static CancellationToken Cancel => TestContext.Current.CancellationToken;

    /// <summary>The tags that would carry an address with its values, a query string or the device's address.</summary>
    private static readonly string[] ForbiddenTags =
        ["url.full", "url.path", "url.query", "http.target", "http.url", "client.address", "network.peer.address", "user_agent.original"];

    [Fact]
    public async Task Given_a_game_with_friends_when_its_requests_and_hub_messages_are_handled_then_each_emits_a_span_and_metrics_named_by_template_and_none_holds_anything_about_a_child()
    {
        // Given a host makes a room and a friend joins it with its code, both on the room hub
        using var http = api.CreateClient();
        var host = await RoomRequests.MakeAsync(http, "zuri", 3, 7);
        var friend = await RoomRequests.JoinAsync(http, host.Code, "nia", 5, 2);
        await using var hostHub = await RoomHubClient.ConnectAsync(api, host.Token);
        await using var friendHub = await RoomHubClient.ConnectAsync(api, friend.Token);
        await hostHub.WaitForAsync("two players", room => room.Players.Count == 2);

        // When the host sends a hub message (an answer, refused as no game is playing)
        await Assert.ThrowsAsync<Microsoft.AspNetCore.SignalR.HubException>(() => hostHub.Connection.InvokeAsync("SubmitAnswer", 42, Cancel));
        using var ready = await http.GetAsync(new Uri("/health/ready", UriKind.Relative), Cancel);

        // Then each request has a span named by its route template
        var spans = api.Spans;
        Assert.Contains(spans, span => span.DisplayName == "POST api/rooms");
        Assert.Contains(spans, span => span.DisplayName == "POST api/rooms/join");

        // And each MediatR request, the hub message's too, has a span with its type and outcome
        AssertRequestSpan(spans, "MakeRoomCommand", "ok");
        AssertRequestSpan(spans, "JoinRoomCommand", "ok");
        AssertRequestSpan(spans, "SubmitAnswerCommand", "not_playing");

        // And metrics: the requests' duration by template, and each MediatR request's by type and outcome
        var metrics = api.CollectMetrics();
        Assert.Contains(Points(metrics, "http.server.request.duration"), point => Tag(point, "http.route") == "api/rooms/join");
        Assert.Contains(Points(metrics, "atw.request.duration"), point =>
            Tag(point, "atw.request") == "SubmitAnswerCommand" && Tag(point, "atw.outcome") == "not_playing");

        // And no span, metric or log holds a code, a token or the query string the hub's connection carried
        string[] secrets = [host.Code, host.Token, friend.Token, "access_token"];
        foreach (var span in spans)
        {
            var text = $"{span.DisplayName} {string.Join(" ", span.TagObjects.Select(tag => $"{tag.Key}={tag.Value}"))} {string.Join(" ", span.Events.Select(e => e.Name))}";
            Assert.DoesNotContain(span.TagObjects, tag => ForbiddenTags.Contains(tag.Key));
            AssertHoldsNone(secrets, text, $"span {span.DisplayName}");
        }

        foreach (var metric in metrics)
        {
            foreach (var point in metric.MetricPoints)
            {
                var tags = string.Join(" ", Tags(point).Select(tag => $"{tag.Key}={tag.Value}"));
                AssertHoldsNone(secrets, tags, $"metric {metric.Name}");
                Assert.DoesNotContain(Tags(point), tag => ForbiddenTags.Contains(tag.Key));
            }
        }

        var logs = api.Logs;
        Assert.NotEmpty(logs);
        foreach (var log in logs)
        {
            AssertHoldsNone(secrets, log.ToString(), $"log {log.Category}");
            Assert.DoesNotContain(log.Attributes, attribute => attribute.Key is "QueryString" or "Path" or "Host");
        }
    }

    private static void AssertRequestSpan(IReadOnlyList<Activity> spans, string request, string outcome)
    {
        var span = spans.FirstOrDefault(span => span.DisplayName == "atw.request" && (string?)span.GetTagItem("atw.request") == request);
        Assert.True(span is not null, $"No span for {request}; the spans were: {string.Join(", ", spans.Select(s => s.DisplayName).Distinct())}");
        Assert.Equal(outcome, span.GetTagItem("atw.outcome"));
        Assert.Equal(["atw.request", "atw.outcome"], span.TagObjects.Select(tag => tag.Key).Where(key => key.StartsWith("atw.", StringComparison.Ordinal)));
    }

    private static void AssertHoldsNone(string[] secrets, string text, string where)
    {
        foreach (var secret in secrets)
        {
            Assert.False(text.Contains(secret, StringComparison.Ordinal), $"The {where} holds \"{secret}\": {text}");
        }
    }

    private static IEnumerable<MetricPoint> Points(IReadOnlyList<MetricSnapshot> metrics, string name) =>
        metrics.Where(metric => metric.Name == name).SelectMany(metric => metric.MetricPoints);

    private static List<KeyValuePair<string, object?>> Tags(MetricPoint point)
    {
        var tags = new List<KeyValuePair<string, object?>>();
        foreach (var tag in point.Tags)
        {
            tags.Add(tag);
        }

        return tags;
    }

    private static string? Tag(MetricPoint point, string key) => Tags(point).FirstOrDefault(tag => tag.Key == key).Value?.ToString();
}

/// <summary>The tests that read the process's telemetry, run with no other test alongside.</summary>
[CollectionDefinition(Name, DisableParallelization = true)]
public sealed class RunsAlone
{
    public const string Name = "Telemetry";
}

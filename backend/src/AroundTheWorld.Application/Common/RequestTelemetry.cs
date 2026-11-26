using System.Diagnostics;
using System.Diagnostics.Metrics;

namespace AroundTheWorld.Application.Common;

/// <summary>
/// The backend's own telemetry (L2-053 criterion 1, docs/adr/0037): the activity source and the
/// meter <c>AroundTheWorld</c>, the span <c>atw.request</c> and the histogram
/// <c>atw.request.duration</c>, in seconds. Their only tags are <c>atw.request</c>, a request
/// type's name, and <c>atw.outcome</c>: <c>ok</c>, a refusal's code, <c>server_error</c> or
/// <c>cancelled</c>. Nothing a request carries is ever a tag.
/// </summary>
public sealed class RequestTelemetry : IDisposable
{
    /// <summary>The name of the activity source and of the meter.</summary>
    public const string Name = "AroundTheWorld";

    /// <summary>The name of each request's span.</summary>
    public const string SpanName = "atw.request";

    /// <summary>The tag that names the request's type.</summary>
    public const string RequestTag = "atw.request";

    /// <summary>The tag that names the request's outcome.</summary>
    public const string OutcomeTag = "atw.outcome";

    private readonly Histogram<double> _duration;

    public RequestTelemetry(IMeterFactory meters)
    {
        Source = new ActivitySource(Name);
        var meter = meters.Create(Name);
        _duration = meter.CreateHistogram<double>(
            "atw.request.duration",
            unit: "s",
            description: "How long the backend took to handle a request or a hub message.");
    }

    /// <summary>The source of the requests' spans.</summary>
    public ActivitySource Source { get; }

    /// <summary>Records one handled request's duration with its type and outcome.</summary>
    public void Record(string request, string outcome, TimeSpan duration) =>
        _duration.Record(duration.TotalSeconds, new(RequestTag, request), new(OutcomeTag, outcome));

    public void Dispose() => Source.Dispose();
}

using System.Diagnostics;
using OpenTelemetry;
using OpenTelemetry.Logs;

namespace AroundTheWorld.Infrastructure.Telemetry;

/// <summary>
/// Removes from every span and log record, before it is exported, what could hold something
/// about a child (L2-053 criterion 2, docs/adr/0037): an address with its values, the query
/// string, which carries a hub connection's <c>access_token</c>, the device's address and its user
/// agent. A route stays, as its template, in the span's name and <c>http.route</c>.
/// </summary>
public static class TelemetryScrubber
{
    /// <summary>The span tags removed.</summary>
    public static readonly IReadOnlySet<string> SpanTags = new HashSet<string>(StringComparer.Ordinal)
    {
        "url.full", "url.path", "url.query", "http.target", "http.url",
        "client.address", "client.port", "network.peer.address", "network.peer.port", "user_agent.original",
    };

    /// <summary>The log record attributes removed.</summary>
    public static readonly IReadOnlySet<string> LogAttributes = new HashSet<string>(StringComparer.Ordinal)
    {
        "Path", "PathBase", "QueryString", "Host", "RequestPath", "Uri",
    };

    /// <summary>Scrubs each span as it ends; registered before any exporter.</summary>
    public sealed class Spans : BaseProcessor<Activity>
    {
        public override void OnEnd(Activity data)
        {
            foreach (var tag in data.TagObjects.Where(tag => SpanTags.Contains(tag.Key)).ToList())
            {
                data.SetTag(tag.Key, null);
            }
        }
    }

    /// <summary>Scrubs each log record as it ends; registered before any exporter.</summary>
    public sealed class LogRecords : BaseProcessor<LogRecord>
    {
        public override void OnEnd(LogRecord data)
        {
            if (data.Attributes is { } attributes && attributes.Any(attribute => LogAttributes.Contains(attribute.Key)))
            {
                data.Attributes = [.. attributes.Where(attribute => !LogAttributes.Contains(attribute.Key))];
            }

            data.FormattedMessage = null;
        }
    }
}

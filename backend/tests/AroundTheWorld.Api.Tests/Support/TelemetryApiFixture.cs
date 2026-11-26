using System.Diagnostics;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using OpenTelemetry;
using OpenTelemetry.Logs;
using OpenTelemetry.Metrics;
using OpenTelemetry.Trace;

namespace AroundTheWorld.Api.Tests.Support;

/// <summary>
/// The backend with every log at Information and above, ASP.NET Core's included, and its
/// telemetry kept in memory as it would be exported: the spans, the metrics and the log records,
/// each written down as text when it ends (docs/adr/0037). Nothing leaves the process.
/// </summary>
public sealed class TelemetryApiFixture : ApiFixture
{
    private readonly List<Activity> _spans = [];
    private readonly List<MetricSnapshot> _metrics = [];
    private readonly LogRecordsWritten _logs = new();

    /// <summary>The spans that ended, as exported.</summary>
    public IReadOnlyList<Activity> Spans
    {
        get
        {
            lock (_spans)
            {
                return [.. _spans];
            }
        }
    }

    /// <summary>The log records written, each as its text, as exported.</summary>
    public IReadOnlyList<LogRecordText> Logs => _logs.Written;

    /// <summary>The metrics, collected now.</summary>
    public IReadOnlyList<MetricSnapshot> CollectMetrics()
    {
        Services.GetService<MeterProvider>()?.ForceFlush();
        lock (_metrics)
        {
            return [.. _metrics];
        }
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        base.ConfigureWebHost(builder);
        builder.UseSetting("Logging:LogLevel:Default", "Information");
        builder.UseSetting("Logging:LogLevel:Microsoft.AspNetCore", "Information");
        builder.ConfigureTestServices(services =>
        {
            services.ConfigureOpenTelemetryTracerProvider(tracing => tracing.AddInMemoryExporter(new Locked<Activity>(_spans)));
            services.ConfigureOpenTelemetryMeterProvider(metrics => metrics.AddInMemoryExporter(new Locked<MetricSnapshot>(_metrics)));
            services.ConfigureOpenTelemetryLoggerProvider(logging => logging.AddProcessor(_logs));
        });
    }

    /// <summary>A list shared with the test's thread, written under its own lock.</summary>
    private sealed class Locked<T>(List<T> inner) : ICollection<T>
    {
        public int Count
        {
            get
            {
                lock (inner)
                {
                    return inner.Count;
                }
            }
        }

        public bool IsReadOnly => false;

        public void Add(T item)
        {
            lock (inner)
            {
                inner.Add(item);
            }
        }

        public void Clear()
        {
            lock (inner)
            {
                inner.Clear();
            }
        }

        public bool Contains(T item)
        {
            lock (inner)
            {
                return inner.Contains(item);
            }
        }

        public void CopyTo(T[] array, int arrayIndex)
        {
            lock (inner)
            {
                inner.CopyTo(array, arrayIndex);
            }
        }

        public bool Remove(T item)
        {
            lock (inner)
            {
                return inner.Remove(item);
            }
        }

        public IEnumerator<T> GetEnumerator()
        {
            lock (inner)
            {
                return inner.ToList().GetEnumerator();
            }
        }

        System.Collections.IEnumerator System.Collections.IEnumerable.GetEnumerator() => GetEnumerator();
    }
}

/// <summary>A log record as the exporter would send it: its category, body, formatted message and attributes.</summary>
public sealed record LogRecordText(string Category, string? Body, string? FormattedMessage, IReadOnlyList<KeyValuePair<string, string?>> Attributes)
{
    public override string ToString() =>
        $"{Category}: {Body} | {FormattedMessage} | {string.Join(", ", Attributes.Select(attribute => $"{attribute.Key}={attribute.Value}"))}";
}

/// <summary>
/// Writes each log record down as text when it ends, after the processors registered before it:
/// log records are pooled and reused once exported, so nothing of one is kept but its text.
/// </summary>
internal sealed class LogRecordsWritten : BaseProcessor<LogRecord>
{
    private readonly List<LogRecordText> _written = [];

    public IReadOnlyList<LogRecordText> Written
    {
        get
        {
            lock (_written)
            {
                return [.. _written];
            }
        }
    }

    public override void OnEnd(LogRecord data)
    {
        var text = new LogRecordText(
            data.CategoryName ?? string.Empty,
            data.Body,
            data.FormattedMessage,
            [.. (data.Attributes ?? []).Select(attribute => new KeyValuePair<string, string?>(attribute.Key, attribute.Value?.ToString()))]);
        lock (_written)
        {
            _written.Add(text);
        }
    }
}

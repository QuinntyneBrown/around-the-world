using AroundTheWorld.Application.Common;
using AroundTheWorld.Infrastructure.Telemetry;
using OpenTelemetry;
using OpenTelemetry.Logs;
using OpenTelemetry.Metrics;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;

namespace AroundTheWorld.Api.Hosting;

/// <summary>
/// Traces, metrics and logs through OpenTelemetry (L2-053, docs/adr/0037): a span for each HTTP
/// request named by its route template, a span for each hub method, a span and a duration for
/// each MediatR request (<see cref="TelemetryBehavior{TRequest,TResponse}"/>), ASP.NET Core's,
/// Kestrel's and SignalR's metrics, and the logs without their scopes or formatted messages.
/// <see cref="TelemetryScrubber"/> runs before any exporter. The OTLP exporter is added only when
/// <c>OTEL_EXPORTER_OTLP_ENDPOINT</c> holds a value; <c>OTEL_SERVICE_NAME</c> names the service.
/// </summary>
public static class Telemetry
{
    /// <summary>The service's name in telemetry when <c>OTEL_SERVICE_NAME</c> is absent.</summary>
    public const string DefaultServiceName = "around-the-world-api";

    public static WebApplicationBuilder AddTelemetry(this WebApplicationBuilder builder)
    {
        var serviceName = builder.Configuration["OTEL_SERVICE_NAME"] is { Length: > 0 } name ? name : DefaultServiceName;
        var telemetry = builder.Services.AddOpenTelemetry()
            .ConfigureResource(resource => resource.AddService(serviceName))
            .WithTracing(tracing => tracing
                .AddAspNetCoreInstrumentation(options => options.RecordException = false)
                .AddSource(RequestTelemetry.Name, "Microsoft.AspNetCore.SignalR.Server")
                .AddProcessor<TelemetryScrubber.Spans>())
            .WithMetrics(metrics => metrics
                .AddAspNetCoreInstrumentation()
                .AddMeter(RequestTelemetry.Name, "Microsoft.AspNetCore.SignalR"))
            .WithLogging(
                logging => logging.AddProcessor<TelemetryScrubber.LogRecords>(),
                options =>
                {
                    options.IncludeScopes = false;
                    options.IncludeFormattedMessage = false;
                    options.ParseStateValues = true;
                });

        if (!string.IsNullOrWhiteSpace(builder.Configuration["OTEL_EXPORTER_OTLP_ENDPOINT"]))
        {
            telemetry.UseOtlpExporter();
        }

        return builder;
    }
}

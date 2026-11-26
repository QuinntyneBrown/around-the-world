using System.Diagnostics;
using MediatR;

namespace AroundTheWorld.Application.Common;

/// <summary>
/// Wraps every MediatR request, and so every controller action and hub method, in a span and a
/// duration (L2-053 criterion 1, docs/detailed-designs/platform/operate-backend/). It reads the
/// request's type and its outcome, never a property of the request (L2-053 criterion 2).
/// </summary>
public sealed class TelemetryBehavior<TRequest, TResponse>(RequestTelemetry telemetry, TimeProvider clock)
    : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    private static readonly string RequestName = typeof(TRequest).Name;

    public async Task<TResponse> Handle(TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken cancellationToken)
    {
        using var span = telemetry.Source.StartActivity(RequestTelemetry.SpanName, ActivityKind.Internal);
        span?.SetTag(RequestTelemetry.RequestTag, RequestName);
        var started = clock.GetTimestamp();
        var outcome = "ok";
        try
        {
            return await next(cancellationToken);
        }
        catch (RefusedException refused)
        {
            outcome = refused.Code;
            throw;
        }
        catch (OperationCanceledException)
        {
            outcome = "cancelled";
            throw;
        }
        catch
        {
            outcome = ErrorCodes.ServerError;
            span?.SetStatus(ActivityStatusCode.Error);
            throw;
        }
        finally
        {
            span?.SetTag(RequestTelemetry.OutcomeTag, outcome);
            telemetry.Record(RequestName, outcome, clock.GetElapsedTime(started));
        }
    }
}

using AroundTheWorld.Application.Common;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace AroundTheWorld.Api.Errors;

/// <summary>
/// Writes a refusal as ProblemDetails with its <c>code</c> and nothing of the server (L2-044
/// criterion 3, L2-054 criterion 1). Any other exception is answered 500 with the code
/// <c>server_error</c> and a generic title (docs/adr/0037); it is logged by its type and stack
/// trace only, since its message may hold a value the request carried.
/// </summary>
public sealed partial class ErrorCodeWriter(IProblemDetailsService problems, ILogger<ErrorCodeWriter> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        if (exception is not RefusedException refused)
        {
            LogFailure(logger, exception.GetType().Name, exception.StackTrace);
            refused = new RefusedException(ErrorCodes.ServerError, StatusCodes.Status500InternalServerError, "Something went wrong on our side.");
        }

        httpContext.Response.StatusCode = refused.Status;
        return await problems.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = httpContext,
            Exception = null,
            ProblemDetails = new ProblemDetails
            {
                Status = refused.Status,
                Title = refused.Message,
                Extensions = { ["code"] = refused.Code },
            },
        });
    }

    [LoggerMessage(Level = LogLevel.Error, Message = "A request failed with {ExceptionType} at {StackTrace}")]
    private static partial void LogFailure(ILogger logger, string exceptionType, string? stackTrace);

    /// <summary>A body the API cannot read as the request is refused with <c>invalid_request</c>.</summary>
    public static IActionResult InvalidRequest(ActionContext context) =>
        new ObjectResult(new ProblemDetails
        {
            Status = StatusCodes.Status400BadRequest,
            Title = "The request could not be read.",
            Extensions = { ["code"] = ErrorCodes.InvalidRequest },
        })
        {
            StatusCode = StatusCodes.Status400BadRequest,
            ContentTypes = { "application/problem+json" },
        };
}

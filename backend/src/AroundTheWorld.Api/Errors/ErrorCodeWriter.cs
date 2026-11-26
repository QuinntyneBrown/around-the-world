using AroundTheWorld.Application.Common;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace AroundTheWorld.Api.Errors;

/// <summary>
/// Writes a refusal as ProblemDetails with its <c>code</c> and nothing of the server (L2-044
/// criterion 3, L2-054 criterion 1). Any other exception is left to the generic handler, which
/// writes a bare 500.
/// </summary>
public sealed class ErrorCodeWriter(IProblemDetailsService problems) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        if (exception is not RefusedException refused)
        {
            return false;
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

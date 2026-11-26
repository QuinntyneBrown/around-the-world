using AroundTheWorld.Application.Common;
using Microsoft.AspNetCore.Http.Metadata;
using Microsoft.AspNetCore.Mvc;

namespace AroundTheWorld.Api.Errors;

/// <summary>
/// Refuses a body larger than its endpoint's <c>[RequestSizeLimit]</c> from its declared length,
/// before any handler runs (L2-044 criterion 2). Kestrel also enforces the limit on a body
/// that declares no length; a host without that feature, such as the test server, still
/// refuses by the declared length.
/// </summary>
public static class BodySizeLimit
{
    public static IApplicationBuilder UseBodySizeLimit(this IApplicationBuilder app) =>
        app.Use(async (context, next) =>
        {
            var limit = context.GetEndpoint()?.Metadata.GetMetadata<IRequestSizeLimitMetadata>()?.MaxRequestBodySize;
            if (limit is not null && context.Request.ContentLength > limit)
            {
                context.Response.StatusCode = StatusCodes.Status413PayloadTooLarge;
                var problems = context.RequestServices.GetRequiredService<IProblemDetailsService>();
                await problems.WriteAsync(new ProblemDetailsContext
                {
                    HttpContext = context,
                    ProblemDetails = new ProblemDetails
                    {
                        Status = StatusCodes.Status413PayloadTooLarge,
                        Title = "The request is too large.",
                        Extensions = { ["code"] = ErrorCodes.TooLarge },
                    },
                });
                return;
            }

            await next(context);
        });
}

using FluentValidation;
using MediatR;

namespace AroundTheWorld.Application.Common;

/// <summary>
/// Runs a request's validators before its handler (L2-044 criterion 1). The first failure is
/// refused with its error code and status 400, so nothing changes.
/// </summary>
public sealed class ValidationBehaviour<TRequest, TResponse>(IEnumerable<IValidator<TRequest>> validators)
    : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    public async Task<TResponse> Handle(TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken cancellationToken)
    {
        foreach (var validator in validators)
        {
            var result = await validator.ValidateAsync(request, cancellationToken);
            var failure = result.Errors.FirstOrDefault();
            if (failure is not null)
            {
                throw new RefusedException(failure.ErrorCode, 400, "The request holds a value outside what the game offers.");
            }
        }

        return await next(cancellationToken);
    }
}

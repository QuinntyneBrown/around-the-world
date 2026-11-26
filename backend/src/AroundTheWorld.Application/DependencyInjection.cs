using AroundTheWorld.Application.Common;
using FluentValidation;
using Microsoft.Extensions.DependencyInjection;

namespace AroundTheWorld.Application;

/// <summary>Registers the handlers, the validators and the validation pipeline of the Application layer.</summary>
public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        var assembly = typeof(DependencyInjection).Assembly;
        services.AddMediatR(configuration =>
        {
            configuration.RegisterServicesFromAssembly(assembly);
            configuration.AddOpenBehavior(typeof(ValidationBehaviour<,>));
        });
        services.AddValidatorsFromAssembly(assembly, includeInternalTypes: true);
        return services;
    }
}

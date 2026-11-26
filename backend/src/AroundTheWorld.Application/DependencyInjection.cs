using AroundTheWorld.Application.Common;
using AroundTheWorld.Application.Rooms;
using FluentValidation;
using Microsoft.Extensions.DependencyInjection;

namespace AroundTheWorld.Application;

/// <summary>Registers the handlers, the validators, the telemetry and the pipeline of the Application layer.</summary>
public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        var assembly = typeof(DependencyInjection).Assembly;
        services.AddMediatR(configuration =>
        {
            configuration.RegisterServicesFromAssembly(assembly);
            configuration.AddOpenBehavior(typeof(TelemetryBehavior<,>));
            configuration.AddOpenBehavior(typeof(ValidationBehaviour<,>));
            configuration.AddOpenBehavior(typeof(RoomPlayerBehaviour<,>));
        });
        services.AddScoped<RoomPlayerContext>();
        services.AddSingleton<RequestTelemetry>();
        services.AddValidatorsFromAssembly(assembly, includeInternalTypes: true);
        return services;
    }
}

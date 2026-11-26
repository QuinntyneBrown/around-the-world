using AroundTheWorld.Application.Common;
using AroundTheWorld.Application.Rooms;
using AroundTheWorld.Infrastructure.Persistence;
using AroundTheWorld.Infrastructure.Rooms;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace AroundTheWorld.Infrastructure;

/// <summary>Registers the room store, the code generator and the clock of the Infrastructure layer.</summary>
public static class DependencyInjection
{
    /// <summary>The connection string that names the room store (docs/operations/settings.md).</summary>
    public const string RoomStoreConnection = "RoomStore";

    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddDbContext<AppDbContext>(options =>
            options.UseSqlServer(configuration.GetConnectionString(RoomStoreConnection)));
        services.AddScoped<IAppDbContext>(provider => provider.GetRequiredService<AppDbContext>());
        services.AddSingleton<IRoomCodeGenerator, RoomCodeGenerator>();
        services.AddSingleton(TimeProvider.System);
        return services;
    }
}

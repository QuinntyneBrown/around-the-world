using System.Text.Json.Serialization;
using AroundTheWorld.Api.Errors;
using AroundTheWorld.Api.Hubs;
using AroundTheWorld.Api.Rooms;
using AroundTheWorld.Application;
using AroundTheWorld.Application.Common;
using AroundTheWorld.Application.Rooms;
using AroundTheWorld.Infrastructure;
using AroundTheWorld.Infrastructure.Persistence;
using Microsoft.AspNetCore.Http.Connections;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services
    .AddControllers()
    .AddJsonOptions(options => options.JsonSerializerOptions.NumberHandling = JsonNumberHandling.Strict);
builder.Services.Configure<ApiBehaviorOptions>(options =>
    options.InvalidModelStateResponseFactory = ErrorCodeWriter.InvalidRequest);
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<ErrorCodeWriter>();
builder.Services.AddRoomRateLimits(builder.Configuration);
builder.Services.AddHostedService<IdleRoomSweeper>();

// The room's one real-time channel: WebSockets only, messages of at most 1 KB, no detail of the
// server in an error, and the caller known from the token its connection presented
// (docs/adr/0032-joining-a-room-and-the-lobby.md).
builder.Services
    .AddSignalR(options =>
    {
        options.MaximumReceiveMessageSize = RateLimitPolicies.MaxBodyBytes;
        options.EnableDetailedErrors = false;
        options.AddFilter<CurrentPlayerFilter>();
    });
builder.Services.AddScoped<HubCurrentPlayer>();
builder.Services.AddScoped<ICurrentPlayer>(services => services.GetRequiredService<HubCurrentPlayer>());
builder.Services.AddScoped<IRoomNotifier, HubRoomNotifier>();

var app = builder.Build();

// `dotnet run --project src/AroundTheWorld.Api -- migrate` applies the room store's
// migrations and exits. The API itself never migrates on startup (docs/adr/0009).
if (args.Contains("migrate", StringComparer.Ordinal))
{
    await app.Services.MigrateRoomStoreAsync(CancellationToken.None);
    return;
}

app.UseExceptionHandler();
app.UseStatusCodePages();
app.UseWebSockets();
app.UseRouting();
app.UseRateLimiter();
app.UseBodySizeLimit();
app.MapControllers().RequireOpenToAnyoneLimits();
app.MapHub<RoomHub>(RoomHub.Path, options => options.Transports = HttpTransportType.WebSockets);

await app.RunAsync();

/// <summary>The entry point, visible to the acceptance tests' test server.</summary>
public partial class Program;

using System.Text.Json.Serialization;
using AroundTheWorld.Api.Errors;
using AroundTheWorld.Api.Rooms;
using AroundTheWorld.Application;
using AroundTheWorld.Infrastructure;
using AroundTheWorld.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;

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
app.UseRouting();
app.UseRateLimiter();
app.UseBodySizeLimit();
app.MapControllers().RequireOpenToAnyoneLimits();

await app.RunAsync();

/// <summary>The entry point, visible to the acceptance tests' test server.</summary>
public partial class Program;

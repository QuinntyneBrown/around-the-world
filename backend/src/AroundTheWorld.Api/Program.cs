using AroundTheWorld.Application;
using AroundTheWorld.Infrastructure;
using AroundTheWorld.Infrastructure.Persistence;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddControllers();
builder.Services.AddProblemDetails();

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
app.MapControllers();

await app.RunAsync();

/// <summary>The entry point, visible to the acceptance tests' test server.</summary>
public partial class Program;

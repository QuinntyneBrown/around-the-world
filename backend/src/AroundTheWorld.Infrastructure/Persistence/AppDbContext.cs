using AroundTheWorld.Application.Common;
using Microsoft.EntityFrameworkCore;

namespace AroundTheWorld.Infrastructure.Persistence;

/// <summary>The room store, through EF Core. It holds no account, no real name and no audio.</summary>
public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options), IAppDbContext;

using AroundTheWorld.Application.Common;
using AroundTheWorld.Domain.Rooms;
using Microsoft.EntityFrameworkCore;

namespace AroundTheWorld.Infrastructure.Persistence;

/// <summary>
/// The room store, through EF Core. It holds a code, the setup and, for each player, the
/// nickname's indexes, a kid, a position and a token; no account, no real name, no audio and no
/// address of a device (L2-046).
/// </summary>
public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options), IAppDbContext
{
    public DbSet<Room> Rooms => Set<Room>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Room>(room =>
        {
            room.HasKey(r => r.Id);
            room.Property(r => r.Code)
                .HasConversion(code => code.Value, value => RoomCode.From(value))
                .HasMaxLength(RoomCode.Length)
                .IsFixedLength()
                .IsUnicode(false);
            room.HasIndex(r => r.Code).IsUnique();
            room.Property(r => r.Status).HasConversion<string>().HasMaxLength(16);
            room.HasIndex(r => r.LastActivityAt);
            room.OwnsOne(r => r.Setup, setup =>
            {
                setup.Property(s => s.Kinds);
                setup.Property(s => s.Tables);
                setup.Property(s => s.CardSpeed).HasConversion<string>().HasMaxLength(16);
            });
            room.HasMany(r => r.Players).WithOne().HasForeignKey("RoomId").IsRequired().OnDelete(DeleteBehavior.Cascade);
            room.Navigation(r => r.Players).AutoInclude();
        });

        modelBuilder.Entity<RoomPlayer>(player =>
        {
            player.ToTable("RoomPlayers");
            player.HasKey(p => p.Id);
            player.Property(p => p.Kid).HasConversion<string>().HasMaxLength(8);
            player.OwnsOne(p => p.Nickname);
            player.Property(p => p.Token)
                .HasConversion(token => token.Value, value => ConnectionToken.From(value))
                .HasMaxLength(43)
                .IsUnicode(false);
            player.HasIndex(p => p.Token).IsUnique();
        });
    }
}

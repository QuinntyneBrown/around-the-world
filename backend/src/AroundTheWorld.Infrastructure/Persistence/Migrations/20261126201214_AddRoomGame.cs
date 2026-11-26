using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AroundTheWorld.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddRoomGame : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Game",
                table: "Rooms",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "GameDueAt",
                table: "Rooms",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Rooms_GameDueAt",
                table: "Rooms",
                column: "GameDueAt");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Rooms_GameDueAt",
                table: "Rooms");

            migrationBuilder.DropColumn(
                name: "Game",
                table: "Rooms");

            migrationBuilder.DropColumn(
                name: "GameDueAt",
                table: "Rooms");
        }
    }
}

using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AroundTheWorld.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddPlayerAway : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "AwaySince",
                table: "RoomPlayers",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ConnectionId",
                table: "RoomPlayers",
                type: "varchar(64)",
                unicode: false,
                maxLength: 64,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_RoomPlayers_AwaySince",
                table: "RoomPlayers",
                column: "AwaySince");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_RoomPlayers_AwaySince",
                table: "RoomPlayers");

            migrationBuilder.DropColumn(
                name: "AwaySince",
                table: "RoomPlayers");

            migrationBuilder.DropColumn(
                name: "ConnectionId",
                table: "RoomPlayers");
        }
    }
}

using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AroundTheWorld.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddRooms : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Rooms",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Code = table.Column<string>(type: "char(4)", unicode: false, fixedLength: true, maxLength: 4, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(16)", maxLength: 16, nullable: false),
                    Setup_Kinds = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Setup_Tables = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Setup_TourLength = table.Column<int>(type: "int", nullable: false),
                    Setup_CardSpeed = table.Column<string>(type: "nvarchar(16)", maxLength: 16, nullable: false),
                    LastActivityAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Rooms", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "RoomPlayers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Kid = table.Column<string>(type: "nvarchar(8)", maxLength: 8, nullable: false),
                    Nickname_Adjective = table.Column<int>(type: "int", nullable: false),
                    Nickname_Animal = table.Column<int>(type: "int", nullable: false),
                    Position = table.Column<int>(type: "int", nullable: false),
                    IsHost = table.Column<bool>(type: "bit", nullable: false),
                    Token = table.Column<string>(type: "varchar(43)", unicode: false, maxLength: 43, nullable: false),
                    JoinedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    RoomId = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RoomPlayers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RoomPlayers_Rooms_RoomId",
                        column: x => x.RoomId,
                        principalTable: "Rooms",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_RoomPlayers_RoomId",
                table: "RoomPlayers",
                column: "RoomId");

            migrationBuilder.CreateIndex(
                name: "IX_RoomPlayers_Token",
                table: "RoomPlayers",
                column: "Token",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Rooms_Code",
                table: "Rooms",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Rooms_LastActivityAt",
                table: "Rooms",
                column: "LastActivityAt");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "RoomPlayers");

            migrationBuilder.DropTable(
                name: "Rooms");
        }
    }
}

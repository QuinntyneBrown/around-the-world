using AroundTheWorld.Application.Rooms;
using AroundTheWorld.Application.Rooms.JoinRoom;
using AroundTheWorld.Application.Rooms.MakeRoom;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace AroundTheWorld.Api.Rooms;

/// <summary>
/// Rooms over HTTP. Each action checks nothing itself and sends one MediatR request
/// (AGENTS.md, Backend). A body larger than 1 KB is refused before any handler runs (L2-044
/// criterion 2).
/// </summary>
[ApiController]
[Route("api/rooms")]
public sealed class RoomsController(ISender sender) : ControllerBase
{
    /// <summary>Makes a room whose host is the caller (L2-022 criterion 1).</summary>
    [HttpPost]
    [OpenToAnyone(RateLimitPolicies.MakeRoom)]
    [RequestSizeLimit(RateLimitPolicies.MaxBodyBytes)]
    [ProducesResponseType<RoomEntryDto>(StatusCodes.Status201Created)]
    public async Task<ActionResult<RoomEntryDto>> Make(MakeRoomCommand command, CancellationToken cancellationToken) =>
        StatusCode(StatusCodes.Status201Created, await sender.Send(command, cancellationToken));

    /// <summary>
    /// Joins the room a code names (L2-023 criterion 3). The code travels in the body, never in
    /// the address (docs/detailed-designs/rooms/join-room/).
    /// </summary>
    [HttpPost("join")]
    [OpenToAnyone(RateLimitPolicies.JoinRoom)]
    [RequestSizeLimit(RateLimitPolicies.MaxBodyBytes)]
    [ProducesResponseType<RoomEntryDto>(StatusCodes.Status200OK)]
    public async Task<ActionResult<RoomEntryDto>> Join(JoinRoomCommand command, CancellationToken cancellationToken) =>
        Ok(await sender.Send(command, cancellationToken));
}

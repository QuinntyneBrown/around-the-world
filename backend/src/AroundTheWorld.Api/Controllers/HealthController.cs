using AroundTheWorld.Application.Health;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AroundTheWorld.Api.Controllers;

/// <summary>
/// Whether the backend is live and whether it is ready (L2-053 criterion 3), for the hosting
/// platform's probes. Open to anyone and saying nothing of the server.
/// </summary>
/// <remarks>
/// <see cref="Live"/> is the one endpoint that sends no MediatR request: a liveness probe
/// answers from the process alone, with no check and no dependency (docs/adr/0009).
/// <see cref="Ready"/> sends <see cref="CheckReadinessQuery"/> (docs/adr/0037).
/// </remarks>
[ApiController]
[Route("health")]
[AllowAnonymous]
public sealed class HealthController(ISender sender) : ControllerBase
{
    [HttpGet("live")]
    public ActionResult<HealthResponse> Live() => new HealthResponse("live");

    [HttpGet("ready")]
    [ProducesResponseType<HealthResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<HealthResponse>(StatusCodes.Status503ServiceUnavailable)]
    public async Task<ActionResult<HealthResponse>> Ready(CancellationToken cancellationToken) =>
        await sender.Send(new CheckReadinessQuery(), cancellationToken)
            ? new HealthResponse("ready")
            : StatusCode(StatusCodes.Status503ServiceUnavailable, new HealthResponse("not_ready"));
}

/// <summary>The answer of a health endpoint: <c>live</c>, <c>ready</c> or <c>not_ready</c>.</summary>
public sealed record HealthResponse(string Status);

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AroundTheWorld.Api.Controllers;

/// <summary>
/// Whether the backend is live (L2-053 criterion 3), for the hosting platform's probes. Open
/// to anyone and saying nothing of the server. Readiness, which sends CheckReadinessQuery,
/// arrives with journey 17.
/// </summary>
/// <remarks>
/// <see cref="Live"/> is the one endpoint that sends no MediatR request: a liveness probe
/// answers from the process alone, with no check and no dependency (docs/adr/0009).
/// </remarks>
[ApiController]
[Route("health")]
[AllowAnonymous]
public sealed class HealthController : ControllerBase
{
    [HttpGet("live")]
    public ActionResult<LivenessResponse> Live() => new LivenessResponse("live");
}

/// <summary>The answer of the live endpoint.</summary>
public sealed record LivenessResponse(string Status);

namespace AroundTheWorld.Application.Health;

/// <summary>
/// One thing an instance needs before it can serve a room, asked by the ready endpoint
/// (L2-053 criterion 3, docs/detailed-designs/platform/operate-backend/). A probe answers
/// whether it is ready and nothing more: no detail of the server leaves the instance.
/// </summary>
public interface IReadinessProbe
{
    Task<bool> IsReadyAsync(CancellationToken cancellationToken);
}

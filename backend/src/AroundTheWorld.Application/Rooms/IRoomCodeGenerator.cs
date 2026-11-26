using AroundTheWorld.Domain.Rooms;

namespace AroundTheWorld.Application.Rooms;

/// <summary>Draws room codes: 4 capital letters from A to Z that are never a blocked word (L2-022 criterion 2).</summary>
public interface IRoomCodeGenerator
{
    RoomCode Draw();
}

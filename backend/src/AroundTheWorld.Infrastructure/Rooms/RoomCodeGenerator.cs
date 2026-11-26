using System.Security.Cryptography;
using AroundTheWorld.Application.Rooms;
using AroundTheWorld.Domain.Rooms;

namespace AroundTheWorld.Infrastructure.Rooms;

/// <summary>
/// Draws 4 letters, each from A to Z with the same chance, and draws again while they spell a
/// blocked word (L2-022 criterion 2, docs/adr/0031-making-a-room.md).
/// </summary>
/// <param name="nextLetter">A letter's index from 0 (A) to 25 (Z); a cryptographic draw by default.</param>
public sealed class RoomCodeGenerator(Func<int> nextLetter) : IRoomCodeGenerator
{
    private const int Letters = 26;

    public RoomCodeGenerator()
        : this(() => RandomNumberGenerator.GetInt32(Letters))
    {
    }

    public RoomCode Draw()
    {
        while (true)
        {
            var letters = new char[RoomCode.Length];
            for (var i = 0; i < letters.Length; i++)
            {
                letters[i] = (char)('A' + nextLetter());
            }

            var code = new string(letters);
            if (!BlockedWords.Contains(code))
            {
                return RoomCode.From(code);
            }
        }
    }
}

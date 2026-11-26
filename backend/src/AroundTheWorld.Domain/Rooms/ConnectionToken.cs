using System.Security.Cryptography;

namespace AroundTheWorld.Domain.Rooms;

/// <summary>
/// The unguessable value the server gives one player for one room (L2-043 criterion 1): 32
/// random bytes in base64url without padding, 43 characters (docs/adr/0031-making-a-room.md).
/// It is never typed or said, and appears in no room state, log, metric or span.
/// </summary>
public sealed record ConnectionToken
{
    private const int ByteLength = 32;

    private ConnectionToken(string value) => Value = value;

    public string Value { get; }

    /// <summary>A new token from a cryptographic random number generator.</summary>
    public static ConnectionToken New() =>
        new(Convert.ToBase64String(RandomNumberGenerator.GetBytes(ByteLength))
            .TrimEnd('=')
            .Replace('+', '-')
            .Replace('/', '_'));

    /// <summary>A token read back from the store.</summary>
    public static ConnectionToken From(string value) => new(value);

    /// <summary>Never written out: a token in a log line is a token given away.</summary>
    public override string ToString() => "ConnectionToken";
}

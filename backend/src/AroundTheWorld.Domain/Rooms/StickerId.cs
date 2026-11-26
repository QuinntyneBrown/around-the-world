namespace AroundTheWorld.Domain.Rooms;

/// <summary>
/// One of the six stickers a watching player can send, by its id from 1 to 6 in the order they
/// are offered: "Go!", "Wow!", "Nice one", "So close", "Whoosh!" and "Beep boop!" (L2-028
/// criterion 6, docs/adr/0035). The server knows the ids and nothing else: the words and pictures
/// live on the device, and a sticker is never text.
/// </summary>
public readonly record struct StickerId
{
    /// <summary>The first sticker's id.</summary>
    public const int First = 1;

    /// <summary>How many stickers there are.</summary>
    public const int Count = 6;

    private StickerId(int value) => Value = value;

    public int Value { get; }

    /// <summary>The sticker of the id, or false when the id is not one of the six.</summary>
    public static bool TryParse(int value, out StickerId sticker)
    {
        sticker = new StickerId(value);
        return value is >= First and < First + Count;
    }
}

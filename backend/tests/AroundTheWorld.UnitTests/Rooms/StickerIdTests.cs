using AroundTheWorld.Domain.Rooms;

namespace AroundTheWorld.UnitTests.Rooms;

/// <summary>L2-028 criteria 4 and 6, docs/adr/0035: the six stickers are the ids 1 to 6, and no other.</summary>
public sealed class StickerIdTests
{
    [Theory]
    [InlineData(1, true)]
    [InlineData(2, true)]
    [InlineData(3, true)]
    [InlineData(4, true)]
    [InlineData(5, true)]
    [InlineData(6, true)]
    [InlineData(0, false)]
    [InlineData(7, false)]
    [InlineData(-1, false)]
    [InlineData(int.MaxValue, false)]
    public void Given_an_id_when_it_is_parsed_then_only_the_six_stickers_are_accepted(int id, bool accepted)
    {
        Assert.Equal(accepted, StickerId.TryParse(id, out var sticker));
        if (accepted)
        {
            Assert.Equal(id, sticker.Value);
        }
    }
}

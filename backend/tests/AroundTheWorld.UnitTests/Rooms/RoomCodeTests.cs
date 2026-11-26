using AroundTheWorld.Domain.Rooms;

namespace AroundTheWorld.UnitTests.Rooms;

/// <summary>L2-044 criterion 1: a code is exactly 4 capital letters from A to Z.</summary>
public sealed class RoomCodeTests
{
    [Theory]
    [InlineData("BOLT", true)]
    [InlineData("AAAA", true)]
    [InlineData("ZZZZ", true)]
    [InlineData("bolt", false)]
    [InlineData("BOL", false)]
    [InlineData("BOLTS", false)]
    [InlineData("B0LT", false)]
    [InlineData("BÖLT", false)]
    [InlineData("", false)]
    [InlineData(null, false)]
    public void Given_a_text_when_it_is_checked_then_only_4_capital_letters_from_A_to_Z_are_a_code(string? text, bool valid) =>
        Assert.Equal(valid, RoomCode.IsValid(text));

    [Theory]
    [InlineData("BOLT", "BOLT")]
    [InlineData("bolt", "BOLT")]
    [InlineData("BoLt", "BOLT")]
    [InlineData("BOL", null)]
    [InlineData("B0LT", null)]
    [InlineData("bolı", null)]
    [InlineData("BÖLT", null)]
    [InlineData(null, null)]
    public void Given_a_code_as_typed_when_it_is_parsed_then_its_letters_are_capitals_or_it_is_no_code(string? typed, string? code) =>
        Assert.Equal(code, RoomCode.Parse(typed)?.Value);
}

using AroundTheWorld.Infrastructure.Rooms;

namespace AroundTheWorld.UnitTests.Rooms;

/// <summary>L2-022 criterion 2: a code is 4 capital letters from A to Z and never a blocked word.</summary>
public sealed class RoomCodeGeneratorTests
{
    [Theory]
    [InlineData(new[] { 0, 1, 2, 3 }, "ABCD")]
    [InlineData(new[] { 25, 25, 25, 25 }, "ZZZZ")]
    [InlineData(new[] { 1, 14, 11, 19 }, "BOLT")]
    public void Given_the_letters_drawn_when_a_code_is_drawn_then_it_spells_them_from_A_to_Z(int[] letters, string code)
    {
        var generator = new RoomCodeGenerator(Letters(letters));

        Assert.Equal(code, generator.Draw().Value);
    }

    [Theory]
    [InlineData("POOP", "CAKE")]
    [InlineData("FART", "MOON")]
    [InlineData("DUMB", "STAR")]
    public void Given_the_letters_spell_a_blocked_word_when_a_code_is_drawn_then_it_is_drawn_again(string blocked, string next)
    {
        var generator = new RoomCodeGenerator(Letters([.. Indexes(blocked), .. Indexes(next)]));

        Assert.Equal(next, generator.Draw().Value);
    }

    [Fact]
    public void Given_a_cryptographic_draw_when_many_codes_are_drawn_then_each_is_4_capital_letters_and_none_is_blocked()
    {
        var generator = new RoomCodeGenerator();

        for (var i = 0; i < 2000; i++)
        {
            var code = generator.Draw().Value;
            Assert.Matches("^[A-Z]{4}$", code);
            Assert.False(BlockedWords.Contains(code), code);
        }
    }

    private static IEnumerable<int> Indexes(string word) => word.Select(letter => letter - 'A');

    private static Func<int> Letters(IEnumerable<int> letters)
    {
        var queue = new Queue<int>(letters);
        return () => queue.Dequeue();
    }
}

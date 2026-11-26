namespace AroundTheWorld.Domain.Tours;

/// <summary>Which of the two players of a duel.</summary>
public enum DuelSide
{
    Traveller,
    DeskHolder,
}

/// <summary>What one answer did to a duel.</summary>
public enum AnswerResult
{
    Ignored,
    Wrong,
    Won,
}

/// <summary>Whether a duel is still open, won, or ran out of time with no correct answer.</summary>
public enum DuelOutcome
{
    Open,
    Won,
    TimedOut,
}

/// <summary>
/// One duel between the traveller and the desk holder over one flash card, decided on the server
/// from the answers it receives, each at the time it arrived (L2-001, L2-004, L2-026). It reads no
/// clock. It plays the same table of cases as the device's <c>Duel</c> (docs/specs/tour-cases.json).
/// </summary>
public sealed class Duel
{
    /// <summary>How long a wrong answer freezes the player who gave it (L2-004).</summary>
    public static readonly TimeSpan Freeze = TimeSpan.FromSeconds(1);

    public Duel(Card card, string traveller, string deskHolder)
    {
        Card = card;
        Traveller = traveller;
        DeskHolder = deskHolder;
    }

    private Duel()
    {
    }

    public Card Card { get; private set; } = null!;

    public string Traveller { get; private set; } = string.Empty;

    public string DeskHolder { get; private set; } = string.Empty;

    public DateTimeOffset? TravellerFrozenUntil { get; private set; }

    public DateTimeOffset? DeskHolderFrozenUntil { get; private set; }

    /// <summary>The traveller's last wrong answer, for "Not {answer}!".</summary>
    public int? TravellerWrong { get; private set; }

    /// <summary>The desk holder's last wrong answer.</summary>
    public int? DeskHolderWrong { get; private set; }

    public DuelOutcome Outcome { get; private set; }

    public DuelSide? Winner { get; private set; }

    /// <summary>Which side the player is on, or null when they are neither (L2-001 criterion 3).</summary>
    public DuelSide? SideOf(string player) =>
        player == Traveller ? DuelSide.Traveller : player == DeskHolder ? DuelSide.DeskHolder : null;

    /// <summary>Whether the player is the duel's traveller or its desk holder.</summary>
    public bool Holds(string player) => SideOf(player) is not null;

    /// <summary>When the side's freeze ends, or null when it was never frozen.</summary>
    public DateTimeOffset? FrozenUntil(DuelSide side) =>
        side == DuelSide.Traveller ? TravellerFrozenUntil : DeskHolderFrozenUntil;

    /// <summary>The side's last wrong answer.</summary>
    public int? WrongAnswer(DuelSide side) => side == DuelSide.Traveller ? TravellerWrong : DeskHolderWrong;

    /// <summary>
    /// Takes an answer that arrived at a time: ignored from a player who is neither duellist, once
    /// the duel is decided or while the player is frozen, whatever their device showed; a wrong
    /// answer freezes that player alone for 1 second; the first correct answer wins (L2-001,
    /// L2-004, L2-026 criteria 3 and 4).
    /// </summary>
    public AnswerResult Give(string player, int value, DateTimeOffset at)
    {
        if (SideOf(player) is not { } side || Outcome != DuelOutcome.Open || at < FrozenUntil(side))
        {
            return AnswerResult.Ignored;
        }

        if (value != Card.Answer())
        {
            if (side == DuelSide.Traveller)
            {
                (TravellerFrozenUntil, TravellerWrong) = (at + Freeze, value);
            }
            else
            {
                (DeskHolderFrozenUntil, DeskHolderWrong) = (at + Freeze, value);
            }

            return AnswerResult.Wrong;
        }

        (Outcome, Winner) = (DuelOutcome.Won, side);
        return AnswerResult.Won;
    }

    /// <summary>Closes an undecided duel with no winner when the card's time runs out (L2-005).</summary>
    public bool TimeOut()
    {
        if (Outcome != DuelOutcome.Open)
        {
            return false;
        }

        Outcome = DuelOutcome.TimedOut;
        return true;
    }
}

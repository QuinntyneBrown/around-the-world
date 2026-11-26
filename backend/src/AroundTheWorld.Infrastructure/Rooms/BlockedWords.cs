namespace AroundTheWorld.Infrastructure.Rooms;

/// <summary>
/// The 4-letter words a room code never spells (L2-022 criterion 2): rude or unkind words a
/// child might read aloud across a classroom. It is code, not data, so a change to it is
/// reviewed like any other (docs/adr/0031-making-a-room.md).
/// </summary>
internal static class BlockedWords
{
    public static readonly IReadOnlySet<string> All = new HashSet<string>(StringComparer.Ordinal)
    {
        "ANAL", "ANUS", "ARSE", "BOOB", "BUTT", "CLIT", "COCK", "COON", "CRAP", "CUNT",
        "DAMN", "DICK", "DIKE", "DUMB", "DYKE", "FAGS", "FART", "FATS", "FUCK", "FUKK",
        "GAYS", "GOOK", "HATE", "HELL", "HOMO", "JERK", "JISM", "JIZZ", "KIKE", "KILL",
        "KNOB", "LOSE", "MUFF", "NAZI", "NOOB", "PAKI", "PIMP", "PISS", "POOP",
        "PORN", "PUKE", "PUSS", "RAPE", "SHAG", "SHIT", "SLAG", "SLUT", "SPIC", "SUCK",
        "TITS", "TURD", "TWAT", "UGLY", "WANK", "DIED", "DEAD",
    };

    public static bool Contains(string code) => All.Contains(code);
}

using AroundTheWorld.Application.Common;
using FluentValidation;

namespace AroundTheWorld.Application.Rooms.SaveSetup;

/// <summary>
/// Refuses a setup holding a value Game Setup does not offer with <c>invalid_setup</c> (L2-018
/// criterion 4, L2-044 criterion 1): a kind outside the four, no kind or one twice, a table
/// outside 2 to 12 or one twice, Times on with no table, a tour length other than 6, 12 or 24,
/// or a card speed outside the three (docs/adr/0033).
/// </summary>
public sealed class SaveSetupCommandValidator : AbstractValidator<SaveSetupCommand>
{
    public SaveSetupCommandValidator()
    {
        RuleFor(command => command.Setup)
            .Must(GameSetups.IsOffered)
            .WithErrorCode(ErrorCodes.InvalidSetup);
    }
}

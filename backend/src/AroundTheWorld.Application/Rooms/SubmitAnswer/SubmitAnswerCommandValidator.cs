using AroundTheWorld.Application.Common;
using FluentValidation;

namespace AroundTheWorld.Application.Rooms.SubmitAnswer;

/// <summary>Refuses an answer that is not a whole number from 0 to 999 with <c>invalid_answer</c> (L2-044 criterion 1).</summary>
public sealed class SubmitAnswerCommandValidator : AbstractValidator<SubmitAnswerCommand>
{
    public SubmitAnswerCommandValidator()
    {
        RuleFor(command => command.Answer)
            .InclusiveBetween(0, 999)
            .WithErrorCode(ErrorCodes.InvalidAnswer);
    }
}

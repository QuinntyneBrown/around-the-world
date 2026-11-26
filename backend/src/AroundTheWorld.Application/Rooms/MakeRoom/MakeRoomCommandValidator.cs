using AroundTheWorld.Application.Common;
using AroundTheWorld.Domain.Rooms;
using FluentValidation;

namespace AroundTheWorld.Application.Rooms.MakeRoom;

/// <summary>
/// Refuses a kid id that is not one of the five and nickname indexes outside the two lists of
/// ten (L2-014, L2-044 criterion 1). The backend holds no word of either list.
/// </summary>
public sealed class MakeRoomCommandValidator : AbstractValidator<MakeRoomCommand>
{
    public MakeRoomCommandValidator()
    {
        RuleFor(command => command.Kid)
            .Must(Kids.IsKid)
            .WithErrorCode(ErrorCodes.InvalidKid);
        RuleFor(command => command.Nickname)
            .Must(nickname => nickname is not null
                && Nickname.IsIndex(nickname.Adjective)
                && Nickname.IsIndex(nickname.Animal))
            .WithErrorCode(ErrorCodes.InvalidNickname);
    }
}

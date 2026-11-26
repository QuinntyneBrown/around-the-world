using AroundTheWorld.Application.Common;
using AroundTheWorld.Domain.Rooms;
using FluentValidation;

namespace AroundTheWorld.Application.Rooms.JoinRoom;

/// <summary>
/// Refuses a code that is not 4 letters, a kid id that is not one of the five and nickname
/// indexes outside the two lists of ten (L2-044 criterion 1). Letters in lower case pass
/// (L2-023 criterion 8).
/// </summary>
public sealed class JoinRoomCommandValidator : AbstractValidator<JoinRoomCommand>
{
    public JoinRoomCommandValidator()
    {
        RuleFor(command => command.Code)
            .Must(code => RoomCode.Parse(code) is not null)
            .WithErrorCode(ErrorCodes.InvalidCode);
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

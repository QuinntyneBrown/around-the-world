/**
 * A place in words as the Podium and the passport read it: "1st", "2nd", "3rd", "4th", "11th",
 * "12th", "13th", "21st" (docs/design-system/components/podium.html, passport.html).
 */
export function ordinal(place: number): string {
  const lastTwo = place % 100;
  if (lastTwo >= 11 && lastTwo <= 13) return `${place}th`;
  switch (place % 10) {
    case 1:
      return `${place}st`;
    case 2:
      return `${place}nd`;
    case 3:
      return `${place}rd`;
    default:
      return `${place}th`;
  }
}

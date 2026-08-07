/** Two-letter monogram used by the avatar bubbles, e.g. "Sashank" -> "Sa". */
export function getInitials(displayName: string): string {
  const [firstWord = ""] = displayName.trim().split(/\s+/);
  const monogram = firstWord.slice(0, 2);
  if (!monogram) return "?";
  return monogram.charAt(0).toUpperCase() + monogram.slice(1).toLowerCase();
}

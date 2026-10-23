/** Only local app paths may survive an authentication redirect. */
export function signupDestination(next?: string): string {
  if (
    !next ||
    !next.startsWith("/") ||
    next.startsWith("//") ||
    next.includes("\\") ||
    [...next].some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)
  )
    return "/home";
  return next;
}

export function signupError(message: string): string {
  if (/weak|easy to guess|breach|pwned/i.test(message)) {
    return "This password is too easy to guess or appears in a known breach. Choose a longer, unique passphrase or use a password manager.";
  }
  return message;
}

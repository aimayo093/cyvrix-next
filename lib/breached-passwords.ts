import "server-only";
import { BREACHED_PASSWORD_MESSAGE, breachCountFromRange, passwordHashParts } from "@/lib/breached-passwords-core";

/**
 * Whether a new password has appeared in a public data breach, using the Have
 * I Been Pwned "Pwned Passwords" range API.
 *
 * k-anonymity: only the first 5 characters of the password's SHA-1 leave the
 * server, so the service never learns the password or its full hash. Padding
 * is requested so the response size does not narrow it down either.
 *
 * It FAILS OPEN. If the service is slow or unreachable the password is
 * accepted on the length rule alone, and the failure is logged. Refusing every
 * password change while a third party is down would lock people into the
 * password they are trying to replace. See DECISIONS section 13.
 */
const RANGE_URL = "https://api.pwnedpasswords.com/range/";
const TIMEOUT_MS = 3000;

export type BreachCheck =
  | { status: "breached"; count: number }
  | { status: "clear" }
  | { status: "unchecked" };

export async function checkPasswordBreach(password: string): Promise<BreachCheck> {
  const { prefix, suffix } = passwordHashParts(password);
  try {
    const response = await fetch(`${RANGE_URL}${prefix}`, {
      headers: { "Add-Padding": "true", "User-Agent": "cyvrix-password-check" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    if (!response.ok) {
      console.warn(`[breached-passwords] range lookup returned ${response.status}; accepting on length alone`);
      return { status: "unchecked" };
    }
    const count = breachCountFromRange(await response.text(), suffix);
    return count > 0 ? { status: "breached", count } : { status: "clear" };
  } catch (error) {
    console.warn("[breached-passwords] range lookup failed; accepting on length alone", error instanceof Error ? error.name : "error");
    return { status: "unchecked" };
  }
}

/** The refusal to show, or null when the password may be used. */
export async function breachedPasswordProblem(password: string): Promise<string | null> {
  const result = await checkPasswordBreach(password);
  return result.status === "breached" ? BREACHED_PASSWORD_MESSAGE : null;
}

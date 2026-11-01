export const PASSWORD_MIN = 10;
/** Supabase hashes with bcrypt, which rejects anything over 72 bytes. */
export const PASSWORD_MAX_BYTES = 72;

const RULES = [
  { key: "length", label: `At least ${PASSWORD_MIN} characters`, test: (p: string) => [...p].length >= PASSWORD_MIN },
  { key: "lower", label: "A lowercase letter", test: (p: string) => /\p{Ll}/u.test(p) },
  { key: "upper", label: "A capital letter", test: (p: string) => /\p{Lu}/u.test(p) },
  { key: "number", label: "A number", test: (p: string) => /\d/.test(p) },
  { key: "symbol", label: "A symbol, like ! @ # or ?", test: (p: string) => /[^\p{L}\d]/u.test(p) },
];

const COMMON = ["password", "qwerty", "letmein", "welcome", "admin", "almera", "iloveyou", "abc123", "123456", "111111"];
const SEQUENCES = ["1234", "2345", "3456", "4567", "5678", "6789", "9876", "8765", "7654", "6543", "5432", "4321", "abcd", "qwer", "asdf", "zxcv"];
const LOOKALIKES: Record<string, string> = { "@": "a", "4": "a", "3": "e", "1": "i", "!": "i", "0": "o", "$": "s", "5": "s", "7": "t" };

const plain = (password: string) => password.toLowerCase().replace(/[@431!0$57]/g, (c) => LOOKALIKES[c]);

export type PasswordContext = { email?: string | null; name?: string | null };

export function checkPassword(password: string, context: PasswordContext = {}) {
  const rules = RULES.map(({ key, label, test }) => ({ key, label, met: test(password) }));
  const lower = password.toLowerCase();
  const simplified = plain(password);
  const issues: string[] = [];

  if (new TextEncoder().encode(password).length > PASSWORD_MAX_BYTES) {
    issues.push(`Use ${PASSWORD_MAX_BYTES} characters or fewer.`);
  }
  if (COMMON.some((word) => lower.includes(word) || simplified.includes(plain(word)))) {
    issues.push("Avoid common words like “password” or “qwerty”.");
  }
  if (/(.)\1{3,}/u.test(password) || SEQUENCES.some((run) => lower.includes(run))) {
    issues.push("Avoid repeats and runs like “aaaa” or “1234”.");
  }

  const personal = [context.email?.split("@")[0], ...(context.name?.split(/\s+/) ?? [])]
    .map((part) => part?.trim().toLowerCase() ?? "")
    .filter((part) => part.length >= 4);
  if (personal.some((part) => lower.includes(part))) {
    issues.push("Don’t use your name or email in your password.");
  }

  const met = rules.filter((rule) => rule.met).length;
  const valid = met === rules.length && issues.length === 0;
  const longEnough = [...password].length >= 14;
  const strength = !password ? 0 : !valid ? (met >= 4 ? 2 : 1) : longEnough ? 4 : 3;

  return { rules, issues, valid, strength };
}

export const STRENGTH_LABEL = ["", "Weak", "Almost there", "Strong", "Very strong"];

/** The first thing to fix, written for the customer. */
export function passwordProblem(password: string, context?: PasswordContext) {
  const { rules, issues, valid } = checkPassword(password, context);
  if (valid) return null;
  const missing = rules.filter((rule) => !rule.met);
  if (missing.length > 0) return `Your password needs: ${missing.map((rule) => rule.label.toLowerCase()).join(", ")}.`;
  return issues[0];
}

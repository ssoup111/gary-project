/**
 * Sanity checks on recipient details, before money changes hands.
 *
 * Deliberately narrow: this rejects values that cannot be a real person or
 * a real ID number. It does NOT try to enforce per-state DOC number
 * formats - those differ across every state and getting one wrong would
 * block a paying customer from reaching a real inmate, which is worse than
 * letting an odd-looking number through to the confirmation step.
 *
 * Real verification happens two ways: the customer confirms the details on
 * screen before paying, and whoever fulfils the order sees them on JPay
 * before sending anything.
 */

export type CheckResult = { ok: true } | { ok: false; message: string };

const PLACEHOLDERS = [
  "test", "testing", "tester", "asdf", "qwerty", "sample", "example",
  "fake", "dummy", "none", "n/a", "na", "unknown", "john doe", "jane doe",
  "first last", "firstname lastname", "abc", "xyz",
];

/** 123456, 654321 and friends - nobody's ID number is a counting sequence. */
function isSequential(digits: string): boolean {
  if (digits.length < 5) return false;
  let up = true;
  let down = true;
  for (let i = 1; i < digits.length; i++) {
    const step = digits.charCodeAt(i) - digits.charCodeAt(i - 1);
    if (step !== 1) up = false;
    if (step !== -1) down = false;
  }
  return up || down;
}

function isRepeated(value: string): boolean {
  return value.length >= 4 && new Set(value).size === 1;
}

export function checkInmateNumber(raw: string): CheckResult {
  const value = (raw || "").trim();
  if (!value) return { ok: false, message: "Enter the inmate / offender number." };

  const compact = value.replace(/[\s-]/g, "");

  if (!/^[A-Za-z0-9]+$/.test(compact)) {
    return { ok: false, message: "The number should contain only letters and digits." };
  }
  if (compact.length < 4) {
    return { ok: false, message: "That number looks too short. Check it against their mail." };
  }
  if (compact.length > 12) {
    return { ok: false, message: "That number looks too long. Check it against their mail." };
  }
  if (isRepeated(compact)) {
    return { ok: false, message: "That doesn't look like a real ID number." };
  }

  // Only applied to all-digit numbers. Several states issue a letter
  // prefix followed by a short run (California's A12345 style), and
  // stripping the letter first made those look like a counting sequence.
  if (/^\d+$/.test(compact) && isSequential(compact)) {
    return { ok: false, message: "That doesn't look like a real ID number." };
  }
  if (PLACEHOLDERS.includes(compact.toLowerCase())) {
    return { ok: false, message: "That doesn't look like a real ID number." };
  }

  return { ok: true };
}

export function checkRecipientName(raw: string): CheckResult {
  const value = (raw || "").trim().replace(/\s+/g, " ");
  if (!value) return { ok: false, message: "Enter your recipient's full name." };
  if (value.length < 3) return { ok: false, message: "That name looks too short." };
  if (!/[A-Za-z]/.test(value)) {
    return { ok: false, message: "That name doesn't look right." };
  }
  if (PLACEHOLDERS.includes(value.toLowerCase())) {
    return { ok: false, message: "Please enter your recipient's real name." };
  }
  if (/^(.)\1+$/.test(value.replace(/\s/g, ""))) {
    return { ok: false, message: "Please enter your recipient's real name." };
  }
  return { ok: true };
}

/** True when the name has no second part - worth a nudge, not a block. */
export function looksLikeSingleName(raw: string): boolean {
  return (raw || "").trim().split(/\s+/).filter(Boolean).length < 2;
}

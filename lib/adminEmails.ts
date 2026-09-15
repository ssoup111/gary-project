/**
 * Who counts as an administrator.
 *
 * NEXT_PUBLIC_ADMIN_EMAIL holds a comma-separated list so more than one
 * account can administer the site without a code change. The fallback keeps
 * the original address working if the variable is ever missing, so a
 * misconfigured environment cannot lock everyone out.
 */
export const ADMIN_EMAILS = (
  process.env.NEXT_PUBLIC_ADMIN_EMAIL || "ssoup1@protonmail.com"
)
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.trim().toLowerCase());
}

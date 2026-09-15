import { createClient } from "@supabase/supabase-js";

/**
 * Server-side admin check for /api/admin routes.
 *
 * These routes used to verify only that the caller was signed in, which any
 * customer with an account is. Being signed in is not the same as being an
 * administrator.
 */
export type AdminCheck =
  | { ok: true; email: string }
  | { ok: false; status: number; error: string };

function adminEmails(): string[] {
  return (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "ssoup1@protonmail.com")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export async function requireAdmin(req: Request): Promise<AdminCheck> {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return { ok: false, status: 500, error: "Supabase is not configured." };
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return { ok: false, status: 401, error: "Not signed in." };
  }

  const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data, error } = await supabaseAuth.auth.getUser();
  if (error || !data.user) {
    return { ok: false, status: 401, error: "Not signed in." };
  }

  const email = (data.user.email || "").toLowerCase();
  if (!adminEmails().includes(email)) {
    return { ok: false, status: 403, error: "This account is not an administrator." };
  }

  return { ok: true, email };
}

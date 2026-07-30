import { Resend } from "resend";

// From address must use your Resend-verified domain, e.g.
// "Friends Behind Bars <orders@friendsbehindbars.com>".
const DEFAULT_FROM =
  process.env.EMAIL_FROM || "Friends Behind Bars <orders@friendsbehindbars.com>";

// Where customer replies (and misdirected mail) should land — a mailbox you
// actually check. Set EMAIL_REPLY_TO in the environment to change it.
const DEFAULT_REPLY_TO = process.env.EMAIL_REPLY_TO || "ssoup1@gmail.com";

type SendArgs = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  from?: string;
};

/**
 * Send a transactional email via Resend.
 *
 * Never throws — returns { ok, error } so callers (webhooks, cron) can log and
 * continue instead of failing the whole request when email hiccups.
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
  replyTo,
  from,
}: SendArgs): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("Email not sent: RESEND_API_KEY is not set.");
    return { ok: false, error: "RESEND_API_KEY missing" };
  }

  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from: from || DEFAULT_FROM,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text,
      replyTo: replyTo || DEFAULT_REPLY_TO,
    });

    if (error) {
      console.error("Resend send error:", error);
      return { ok: false, error: String((error as { message?: string })?.message || error) };
    }

    console.log(
      `Email sent (id ${data?.id ?? "?"}) to ${Array.isArray(to) ? to.join(", ") : to}`,
    );
    return { ok: true };
  } catch (err) {
    console.error("Email send threw:", err);
    return { ok: false, error: String((err as { message?: string })?.message || err) };
  }
}

import 'server-only';

export interface OutgoingEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Where a reply goes: the other person in the booking. */
  replyTo?: string;
}

const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const SEND_TIMEOUT_MS = 8000;

export const EMAIL_FROM = process.env.EMAIL_FROM ?? 'Consultly <consultly@redefyn.dev>';

/**
 * Sends one email through Resend's HTTP API. Never throws: a failed email
 * must not undo or block the booking that triggered it, so failures are
 * logged and reported as `false`.
 *
 * Without RESEND_API_KEY (local development, tests) nothing is sent; in
 * development the email is printed to the terminal instead.
 */
export async function sendEmail(email: OutgoingEmail): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[email] (not sent: no RESEND_API_KEY) to=${email.to} reply-to=${email.replyTo ?? '-'}\n  subject: ${email.subject}\n${indent(email.text)}`);
    }
    return false;
  }

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [email.to],
        subject: email.subject,
        html: email.html,
        text: email.text,
        ...(email.replyTo && { reply_to: email.replyTo }),
      }),
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    });
    if (!res.ok) {
      console.error(`[email] Resend rejected email to ${email.to}: ${res.status} ${(await res.text()).slice(0, 300)}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`[email] could not send email to ${email.to}:`, err);
    return false;
  }
}

function indent(text: string) {
  return text
    .split('\n')
    .map((line) => `    ${line}`)
    .join('\n');
}

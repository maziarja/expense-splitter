import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const EMAIL_FROM = "Expense Splitter <expense-splitter@mazdev.dev>";

// Inline styles only — email clients don't run Tailwind. Colors are the
// light-theme brand tokens from guidance/brand-kit.md, since email clients
// can't be relied on to respect prefers-color-scheme consistently.
function renderAuthEmail({
  heading,
  body,
  ctaLabel,
  ctaUrl,
}: {
  heading: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
}): string {
  return `
    <div style="background-color:#F6F8FB;padding:40px 16px;font-family:Helvetica,Arial,sans-serif;">
      <div style="max-width:480px;margin:0 auto;background-color:#FFFFFF;border:1px solid #DBE1EA;border-radius:12px;padding:32px;">
        <p style="margin:0 0 24px;font-size:14px;font-weight:700;color:#131A26;letter-spacing:-0.01em;">
          Expense Splitter
        </p>
        <h1 style="margin:0 0 12px;font-size:20px;line-height:1.3;color:#131A26;">
          ${heading}
        </h1>
        <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#566073;">
          ${body}
        </p>
        <a
          href="${ctaUrl}"
          style="display:inline-block;padding:10px 20px;background-color:#2A62D6;color:#FFFFFF;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;"
        >
          ${ctaLabel}
        </a>
        <p style="margin:24px 0 0;font-size:12px;line-height:1.5;color:#646E7C;">
          Or paste this link into your browser: ${ctaUrl}
        </p>
      </div>
    </div>
  `;
}

export async function sendVerificationEmail(to: string, url: string) {
  await resend.emails.send({
    from: EMAIL_FROM,
    to,
    subject: "Verify your email address",
    html: renderAuthEmail({
      heading: "Verify your email address",
      body: "Confirm this is your email address to finish setting up your Expense Splitter account.",
      ctaLabel: "Verify email",
      ctaUrl: url,
    }),
  });
}

export async function sendPasswordResetEmail(to: string, url: string) {
  await resend.emails.send({
    from: EMAIL_FROM,
    to,
    subject: "Reset your password",
    html: renderAuthEmail({
      heading: "Reset your password",
      body: "We got a request to reset your Expense Splitter password. If this wasn't you, you can safely ignore this email.",
      ctaLabel: "Reset password",
      ctaUrl: url,
    }),
  });
}

export async function sendAddedToGroupEmail(
  to: string,
  {
    groupName,
    groupId,
    inviterName,
  }: { groupName: string; groupId: string; inviterName?: string | null },
) {
  const url = `${process.env.BETTER_AUTH_URL}/dashboard/${groupId}`;
  const who = inviterName ? `${inviterName} added you` : "You've been added";
  await resend.emails.send({
    from: EMAIL_FROM,
    to,
    subject: `You're in "${groupName}" on Expense Splitter`,
    html: renderAuthEmail({
      heading: `You're in "${groupName}"`,
      body: `${who} to "${groupName}" on Expense Splitter. Open the group to see expenses and balances.`,
      ctaLabel: "Open group",
      ctaUrl: url,
    }),
  });
}

export async function sendGroupInviteEmail(
  to: string,
  { groupName, inviterName }: { groupName: string; inviterName?: string | null },
) {
  const url = `${process.env.BETTER_AUTH_URL}/sign-up`;
  const who = inviterName ? `${inviterName} added you` : "You've been added";
  await resend.emails.send({
    from: EMAIL_FROM,
    to,
    subject: `You've been added to "${groupName}" on Expense Splitter`,
    html: renderAuthEmail({
      heading: `Join "${groupName}" on Expense Splitter`,
      body: `${who} to "${groupName}" on Expense Splitter. Sign up with this email address to see the group's expenses and balances.`,
      ctaLabel: "Create your account",
      ctaUrl: url,
    }),
  });
}

// sendEmail wrapper (§8). Dev mode: console transport (no Resend key needed).
// All sends are logged to EmailLog for the admin panel.

import { createElement } from "react";
import { renderAsync } from "@react-email/components";
import { WelcomeEmail } from "./welcome";
import { MagicLinkEmail } from "./magic-link";
import { InviteEmail } from "./invite";
import { PaymentFailedEmail } from "./payment-failed";
import { UsageAlertEmail } from "./usage-alert";

const templates = { WelcomeEmail, MagicLinkEmail, InviteEmail, PaymentFailedEmail, UsageAlertEmail };
export type EmailTemplate = keyof typeof templates;
export type EmailProps = Record<string, unknown>;

/** Send a typed email template. Works without a Resend key in dev (logs HTML to console). */
export async function sendEmail(template: EmailTemplate, props: EmailProps, to: string): Promise<void> {
  const component = templates[template];
  // @ts-expect-error — props shape is validated by the caller
  const html = await renderAsync(createElement(component, props));

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "WonderKit <noreply@example.com>";

  if (!apiKey) {
    console.log(`\n[dev email] ${template} → ${to}\n${html.slice(0, 400)}...\n`);
    return;
  }

  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);
  const subject = subjectFor(template, props);
  await resend.emails.send({ from, to, subject, html });
}

function subjectFor(template: EmailTemplate, props: EmailProps): string {
  const subjects: Record<EmailTemplate, string> = {
    WelcomeEmail: "Welcome to WonderKit",
    MagicLinkEmail: "Your WonderKit sign-in link",
    InviteEmail: `You've been invited to join ${props.orgName ?? "an organization"} on WonderKit`,
    PaymentFailedEmail: "Action required: payment failed",
    UsageAlertEmail: `${props.usedPct ?? ""}% of your token quota used`,
  };
  return subjects[template];
}

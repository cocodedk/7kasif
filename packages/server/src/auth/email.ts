import nodemailer from 'nodemailer';

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 10_000,
    auth: { user, pass },
  });
}

export async function sendEmail({ to, subject, html }: SendEmailParams): Promise<void> {
  const transporter = getTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  if (!transporter) {
    console.log('[DEV] Magic link email to:', to);
    console.log('[DEV] Subject:', subject);
    console.log('[DEV] HTML:', html);
    return;
  }

  await transporter.sendMail({ from, to, subject, html });
}

export function buildMagicLinkEmail(url: string, isInvite: boolean): { subject: string; html: string } {
  const subject = isInvite
    ? 'You\'re invited to Hafte Kasif'
    : 'Your login link for Hafte Kasif';

  const heading = isInvite
    ? 'Welcome to Hafte Kasif!'
    : 'Log in to Hafte Kasif';

  const intro = isInvite
    ? 'You\'ve been invited to play Hafte Kasif (The Dirty Seven). Click the link below to get started:'
    : 'Click the link below to log in:';

  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #1b5e3b;">${heading}</h2>
      <p>${intro}</p>
      <a href="${url}" style="display: inline-block; background: #16a34a; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
        ${isInvite ? 'Accept Invitation' : 'Log In'}
      </a>
      <p style="color: #666; font-size: 14px; margin-top: 24px;">
        This link expires in 15 minutes. If you didn't request this, you can safely ignore this email.
      </p>
    </div>
  `;

  return { subject, html };
}

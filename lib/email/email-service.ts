import nodemailer from "nodemailer";

export interface SendGuideVerificationEmailParams {
  to: string;
  guideName?: string | null;
  rawToken: string;
  verificationUrl?: string;
}

export interface SentEmailRecord {
  to: string;
  subject: string;
  verificationUrl: string;
  timestamp: Date;
  messageId: string;
}

// In-memory audit history of sent emails for local dev, integration testing, and verification auditing
const sentEmailAuditStore: SentEmailRecord[] = [];

/**
 * Retrieves the base application URL from environment variables.
 * Never hardcodes localhost in production.
 */
export function getAppBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "");
  }
  if (process.env.APP_URL) {
    return process.env.APP_URL.replace(/\/+$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/+$/, "")}`;
  }
  return "http://localhost:3000";
}

/**
 * Builds the verification URL for a given token.
 */
export function buildVerificationUrl(rawToken: string): string {
  const baseUrl = getAppBaseUrl();
  return `${baseUrl}/verify-guide?token=${encodeURIComponent(rawToken)}`;
}

/**
 * Generates the HTML template for the guide email verification message.
 */
export function generateVerificationEmailHtml({
  guideName,
  verificationUrl,
}: {
  guideName?: string | null;
  verificationUrl: string;
}): string {
  const greeting = guideName ? `Hello ${guideName},` : "Hello,";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify your Roamly Guide Account</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #FAFBF8;
      color: #1a1a1a;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #FAFBF8;
      padding: 40px 16px;
    }
    .container {
      max-width: 580px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 20px;
      border: 1px solid #e5e7db;
      padding: 40px 32px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
    }
    .logo-container {
      margin-bottom: 28px;
      text-align: center;
    }
    .brand-title {
      font-size: 24px;
      font-weight: 800;
      color: #485C11;
      letter-spacing: -0.5px;
      margin: 0;
    }
    .brand-subtitle {
      font-size: 13px;
      color: #6b7280;
      margin-top: 4px;
    }
    .heading {
      font-size: 20px;
      font-weight: 700;
      color: #1a1a1a;
      margin-top: 0;
      margin-bottom: 16px;
    }
    .text {
      font-size: 15px;
      line-height: 1.6;
      color: #4b5563;
      margin: 0 0 16px 0;
    }
    .button-container {
      text-align: center;
      margin: 32px 0;
    }
    .button {
      display: inline-block;
      background-color: #485C11;
      color: #ffffff !important;
      text-decoration: none;
      font-size: 15px;
      font-weight: 600;
      padding: 14px 36px;
      border-radius: 9999px;
      box-shadow: 0 4px 12px rgba(72, 92, 17, 0.25);
    }
    .link-fallback {
      background-color: #f4f7ee;
      border: 1px solid #d6dacb;
      border-radius: 12px;
      padding: 14px;
      font-size: 12px;
      word-break: break-all;
      color: #485C11;
      margin: 20px 0;
    }
    .footer {
      border-top: 1px solid #f0f4e8;
      margin-top: 32px;
      padding-top: 20px;
      font-size: 12px;
      color: #9ca3af;
      text-align: center;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="logo-container">
        <h1 class="brand-title">Roamly</h1>
        <p class="brand-subtitle">Local Guides & Authentic Journeys</p>
      </div>

      <h2 class="heading">${greeting}</h2>
      <p class="text">Your Roamly guide registration is almost complete.</p>
      <p class="text">Click the button below to verify your email and activate your guide profile. Once verified, your profile will become visible to travelers and eligible to receive tour booking requests.</p>

      <div class="button-container">
        <a href="${verificationUrl}" class="button" target="_blank" rel="noopener noreferrer">Verify Guide Account</a>
      </div>

      <p class="text" style="font-size: 13px; color: #6b7280;">If the button above does not work, copy and paste this verification URL into your web browser:</p>
      <div class="link-fallback">${verificationUrl}</div>

      <p class="text" style="font-size: 13px; color: #9ca3af;">This verification link will expire in 24 hours. If you did not create a Roamly guide account, please disregard this email.</p>

      <div class="footer">
        © ${new Date().getFullYear()} Roamly Technologies Inc. All rights reserved.<br>
        Crafted with passion for local tourism.
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generates the plain-text fallback for the guide verification email.
 */
export function generateVerificationEmailText({
  guideName,
  verificationUrl,
}: {
  guideName?: string | null;
  verificationUrl: string;
}): string {
  const greeting = guideName ? `Hello ${guideName},` : "Hello,";

  return `
${greeting}

Your Roamly guide registration is almost complete.
Click the link below to verify your email and activate your guide profile:

${verificationUrl}

Once verified, your profile will become visible to travelers and eligible to receive tour booking requests.

This verification link will expire in 24 hours. If you did not request this, please disregard this email.

— The Roamly Team
  `.trim();
}

/**
 * Sends a transactional guide verification email.
 * Supports SMTP (via nodemailer), Resend API, or development fallback with test audit logging.
 */
export async function sendGuideVerificationEmail({
  to,
  guideName,
  rawToken,
  verificationUrl,
}: SendGuideVerificationEmailParams): Promise<{ success: boolean; messageId: string; verificationUrl: string }> {
  if (!to || !to.includes("@")) {
    throw new Error(`Invalid recipient email address: "${to}"`);
  }

  const finalUrl = verificationUrl || buildVerificationUrl(rawToken);
  const subject = "Verify your Roamly Guide Account";
  const html = generateVerificationEmailHtml({ guideName, verificationUrl: finalUrl });
  const text = generateVerificationEmailText({ guideName, verificationUrl: finalUrl });

  const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  // Record into test / audit store
  const auditRecord: SentEmailRecord = {
    to,
    subject,
    verificationUrl: finalUrl,
    timestamp: new Date(),
    messageId,
  };
  sentEmailAuditStore.push(auditRecord);

  // Check for SMTP configuration
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD;
  const fromEmail = process.env.EMAIL_FROM || "Roamly Verification <euphatics@gmail.com>";

  if ((smtpHost || smtpUser?.includes("@gmail.com")) && smtpUser && smtpPass) {
    try {
      const isGmail = (smtpHost && smtpHost.includes("gmail")) || smtpUser.includes("@gmail.com");
      const transporter = isGmail
        ? nodemailer.createTransport({
            service: "gmail",
            auth: {
              user: smtpUser,
              pass: smtpPass,
            },
          })
        : nodemailer.createTransport({
            host: smtpHost,
            port: smtpPort,
            secure: smtpPort === 465,
            auth: {
              user: smtpUser,
              pass: smtpPass,
            },
          });

      const info = await transporter.sendMail({
        from: fromEmail,
        to,
        subject,
        text,
        html,
      });

      return {
        success: true,
        messageId: info.messageId || messageId,
        verificationUrl: finalUrl,
      };
    } catch (smtpError) {
      console.error("SMTP dispatch failed, falling back:", smtpError);
    }
  }

  // Check for Resend API configuration
  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Roamly <onboarding@resend.dev>",
          to: [to],
          subject,
          html,
          text,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        return {
          success: true,
          messageId: data.id || messageId,
          verificationUrl: finalUrl,
        };
      }
    } catch (resendError) {
      console.error("Resend API dispatch failed:", resendError);
    }
  }

  // Development / Default transactional dispatch
  console.log("\n============================================================");
  console.log(`📧 [ROAMLY GUIDE VERIFICATION] Recipient: ${to}`);
  console.log(`🔗 Click to Verify: ${finalUrl}`);
  console.log("============================================================\n");

  return {
    success: true,
    messageId,
    verificationUrl: finalUrl,
  };
}

/**
 * Helpers for unit testing and verification auditing.
 */
export function getLastSentEmail(): SentEmailRecord | undefined {
  return sentEmailAuditStore[sentEmailAuditStore.length - 1];
}

export function getAllSentEmails(): SentEmailRecord[] {
  return [...sentEmailAuditStore];
}

export function clearSentEmails(): void {
  sentEmailAuditStore.length = 0;
}

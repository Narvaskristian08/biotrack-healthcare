import { env } from '../config/env.js';

function ensureLeadingPlus(value) {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return '';
  return trimmed.startsWith('+') ? trimmed : `+${trimmed}`;
}

function normalizePhoneNumber(raw) {
  const input = String(raw ?? '').trim();
  if (!input) return '';

  if (input.startsWith('+')) {
    return `+${input.slice(1).replace(/\D/g, '')}`;
  }

  const digits = input.replace(/\D/g, '');
  if (!digits) return '';

  if (digits.startsWith('0')) {
    const countryPrefix = ensureLeadingPlus(env.SMS_DEFAULT_COUNTRY_CODE || '+63');
    return `${countryPrefix}${digits.slice(1)}`;
  }

  if (digits.startsWith('63')) {
    return `+${digits}`;
  }

  const countryPrefix = ensureLeadingPlus(env.SMS_DEFAULT_COUNTRY_CODE || '+63');
  return `${countryPrefix}${digits}`;
}

export function maskEmailAddress(email) {
  const value = String(email ?? '').trim();
  if (!value || !value.includes('@')) return value;

  const [local, domain] = value.split('@');
  const localHead = local.slice(0, 2);
  return `${localHead}${'*'.repeat(Math.max(2, local.length - 2))}@${domain}`;
}

export function maskContactNumber(contactNumber) {
  const digits = String(contactNumber ?? '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length <= 4) return `${'*'.repeat(digits.length)}`;
  return `${'*'.repeat(digits.length - 4)}${digits.slice(-4)}`;
}

function hasSmtpConfig() {
  return Boolean(env.SMTP_HOST && env.SMTP_PORT && env.SMTP_USER && env.SMTP_PASS);
}

function hasTwilioConfig() {
  return Boolean(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_FROM_NUMBER);
}

function getPortalLoginUrl() {
  const origins = String(env.CORS_ORIGIN ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (!origins.length) return '';

  const preferredOrigin =
    origins.find((entry) => {
      try {
        return new URL(entry).hostname === '127.0.0.1';
      } catch {
        return false;
      }
    }) ??
    origins.find((entry) => {
      try {
        return new URL(entry).hostname === 'localhost';
      } catch {
        return false;
      }
    }) ??
    origins[0];

  return `${preferredOrigin.replace(/\/+$/, '')}/login`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

let smtpTransporter = null;
let twilioClient = null;

async function getSmtpTransporter() {
  if (smtpTransporter) return smtpTransporter;
  const nodemailerModule = await import('nodemailer');
  const nodemailer = nodemailerModule.default ?? nodemailerModule;
  smtpTransporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: Boolean(env.SMTP_SECURE),
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });
  return smtpTransporter;
}

async function getTwilioClient() {
  if (twilioClient) return twilioClient;
  const twilioModule = await import('twilio');
  const twilioFactory = twilioModule.default ?? twilioModule;
  twilioClient = twilioFactory(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
  return twilioClient;
}

async function deliverEmailCode({ email, code }) {
  const recipientMasked = maskEmailAddress(email);
  const subject = 'BioTrack Verification Code';
  const text = `Your BioTrack verification code is ${code}. This code expires in ${env.OTP_TTL_MINUTES} minutes.`;

  if (hasSmtpConfig()) {
    const transporter = await getSmtpTransporter();
    await transporter.sendMail({
      from: env.SMTP_FROM || env.SMTP_USER,
      to: email,
      subject,
      text,
    });
    return { recipientMasked, channel: 'smtp' };
  }

  if (env.NODE_ENV === 'production') {
    throw new Error('Email verification is not configured');
  }

  // eslint-disable-next-line no-console
  console.log(`[DEV_EMAIL_VERIFICATION] to=${email} code=${code}`);
  return { recipientMasked, channel: 'dev', devPreviewCode: code };
}

async function deliverSmsCode({ contactNumber, code }) {
  const normalizedNumber = normalizePhoneNumber(contactNumber);
  const recipientMasked = maskContactNumber(normalizedNumber || contactNumber);
  const message = `Your BioTrack verification code is ${code}. It expires in ${env.OTP_TTL_MINUTES} minutes.`;

  if (hasTwilioConfig()) {
    const client = await getTwilioClient();
    await client.messages.create({
      from: env.TWILIO_FROM_NUMBER,
      to: normalizedNumber,
      body: message,
    });
    return { recipientMasked, channel: 'twilio' };
  }

  if (env.NODE_ENV === 'production') {
    throw new Error('SMS verification is not configured');
  }

  // eslint-disable-next-line no-console
  console.log(`[DEV_SMS_VERIFICATION] to=${normalizedNumber || contactNumber} code=${code}`);
  return { recipientMasked, channel: 'dev', devPreviewCode: code };
}

export async function deliverPatientVerificationCode({ method, code, email, contactNumber }) {
  if (method === 'email') {
    return deliverEmailCode({ email, code });
  }
  return deliverSmsCode({ contactNumber, code });
}

export async function deliverProviderOnboardingNotification({
  email,
  barangayName = '',
  cityMunicipality = '',
  healthCenterName = '',
  status = 'pending',
  loginEmail = '',
  temporaryPassword = '',
}) {
  const recipient = String(email ?? '').trim().toLowerCase();
  const recipientMasked = maskEmailAddress(recipient);
  if (!recipient) {
    return {
      attempted: false,
      delivered: false,
      channel: 'none',
      recipientMasked,
      message: 'Missing provider email; notification skipped.',
    };
  }

  const normalizedStatus = String(status ?? 'pending').trim().toLowerCase();
  const normalizedLoginEmail = String(loginEmail ?? recipient).trim().toLowerCase() || recipient;
  const normalizedTemporaryPassword = String(temporaryPassword ?? '');
  const loginUrl = getPortalLoginUrl();
  const subject = 'BioTrack Provider Account Onboarding';
  const hasCredentials = Boolean(normalizedLoginEmail && normalizedTemporaryPassword);
  const statusStyleByValue = {
    pending: { label: 'PENDING', bg: '#f59e0b' },
    verified: { label: 'VERIFIED', bg: '#0ea5e9' },
    active: { label: 'ACTIVE', bg: '#16a34a' },
  };
  const statusView = statusStyleByValue[normalizedStatus] ?? { label: normalizedStatus.toUpperCase() || 'N/A', bg: '#64748b' };
  const safeLoginUrl = escapeHtml(loginUrl);
  const safeBarangay = escapeHtml(String(barangayName).trim() || 'N/A');
  const safeCityMunicipality = escapeHtml(String(cityMunicipality).trim() || 'N/A');
  const safeHealthCenterName = escapeHtml(String(healthCenterName).trim() || 'N/A');
  const safeLoginEmail = escapeHtml(normalizedLoginEmail || 'N/A');
  const safeTemporaryPassword = escapeHtml(normalizedTemporaryPassword);
  const safeRecipient = escapeHtml(recipient);

  const textLines = [
    'Your BioTrack healthcare provider account has been created by an administrator.',
    '',
    `Barangay: ${String(barangayName).trim() || 'N/A'}`,
    `City/Municipality: ${String(cityMunicipality).trim() || 'N/A'}`,
    `Health Center: ${String(healthCenterName).trim() || 'N/A'}`,
    `Current Status: ${normalizedStatus}`,
    '',
    `Login Email: ${normalizedLoginEmail || 'N/A'}`,
    hasCredentials ? `Temporary Password: ${normalizedTemporaryPassword}` : '',
    hasCredentials ? 'Please change this password immediately after your first login.' : '',
    '',
    loginUrl ? `Login URL: ${loginUrl}` : '',
    hasCredentials
      ? 'Use the credentials above to sign in.'
      : 'Use your registered email and the password provided by your administrator to sign in.',
    '',
    'If this onboarding was unexpected, please contact your administrator immediately.',
  ].filter(Boolean);
  const text = textLines.join('\n');
  const html = `
<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f1f5f9;font-family:Segoe UI,Arial,sans-serif;color:#0f172a;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:680px;margin:0 auto;">
      <tr>
        <td style="padding:0;">
          <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;">
            <div style="background:linear-gradient(90deg,#0b5c8c 0%,#1f8fc4 100%);padding:18px 22px;color:#ffffff;">
              <h1 style="margin:0;font-size:22px;line-height:1.25;font-weight:700;">BioTrack Provider Onboarding</h1>
              <p style="margin:8px 0 0 0;font-size:13px;opacity:0.9;">Healthcare Provider Account Notification</p>
            </div>
            <div style="padding:22px;">
              <p style="margin:0 0 14px 0;font-size:15px;line-height:1.5;">Your BioTrack healthcare provider account has been created by an administrator.</p>

              <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:14px 16px;margin-bottom:14px;">
                <p style="margin:0 0 10px 0;font-size:12px;color:#475569;letter-spacing:.04em;text-transform:uppercase;">Onboarding Details</p>
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="font-size:14px;line-height:1.5;">
                  <tr><td style="padding:3px 0;color:#334155;">Barangay</td><td style="padding:3px 0;font-weight:600;text-align:right;">${safeBarangay}</td></tr>
                  <tr><td style="padding:3px 0;color:#334155;">City/Municipality</td><td style="padding:3px 0;font-weight:600;text-align:right;">${safeCityMunicipality}</td></tr>
                  <tr><td style="padding:3px 0;color:#334155;">Health Center</td><td style="padding:3px 0;font-weight:600;text-align:right;">${safeHealthCenterName}</td></tr>
                  <tr>
                    <td style="padding:3px 0;color:#334155;">Current Status</td>
                    <td style="padding:3px 0;text-align:right;">
                      <span style="display:inline-block;padding:4px 10px;border-radius:999px;font-size:11px;font-weight:700;letter-spacing:.04em;color:#ffffff;background:${statusView.bg};">${escapeHtml(statusView.label)}</span>
                    </td>
                  </tr>
                </table>
              </div>

              <div style="background:#ecfeff;border:1px solid #a5f3fc;border-radius:12px;padding:14px 16px;margin-bottom:14px;">
                <p style="margin:0 0 10px 0;font-size:12px;color:#155e75;letter-spacing:.04em;text-transform:uppercase;">Login Credentials</p>
                <p style="margin:0 0 6px 0;font-size:14px;"><strong>Email:</strong> ${safeLoginEmail}</p>
                ${
                  hasCredentials
                    ? `<p style="margin:0 0 8px 0;font-size:14px;"><strong>Temporary Password:</strong> ${safeTemporaryPassword}</p>`
                    : ''
                }
                ${
                  hasCredentials
                    ? '<p style="margin:0;font-size:12px;color:#0f766e;">Please change this password immediately after your first login.</p>'
                    : '<p style="margin:0;font-size:12px;color:#0f766e;">Use the password provided separately by your administrator.</p>'
                }
              </div>

              ${
                loginUrl
                  ? `
                    <a href="${safeLoginUrl}" style="display:inline-block;background:#0ea5e9;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:10px;font-size:14px;font-weight:600;">Open BioTrack Login</a>
                    <p style="margin:10px 0 0 0;font-size:12px;color:#64748b;">Login URL: ${safeLoginUrl}</p>
                  `
                  : ''
              }

              <p style="margin:16px 0 0 0;font-size:12px;color:#64748b;">If this onboarding was unexpected, please contact your administrator immediately.</p>
            </div>
            <div style="padding:12px 22px;border-top:1px solid #e2e8f0;background:#f8fafc;">
              <p style="margin:0;font-size:11px;color:#64748b;">This message was sent to ${safeRecipient} by BioTrack.</p>
            </div>
          </div>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  if (hasSmtpConfig()) {
    try {
      const transporter = await getSmtpTransporter();
      await transporter.sendMail({
        from: env.SMTP_FROM || env.SMTP_USER,
        to: recipient,
        subject,
        text,
        html,
      });
      return {
        attempted: true,
        delivered: true,
        channel: 'smtp',
        recipientMasked,
        message: 'Notification email delivered.',
      };
    } catch (error) {
      return {
        attempted: true,
        delivered: false,
        channel: 'smtp',
        recipientMasked,
        message: error instanceof Error ? error.message : 'Failed to send onboarding email',
      };
    }
  }

  if (env.NODE_ENV === 'production') {
    return {
      attempted: true,
      delivered: false,
      channel: 'none',
      recipientMasked,
      message: 'SMTP is not configured for production.',
    };
  }

  // eslint-disable-next-line no-console
  console.log(
    `[DEV_PROVIDER_ONBOARDING] to=${recipient} status=${normalizedStatus} barangay=${String(barangayName).trim()} city=${String(cityMunicipality).trim()}`
  );
  return {
    attempted: true,
    delivered: false,
    channel: 'dev',
    recipientMasked,
    message: 'SMTP not configured; onboarding notification logged in backend console.',
  };
}

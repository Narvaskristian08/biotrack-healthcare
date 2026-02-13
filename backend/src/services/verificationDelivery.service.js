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


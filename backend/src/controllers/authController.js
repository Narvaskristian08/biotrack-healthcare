import { OAuth2Client } from 'google-auth-library';
import { env } from '../config/env.js';
import { Session } from '../models/Session.js';
import { HealthCenter } from '../models/HealthCenter.js';
import { Patient } from '../models/Patient.js';
import { PatientLoginHistory } from '../models/PatientLoginHistory.js';
import { issueCsrfToken } from '../middleware/csrf.js';
import { revokeToken } from '../services/tokenRevocation.service.js';
import { signPatientToken, verifyJwtToken } from '../services/authService.js';
import { sha256Hex } from '../utils/crypto.js';
import { writeAuditLog } from '../services/auditService.js';

const googleClient = new OAuth2Client();

function getBearerToken(req) {
  const header = req.headers.authorization ?? '';
  const [type, token] = String(header).split(' ');
  if (String(type).toLowerCase() !== 'bearer' || !token) return '';
  return token;
}

export async function getCsrfToken(req, res) {
  const token = issueCsrfToken(req, res);
  return res.json({
    csrfToken: token,
    headerName: env.CSRF_HEADER_NAME,
    enabled: env.CSRF_ENABLED,
  });
}

export async function pingAuthenticatedSession(req, res) {
  return res.json({
    ok: true,
    serverTime: new Date().toISOString(),
  });
}

export async function logoutAnySession(req, res) {
  const token = getBearerToken(req);
  if (!token) return res.status(400).json({ error: { message: 'Missing Bearer token' } });

  let payload = null;
  try {
    // decode only; verification happens in protected route layers.
    payload = JSON.parse(Buffer.from(token.split('.')[1] ?? '', 'base64url').toString('utf8'));
  } catch {
    payload = null;
  }
  if (!payload?.tokenType) return res.status(401).json({ error: { message: 'Invalid or expired token' } });

  const secretByType = {
    admin: env.ADMIN_JWT_SECRET,
    healthcenter: env.HEALTHCENTER_JWT_SECRET,
    session: env.SESSION_JWT_SECRET,
    patient: env.SESSION_JWT_SECRET,
  };
  const secret = secretByType[payload.tokenType];
  if (!secret) return res.status(401).json({ error: { message: 'Invalid or expired token' } });

  try {
    verifyJwtToken(token, secret);
  } catch {
    return res.status(401).json({ error: { message: 'Invalid or expired token' } });
  }

  if (payload?.tokenType === 'session' && payload?.sessionId) {
    await Session.updateOne({ _id: payload.sessionId }, { $set: { revokedAt: new Date() } });
  }

  await revokeToken(token);
  await writeAuditLog({
    req,
    action: 'AUTH.LOGOUT',
    entityType: 'Token',
    outcome: 'success',
    after: { tokenType: payload?.tokenType ?? 'unknown' },
  });
  return res.json({ ok: true });
}

export async function loginWithGoogle(req, res) {
  if (!env.GOOGLE_OAUTH_CLIENT_ID) {
    return res.status(503).json({ error: { message: 'Google OAuth is not configured' } });
  }

  const idToken = String(req.body?.idToken ?? '').trim();
  if (!idToken) {
    return res.status(400).json({ error: { message: 'idToken is required' } });
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: env.GOOGLE_OAUTH_CLIENT_ID,
    });
    const claims = ticket.getPayload();
    const email = String(claims?.email ?? '').trim().toLowerCase();
    const emailVerified = Boolean(claims?.email_verified);
    if (!email || !emailVerified) {
      return res.status(401).json({ error: { message: 'Unable to sign in with Google' } });
    }

    const patients = await Patient.find({ email, status: 'active' }).lean();
    if (!patients.length) {
      return res.status(401).json({ error: { message: 'Unable to sign in with Google' } });
    }

    const activePatient = patients.find((p) => String(p?.accountVerification?.status ?? '').toLowerCase() === 'verified');
    if (!activePatient) {
      return res.status(401).json({ error: { message: 'Unable to sign in with Google' } });
    }

    const healthCenter = await HealthCenter.findById(activePatient.healthCenterId).select('status').lean();
    if (!healthCenter || String(healthCenter.status) !== 'active') {
      return res.status(401).json({ error: { message: 'Unable to sign in with Google' } });
    }

    const token = signPatientToken({
      patientId: activePatient._id,
      healthCenterId: activePatient.healthCenterId,
    });

    await PatientLoginHistory.create({
      healthCenterId: activePatient.healthCenterId,
      patientId: activePatient._id,
      tokenHash: sha256Hex(token),
      ip: String(req?.ip ?? req?.headers?.['x-forwarded-for'] ?? '').trim(),
      userAgent: String(req?.headers?.['user-agent'] ?? '').trim(),
      loginAt: new Date(),
      lastActivityAt: new Date(),
    });

    await writeAuditLog({
      req,
      action: 'PATIENT.LOGIN.OAUTH_GOOGLE',
      entityType: 'Patient',
      entityId: activePatient._id,
      outcome: 'success',
    });

    return res.json({
      accessToken: token,
      patient: {
        id: activePatient._id,
        firstName: activePatient.firstName,
        lastName: activePatient.lastName,
        email: activePatient.email,
        role: 'patient',
      },
    });
  } catch {
    return res.status(401).json({ error: { message: 'Unable to sign in with Google' } });
  }
}

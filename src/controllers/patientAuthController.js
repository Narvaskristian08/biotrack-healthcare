import { Patient } from '../models/Patient.js';
import { HealthCenter } from '../models/HealthCenter.js';
import { hashPassword, verifyPassword } from '../services/authService.js';
import { writeAuditLog } from '../services/auditService.js';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ensureBlockchainIdentityForDocument, verifyBlockchainIdentity } from '../services/blockchain/identity.service.js';

export async function registerPatientPublic(req, res) {
    const {
        healthCenterId,
        mrn, // Optional? If public, maybe auto-assign or user provides? Usually clinic assigns MRN. For self-reg, maybe we generate one or ask user?
        // Let's assume user enters it if they have it, or we rely on email uniquness?
        // Schema says MRN required. Let's ask user.
        lastName,
        firstName,
        middleInitial,
        email,
        password,
        walletAddress,
        address,
        contactNumber,
        nameExtension
    } = req.body ?? {};

    if (!healthCenterId || !email || !password || !lastName || !firstName || !middleInitial || !address || !contactNumber) {
        return res.status(400).json({ error: { message: 'Missing required fields' } });
    }

    // Check HC exists
    const hc = await HealthCenter.findById(healthCenterId);
    if (!hc) return res.status(404).json({ error: { message: 'Health Center not found' } });

    // Check Email
    const existingEmail = await Patient.findOne({ healthCenterId, email: String(email).toLowerCase().trim() });
    if (existingEmail) return res.status(409).json({ error: { message: 'Email already registered in this center' } });

    // MRN: Optional
    const finalMrn = mrn ? String(mrn).trim() : undefined;

    const passwordHash = await hashPassword(String(password));

    const patient = await Patient.create({
        healthCenterId,
        mrn: finalMrn,
        lastName: String(lastName).trim(),
        firstName: String(firstName).trim(),
        middleInitial: String(middleInitial ?? '').slice(0, 1),
        nameExtension: nameExtension ? String(nameExtension).trim() : '',
        email: String(email).toLowerCase().trim(),
        passwordHash,
        address: String(address ?? '').trim(),
        contactNumber: String(contactNumber ?? '').trim(),
        role: 'patient',
        createdByActorType: 'unknown', // Self-registered
    });
    const { identity } = await ensureBlockchainIdentityForDocument({
        doc: patient,
        subjectType: 'patient',
        uniqueSeed: patient.email,
        walletAddress,
        healthCenterId: patient.healthCenterId,
    });

    await writeAuditLog({
        req,
        action: 'PATIENT.REGISTER_SELF',
        entityType: 'Patient',
        entityId: patient._id,
        after: { email: patient.email },
    });

    return res.status(201).json({
        message: 'Registration successful',
        patient: {
            id: patient._id,
            email: patient.email,
            blockchainIdentity: {
                identityId: identity.identityId,
                verificationStatus: identity.verificationStatus,
                txId: identity.txId,
            },
        }
    });
}

export async function loginPatient(req, res) {
    const { email, password } = req.body ?? {};

    if (!email || !password) {
        return res.status(400).json({ error: { message: 'Email and password required' } });
    }

    // Find patient. Email is unique per HC. If user registered in multiple HCs, this might be ambiguous.
    // We'll return the first match or fail if multiple? 
    // Ideally login should ask for HC too, or email should be unique globally. 
    // Let's search all.
    const patients = await Patient.find({ email: String(email).toLowerCase().trim() });

    if (patients.length === 0) {
        return res.status(401).json({ error: { message: 'Invalid credentials' } });
    }

    // Try to find one that matches password
    let match = null;
    for (const p of patients) {
        if (await verifyPassword(String(password), p.passwordHash)) {
            match = p;
            break;
        }
    }

    if (!match) {
        return res.status(401).json({ error: { message: 'Invalid credentials' } });
    }

    const { identity } = await ensureBlockchainIdentityForDocument({
        doc: match,
        subjectType: 'patient',
        uniqueSeed: match.email,
        healthCenterId: match.healthCenterId,
    });
    const identityVerification = await verifyBlockchainIdentity(identity, {
        subjectType: 'patient',
        subjectId: match._id,
        healthCenterId: match.healthCenterId,
    });

    // Generate Session Token (Mocking a "Session" for patient login)
    // Our system expects a Session Token for data access. 
    // Usually Session Token is tied to a Health Center Session.
    // If we login as Patient, we need a way to access OUR OWN records.
    // PatientRoutes require "requireSessionAuth" which checks "Session" collection.
    // This is tricky. The current auth model (Check README) says "shared Session token".
    // To allow patient login, we might need a separate auth middleware for Patients
    // OR we create a "personal session" for the patient.

    // Let's create a token that identifies the patient.
    // We'll reuse the `signSessionToken` but with a specific payload for patient?
    // Or we need a `signPatientToken`.

    // For this simplified integration:
    // We will return a specific Patient Token.
    // We might need to adjust middleware to accept Patient Token.

    // Actually, standard JWT approach:
    // Create a stateless patient token
    const token = jwt.sign(
        {
            tokenType: 'patient',
            patientId: match._id,
            healthCenterId: match.healthCenterId
        },
        env.SESSION_JWT_SECRET,
        { expiresIn: env.SESSION_TOKEN_TTL }
    );

    // Record Audit
    await writeAuditLog({
        req,
        action: 'PATIENT.LOGIN',
        entityType: 'Patient',
        entityId: match._id,
        outcome: 'success',
    });

    return res.json({
        accessToken: token,
        patient: {
            id: match._id,
            firstName: match.firstName,
            lastName: match.lastName,
            email: match.email,
            role: 'patient',
            blockchainIdentity: {
                identityId: identity.identityId,
                verificationStatus: identity.verificationStatus,
                verified: identityVerification.verified,
                onChain: identityVerification.onChain,
            },
        }
    });
}

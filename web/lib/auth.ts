/**
 * Authentication service for all user types
 */

import { apiGet, apiPost } from './api';

// ============== Types ==============

export type AuthRole = 'patient' | 'provider' | 'admin';
export type VerificationMethod = 'email' | 'sms';
export const USER_SESSION_STORAGE_KEY = 'userSession';
export const USER_SESSION_CHANGED_EVENT = 'biotrack:user-session-changed';

export interface HealthCenter {
    _id: string;
    name: string;
    barangayName?: string;
    cityMunicipality?: string;
    healthCenterName?: string;
    officialContactInfo?: string;
    address?: string;
    contactNumber?: string;
}

export interface PatientRegisterData {
    healthCenterId: string;
    lastName: string;
    firstName: string;
    middleInitial: string;
    nameExtension?: string;
    email: string;
    password: string;
    address: string;
    contactNumber: string;
}

export interface PatientVerificationSummary {
    status: 'pending' | 'verified' | string;
    emailMasked?: string;
    contactNumberMasked?: string;
}

export interface PatientRegistrationPayload {
    id: string;
    email: string;
    contactNumber: string;
    verification?: PatientVerificationSummary;
}

export interface HealthCenterRegisterData {
    name: string;
    holderName: string;
    email: string;
    password: string;
    address?: string;
    contactNumber?: string;
}

export interface AdminRegisterData {
    email: string;
    password: string;
}

export interface LoginData {
    email: string;
    password: string;
}

export interface UserSession {
    accessToken: string;
    role: AuthRole;
    email: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    id: string;
    healthCenterId?: string;
    loginTime: string;
}

export interface VerificationCodeSendResult {
    message?: string;
    method: VerificationMethod;
    verificationStatus?: string;
    recipientMasked?: string;
    expiresAt?: string;
    devPreviewCode?: string;
}

const CREDENTIAL_ERROR_MESSAGES = new Set([
    'Invalid credentials',
    'email and password are required',
    'Email and password required',
]);

function isCredentialError(message?: string): boolean {
    if (!message) return true;
    return CREDENTIAL_ERROR_MESSAGES.has(String(message).trim());
}

async function startHealthCenterSession(
    healthCenterAccessToken: string
): Promise<{ sessionToken?: string; error?: string }> {
    try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3000/api';
        const csrf = await apiGet<{ csrfToken: string }>('/auth/csrf-token');
        const csrfToken = csrf.data?.csrfToken ?? '';
        const response = await fetch(`${baseUrl}/sessions/start`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${healthCenterAccessToken}`,
                ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
            },
            credentials: 'include',
            body: JSON.stringify({}),
        });

        const json = await response.json();
        if (!response.ok) {
            return { error: json.error?.message || 'Failed to start health center session' };
        }

        const token = json.sessionToken as string | undefined;
        if (!token) {
            return { error: 'Session token was not returned by the server' };
        }
        return { sessionToken: token };
    } catch (error) {
        return { error: error instanceof Error ? error.message : 'Network error while starting session' };
    }
}

// ============== Session Management ==============

function notifySessionChanged(): void {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event(USER_SESSION_CHANGED_EVENT));
    }
}

export function saveSession(session: UserSession): void {
    if (typeof window !== 'undefined') {
        localStorage.setItem(USER_SESSION_STORAGE_KEY, JSON.stringify(session));
        notifySessionChanged();
    }
}

export function getSession(): UserSession | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = localStorage.getItem(USER_SESSION_STORAGE_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

export function clearSession(): void {
    if (typeof window !== 'undefined') {
        localStorage.removeItem(USER_SESSION_STORAGE_KEY);
        notifySessionChanged();
    }
}

export async function logoutServerSession(): Promise<void> {
    const result = await apiPost<{ ok: boolean }>('/auth/logout', {});
    if (result.error) {
        // Ignore network/logout errors so local sign-out still succeeds.
    }
}

// ============== Health Centers ==============

export async function fetchHealthCenters(): Promise<{ healthCenters: HealthCenter[] } | { error: string }> {
    const result = await apiGet<{ healthCenters: HealthCenter[] }>('/healthcenters');
    if (result.error) {
        return { error: result.error.message };
    }
    return { healthCenters: result.data?.healthCenters || [] };
}

// ============== Patient Auth ==============

export async function registerPatient(
    data: PatientRegisterData
): Promise<{ success: boolean; patient?: PatientRegistrationPayload; error?: string }> {
    const result = await apiPost<{ message: string; verificationRequired?: boolean; patient: PatientRegistrationPayload }>(
        '/patients/register',
        data
    );
    if (result.error) {
        return { success: false, error: result.error.message };
    }
    return { success: true, patient: result.data?.patient };
}

export async function sendPatientVerificationCode(
    patientId: string,
    method: VerificationMethod
): Promise<{ success: boolean; data?: VerificationCodeSendResult; error?: string }> {
    const result = await apiPost<VerificationCodeSendResult>('/patients/verification/send-code', { patientId, method });
    if (result.error) {
        return { success: false, error: result.error.message };
    }
    return { success: true, data: result.data };
}

export async function verifyPatientRegistrationCode(
    patientId: string,
    method: VerificationMethod,
    code: string
): Promise<{ success: boolean; message?: string; error?: string }> {
    const result = await apiPost<{ message: string; verificationStatus: string; patient: { id: string; email: string } }>(
        '/patients/verification/verify-code',
        { patientId, method, code }
    );
    if (result.error) {
        return { success: false, error: result.error.message };
    }
    return { success: true, message: result.data?.message };
}

export async function loginPatient(data: LoginData): Promise<{ session?: UserSession; error?: string }> {
    const result = await apiPost<{
        accessToken: string;
        patient: { id: string; firstName: string; lastName: string; email: string; role: string };
    }>('/patients/login', data);

    if (result.error) {
        return { error: result.error.message };
    }

    const { accessToken, patient } = result.data!;
    const session: UserSession = {
        accessToken,
        role: 'patient',
        email: patient.email,
        firstName: patient.firstName,
        lastName: patient.lastName,
        name: `${patient.firstName} ${patient.lastName}`,
        id: patient.id,
        loginTime: new Date().toISOString(),
    };

    saveSession(session);
    return { session };
}

export async function loginPatientWithGoogleIdToken(idToken: string): Promise<{ session?: UserSession; error?: string }> {
    const result = await apiPost<{
        accessToken: string;
        patient: { id: string; firstName: string; lastName: string; email: string; role: string };
    }>('/auth/oauth/google', { idToken });

    if (result.error) {
        return { error: result.error.message };
    }

    const { accessToken, patient } = result.data!;
    const session: UserSession = {
        accessToken,
        role: 'patient',
        email: patient.email,
        firstName: patient.firstName,
        lastName: patient.lastName,
        name: `${patient.firstName} ${patient.lastName}`,
        id: patient.id,
        loginTime: new Date().toISOString(),
    };

    saveSession(session);
    return { session };
}

export async function loginWithDetectedRole(data: LoginData): Promise<{ session?: UserSession; error?: string }> {
    const attempts = [loginPatient, loginHealthCenter, loginAdmin];
    const nonCredentialErrors: string[] = [];

    for (const loginAttempt of attempts) {
        const result = await loginAttempt(data);
        if (result.session) {
            return { session: result.session };
        }
        if (result.error && !isCredentialError(result.error)) {
            nonCredentialErrors.push(result.error);
        }
    }

    if (nonCredentialErrors.length > 0) {
        return { error: nonCredentialErrors[0] };
    }
    return { error: 'Invalid credentials' };
}

// ============== Health Center Auth ==============

export async function registerHealthCenter(data: HealthCenterRegisterData): Promise<{ success: boolean; session?: UserSession; error?: string }> {
    void data;
    return {
        success: false,
        error: 'Official barangay onboarding is admin-managed. Contact your system administrator.',
    };
}

export async function loginHealthCenter(data: LoginData): Promise<{ session?: UserSession; error?: string }> {
    const result = await apiPost<{
        accessToken: string;
        healthCenter: { id: string; email: string; name: string; holderName: string };
    }>('/healthcenters/login', data);

    if (result.error) {
        return { error: result.error.message };
    }

    const { accessToken, healthCenter } = result.data!;
    const sessionStart = await startHealthCenterSession(accessToken);
    if (sessionStart.error || !sessionStart.sessionToken) {
        return { error: sessionStart.error || 'Failed to start role session' };
    }

    const session: UserSession = {
        accessToken: sessionStart.sessionToken,
        role: 'provider',
        email: healthCenter.email,
        name: healthCenter.name,
        id: healthCenter.id,
        healthCenterId: healthCenter.id,
        loginTime: new Date().toISOString(),
    };

    saveSession(session);
    return { session };
}

// ============== Admin Auth ==============

export async function registerAdmin(data: AdminRegisterData): Promise<{ success: boolean; session?: UserSession; error?: string }> {
    const result = await apiPost<{
        accessToken: string;
        admin: { id: string; email: string };
    }>('/admin/register', data);

    if (result.error) {
        return { success: false, error: result.error.message };
    }

    const { accessToken, admin } = result.data!;
    const session: UserSession = {
        accessToken,
        role: 'admin',
        email: admin.email,
        name: 'Admin',
        id: admin.id,
        loginTime: new Date().toISOString(),
    };

    saveSession(session);
    return { success: true, session };
}

export async function loginAdmin(data: LoginData): Promise<{ session?: UserSession; error?: string }> {
    const result = await apiPost<{
        accessToken: string;
        admin: { id: string; email: string };
    }>('/admin/login', data);

    if (result.error) {
        return { error: result.error.message };
    }

    const { accessToken, admin } = result.data!;
    const session: UserSession = {
        accessToken,
        role: 'admin',
        email: admin.email,
        name: 'Admin',
        id: admin.id,
        loginTime: new Date().toISOString(),
    };

    saveSession(session);
    return { session };
}

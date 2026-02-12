/**
 * Authentication service for all user types
 */

import { apiGet, apiPost } from './api';

// ============== Types ==============

export type AuthRole = 'patient' | 'provider' | 'admin';

export interface HealthCenter {
    _id: string;
    name: string;
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

async function startHealthCenterSession(
    healthCenterAccessToken: string
): Promise<{ sessionToken?: string; error?: string }> {
    try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3000/api';
        const response = await fetch(`${baseUrl}/sessions/start`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${healthCenterAccessToken}`,
            },
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

export function saveSession(session: UserSession): void {
    if (typeof window !== 'undefined') {
        localStorage.setItem('userSession', JSON.stringify(session));
    }
}

export function getSession(): UserSession | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = localStorage.getItem('userSession');
        if (!raw) return null;
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

export function clearSession(): void {
    if (typeof window !== 'undefined') {
        localStorage.removeItem('userSession');
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

export async function registerPatient(data: PatientRegisterData): Promise<{ success: boolean; error?: string }> {
    const result = await apiPost<{ message: string; patient: { id: string; email: string } }>('/patients/register', data);
    if (result.error) {
        return { success: false, error: result.error.message };
    }
    return { success: true };
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

// ============== Health Center Auth ==============

export async function registerHealthCenter(data: HealthCenterRegisterData): Promise<{ success: boolean; session?: UserSession; error?: string }> {
    const result = await apiPost<{
        accessToken: string;
        healthCenter: { id: string; email: string; name: string; holderName: string };
    }>('/healthcenters/register', data);

    if (result.error) {
        return { success: false, error: result.error.message };
    }

    const { accessToken, healthCenter } = result.data!;
    const sessionStart = await startHealthCenterSession(accessToken);
    if (sessionStart.error || !sessionStart.sessionToken) {
        return { success: false, error: sessionStart.error || 'Failed to start role session' };
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
    return { success: true, session };
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

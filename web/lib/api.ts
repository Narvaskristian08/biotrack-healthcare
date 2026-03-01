/**
 * API utilities for making requests to the backend
 */

function resolveApiBaseUrl(): string {
    const configured = String(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api').trim();
    if (typeof window === 'undefined') return configured;

    try {
        const configuredUrl = new URL(configured);
        const pageHost = String(window.location.hostname || '').trim().toLowerCase();
        const apiHost = String(configuredUrl.hostname || '').trim().toLowerCase();
        const localhostLike = new Set(['localhost', '127.0.0.1']);

        // Keep API and web host aligned in local dev so CSRF cookies are same-site.
        // This also supports LAN testing (e.g., 192.168.x.x) when API URL is configured as localhost.
        if (localhostLike.has(apiHost) && pageHost && pageHost !== apiHost) {
            configuredUrl.hostname = pageHost;
            return configuredUrl.toString().replace(/\/+$/, '');
        }

        return configuredUrl.toString().replace(/\/+$/, '');
    } catch {
        return configured;
    }
}

const API_BASE_URL = resolveApiBaseUrl();
const CSRF_ENDPOINT = '/auth/csrf-token';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const SESSION_TIMEOUT_FALLBACK_SECONDS = 10;
const SESSION_TIMEOUT_CODES = new Set(['SESSION_IDLE_TIMEOUT', 'TOKEN_REVOKED', 'SESSION_REVOKED']);
const SESSION_TIMEOUT_MESSAGE_PATTERNS = [
    'session expired due to inactivity',
    'session expired',
    'token revoked',
    'session revoked',
];

export const SESSION_TIMEOUT_EVENT = 'biotrack:session-timeout';

let csrfTokenCache = '';

export interface SessionTimeoutEventDetail {
    message: string;
    code?: string;
    countdownSeconds: number;
}

async function ensureCsrfToken(): Promise<string> {
    if (csrfTokenCache) return csrfTokenCache;
    const response = await fetch(`${API_BASE_URL}${CSRF_ENDPOINT}`, {
        method: 'GET',
        credentials: 'include',
    });
    if (!response.ok) return '';
    const json = await response.json().catch(() => ({}));
    csrfTokenCache = String(json?.csrfToken ?? '');
    return csrfTokenCache;
}

export interface ApiError {
    message: string;
    status?: number;
    code?: string;
    countdownSeconds?: number;
}

export interface ApiResponse<T> {
    data?: T;
    error?: ApiError;
}

function hasStoredAuthSession(): boolean {
    if (typeof window === 'undefined') return false;
    const raw = localStorage.getItem('userSession');
    if (!raw) return false;
    try {
        const parsed = JSON.parse(raw);
        return Boolean(parsed?.accessToken);
    } catch {
        return false;
    }
}

function shouldEmitSessionTimeout(status: number, message: string, code: string): boolean {
    if (status !== 401) return false;
    if (!hasStoredAuthSession()) return false;
    if (SESSION_TIMEOUT_CODES.has(code)) return true;
    const normalizedMessage = message.trim().toLowerCase();
    return SESSION_TIMEOUT_MESSAGE_PATTERNS.some((pattern) => normalizedMessage.includes(pattern));
}

function emitSessionTimeout(detail: SessionTimeoutEventDetail): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent(SESSION_TIMEOUT_EVENT, { detail }));
}

/**
 * Make a fetch request to the API
 */
export async function apiFetch<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<ApiResponse<T>> {
    const url = `${API_BASE_URL}${endpoint}`;

    const headers = new Headers(options.headers);
    const method = String(options.method ?? 'GET').toUpperCase();
    if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }

    // Add authorization header if token exists
    if (typeof window !== 'undefined') {
        const session = localStorage.getItem('userSession');
        if (session) {
            try {
                const parsed = JSON.parse(session);
                if (parsed.accessToken) {
                    headers.set('Authorization', `Bearer ${parsed.accessToken}`);
                }
            } catch {
                // ignore parse errors
            }
        }
    }

    if (!SAFE_METHODS.has(method) && endpoint !== CSRF_ENDPOINT) {
        const csrfToken = await ensureCsrfToken();
        if (csrfToken) {
            headers.set('x-csrf-token', csrfToken);
        }
    }

    const sendRequest = async () => {
        const response = await fetch(url, {
            ...options,
            headers,
            credentials: 'include',
        });
        const json = await response.json().catch(() => ({}));
        return { response, json };
    };

    try {
        let { response, json } = await sendRequest();

        // If CSRF token has gone stale, refresh it once and retry transparently.
        if (
            !response.ok &&
            response.status === 403 &&
            String(json?.error?.code ?? '').trim() === 'CSRF_INVALID' &&
            !SAFE_METHODS.has(method) &&
            endpoint !== CSRF_ENDPOINT
        ) {
            csrfTokenCache = '';
            const refreshedToken = await ensureCsrfToken();
            if (refreshedToken) {
                headers.set('x-csrf-token', refreshedToken);
                ({ response, json } = await sendRequest());
            }
        }

        if (!response.ok) {
            const message = String(json?.error?.message ?? 'An error occurred');
            const code = String(json?.error?.code ?? '').trim();
            const rawCountdown = Number(json?.error?.countdownSeconds);
            const countdownSeconds = Number.isFinite(rawCountdown) && rawCountdown > 0
                ? Math.floor(rawCountdown)
                : SESSION_TIMEOUT_FALLBACK_SECONDS;

            if (shouldEmitSessionTimeout(response.status, message, code)) {
                emitSessionTimeout({
                    message,
                    code: code || undefined,
                    countdownSeconds,
                });
            }

            return {
                error: {
                    message,
                    status: response.status,
                    code: code || undefined,
                    countdownSeconds,
                },
            };
        }

        return { data: json };
    } catch (err) {
        return {
            error: {
                message: err instanceof Error ? err.message : 'Network error',
            },
        };
    }
}

/**
 * GET request helper
 */
export function apiGet<T>(endpoint: string, options: RequestInit = {}) {
    return apiFetch<T>(endpoint, { ...options, method: 'GET' });
}

/**
 * POST request helper
 */
export function apiPost<T>(endpoint: string, body: unknown) {
    return apiFetch<T>(endpoint, {
        method: 'POST',
        body: JSON.stringify(body),
    });
}

/**
 * PATCH request helper
 */
export function apiPatch<T>(endpoint: string, body: unknown) {
    return apiFetch<T>(endpoint, {
        method: 'PATCH',
        body: JSON.stringify(body),
    });
}

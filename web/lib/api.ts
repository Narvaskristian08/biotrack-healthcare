/**
 * API utilities for making requests to the backend
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3000/api';

export interface ApiError {
    message: string;
    status?: number;
}

export interface ApiResponse<T> {
    data?: T;
    error?: ApiError;
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

    try {
        const response = await fetch(url, {
            ...options,
            headers,
        });

        const json = await response.json();

        if (!response.ok) {
            return {
                error: {
                    message: json.error?.message || 'An error occurred',
                    status: response.status,
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
export function apiGet<T>(endpoint: string) {
    return apiFetch<T>(endpoint, { method: 'GET' });
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

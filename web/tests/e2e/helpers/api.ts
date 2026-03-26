import type { APIRequestContext, APIResponse } from '@playwright/test';

const API_BASE_URL = process.env.E2E_API_URL ?? 'http://127.0.0.1:3000/api';

async function parseJson(response: APIResponse) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function assertOk(response: APIResponse, context: string) {
  if (response.ok()) return;
  const payload = await parseJson(response);
  const details = payload ? JSON.stringify(payload) : await response.text();
  throw new Error(`${context} failed with ${response.status()}: ${details}`);
}

export async function createAdmin(request: APIRequestContext, payload: { email: string; password: string }) {
  const response = await request.post(`${API_BASE_URL}/admin/register`, { data: payload });
  await assertOk(response, 'Admin registration');
  const data = await response.json();
  const accessToken = String(data?.accessToken ?? '');
  if (!accessToken) {
    throw new Error('Admin registration did not return an access token.');
  }
  return {
    accessToken,
    adminId: String(data?.admin?.id ?? ''),
  };
}

export async function createProvider(
  request: APIRequestContext,
  payload: {
    adminToken: string;
    email: string;
    password: string;
    barangayName: string;
    cityMunicipality: string;
    healthCenterName: string;
    officialContactInfo: string;
    latitude: number;
    longitude: number;
    status: 'pending' | 'verified' | 'active';
  }
) {
  const response = await request.post(`${API_BASE_URL}/admin/healthcenters`, {
    headers: {
      Authorization: `Bearer ${payload.adminToken}`,
    },
    data: {
      email: payload.email,
      password: payload.password,
      barangayName: payload.barangayName,
      cityMunicipality: payload.cityMunicipality,
      healthCenterName: payload.healthCenterName,
      officialContactInfo: payload.officialContactInfo,
      latitude: payload.latitude,
      longitude: payload.longitude,
      status: payload.status,
    },
  });
  await assertOk(response, 'Provider creation');
  const data = await response.json();
  const id = String(data?.healthCenter?.id ?? '');
  if (!id) {
    throw new Error('Provider creation did not return an id.');
  }
  return { id };
}

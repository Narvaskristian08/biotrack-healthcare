import { test, expect } from '@playwright/test';
import { buildEmail, STRONG_PASSWORD, uniqueId } from './helpers/data';
import { createAdmin, createProvider } from './helpers/api';

test('login shows generic error for inactive provider account', async ({ page, request }) => {
  const uid = uniqueId('security');
  const adminEmail = buildEmail(`admin-${uid}`);
  const providerEmail = buildEmail(`provider-${uid}`);

  const admin = await createAdmin(request, { email: adminEmail, password: STRONG_PASSWORD });

  await createProvider(request, {
    adminToken: admin.accessToken,
    email: providerEmail,
    password: STRONG_PASSWORD,
    barangayName: `Barangay ${uid}`,
    cityMunicipality: `City ${uid}`,
    healthCenterName: `Health Center ${uid}`,
    officialContactInfo: 'Contact Office',
    latitude: 14.5995,
    longitude: 120.9842,
    status: 'pending',
  });

  await page.goto('/login');
  await page.getByLabel(/Email address/i).fill(providerEmail);
  await page.getByLabel(/^Password/i).fill(STRONG_PASSWORD);
  await page.getByRole('button', { name: /Sign in/i }).click();

  await expect(page.getByText(/Invalid email or password/i)).toBeVisible();
});

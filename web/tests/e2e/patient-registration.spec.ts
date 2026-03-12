import { test, expect } from '@playwright/test';
import { buildEmail, STRONG_PASSWORD, uniqueId } from './helpers/data';
import { createAdmin, createProvider } from './helpers/api';

function extractDevCode(text: string | null): string {
  const match = text?.match(/Dev code:\s*(\d{6})/i);
  if (!match) {
    throw new Error('Dev code was not found. Ensure non-production mode and dev preview codes are enabled.');
  }
  return match[1];
}

test('patient registration, verification, and MFA login', async ({ page, request }) => {
  const uid = uniqueId('patient-flow');
  const adminEmail = buildEmail(`admin-${uid}`);
  const providerEmail = buildEmail(`provider-${uid}`);
  const patientEmail = buildEmail(`patient-${uid}`);

  const admin = await createAdmin(request, { email: adminEmail, password: STRONG_PASSWORD });

  const barangayName = `Barangay ${uid}`;
  const cityMunicipality = `City ${uid}`;
  const healthCenterName = `Health Center ${uid}`;

  await createProvider(request, {
    adminToken: admin.accessToken,
    email: providerEmail,
    password: STRONG_PASSWORD,
    barangayName,
    cityMunicipality,
    healthCenterName,
    officialContactInfo: 'Onboarding Contact',
    latitude: 14.5995,
    longitude: 120.9842,
    status: 'active',
  });

  await page.goto('/register');

  await page.getByRole('button', { name: /select your city/i }).click();
  const cityOption = page.getByRole('option', { name: cityMunicipality });
  await expect(cityOption).toBeVisible();
  await cityOption.click();

  await page.getByRole('button', { name: /select your health center/i }).click();
  const healthCenterOption = page.getByRole('option', { name: `${barangayName}, ${cityMunicipality}` });
  await expect(healthCenterOption).toBeVisible();
  await healthCenterOption.click();

  await page.getByLabel(/Last Name/i).fill('Dela Cruz');
  await page.getByLabel(/First Name/i).fill('Juan');
  await page.getByLabel(/Middle Initial/i).fill('A');
  await page.getByRole('button', { name: /Next/i }).click();

  await page.getByLabel(/Email Address/i).fill(patientEmail);
  await page.getByLabel(/Address/i).fill('123 Main Street');
  await page.getByLabel(/Contact Number/i).fill('09123456789');
  await page.getByRole('button', { name: /Next/i }).click();

  await page.getByLabel(/^Password/i).fill(STRONG_PASSWORD);
  await page.getByLabel(/Confirm Password/i).fill(STRONG_PASSWORD);
  await page.getByRole('checkbox', { name: /I accept the terms/i }).click();
  await page.getByRole('button', { name: /Create Account/i }).click();

  await expect(page).toHaveURL(/account-verification/);

  await page.getByRole('button', { name: /Email Verification/i }).click();
  const verificationBanner = page.getByText(/Dev code:\s*\d{6}/i);
  await expect(verificationBanner).toBeVisible();
  const verificationCode = extractDevCode(await verificationBanner.textContent());

  await page.locator('#code').fill(verificationCode, { force: true });
  await page.getByRole('button', { name: /Verify Code/i }).click();
  await expect(page.getByText(/Account Verified Successfully/i)).toBeVisible();
  await page.getByRole('button', { name: /Go to Login/i }).click();

  await page.getByLabel(/Email address/i).fill(patientEmail);
  await page.getByLabel(/^Password/i).fill(STRONG_PASSWORD);
  await page.getByRole('button', { name: /Sign in/i }).click();

  const mfaBanner = page.getByText(/Dev code:\s*\d{6}/i);
  await expect(mfaBanner).toBeVisible();
  const mfaCode = extractDevCode(await mfaBanner.textContent());

  await page.fill('#mfaCode', mfaCode);
  await page.getByRole('button', { name: /Verify code/i }).click();
  await expect(page.getByRole('heading', { name: /My Health Dashboard/i })).toBeVisible();

  const patientRoutes = [
    '/',
    '/health-monitoring',
    '/medical-records',
    '/vitals-history',
    '/ai-health-advisory',
    '/reports-downloads',
    '/profile-settings',
    '/blockchain',
    '/blockchain-verification',
    '/help-support',
    '/settings',
  ];

  for (const route of patientRoutes) {
    await page.goto(route);
    if (route === '/') {
      await expect(page).toHaveURL(/\/$/);
    } else {
      await expect(page).toHaveURL(new RegExp(`${route.replace('/', '\\/')}(\\?|$)`));
    }
  }
});

import { test, expect } from '@playwright/test';
import { buildEmail, STRONG_PASSWORD, uniqueId } from './helpers/data';
import { createAdmin } from './helpers/api';

test('admin creates provider and provider navigates allowed routes', async ({ page, request }) => {
  const uid = uniqueId('admin-provider');
  const adminEmail = buildEmail(`admin-${uid}`);
  const providerEmail = buildEmail(`provider-${uid}`);

  await createAdmin(request, { email: adminEmail, password: STRONG_PASSWORD });

  await page.goto('/login');
  await page.getByLabel(/Email address/i).fill(adminEmail);
  await page.getByLabel(/^Password/i).fill(STRONG_PASSWORD);
  await page.getByRole('button', { name: /Sign in/i }).click();

  await expect(page.getByRole('heading', { name: /Admin Dashboard/i })).toBeVisible();

  const adminRoutes = [
    '/admin-dashboard',
    '/admin/users',
    '/admin/logs',
    '/admin/ai-configuration',
    '/admin/blockchain-management',
    '/admin/system-monitoring',
    '/admin/backup-recovery',
  ];

  for (const route of adminRoutes) {
    await page.goto(route);
    await expect(page).toHaveURL(new RegExp(`${route.replace('/', '\\/')}(\\?|$)`));
  }

  await page.goto('/admin/users');
  await expect(page.getByRole('heading', { name: /User Management/i })).toBeVisible();

  const selects = page.locator('select');
  await selects.nth(0).selectOption('provider');

  await page.getByPlaceholder('Email').fill(providerEmail);
  await page.getByPlaceholder('Password').fill(STRONG_PASSWORD);

  const barangayName = `Barangay ${uid}`;
  const cityMunicipality = `City ${uid}`;
  const healthCenterName = `Health Center ${uid}`;

  await page.getByPlaceholder('Barangay Name').fill(barangayName);
  await page.getByPlaceholder('City / Municipality').fill(cityMunicipality);
  await page.getByPlaceholder('Health Center Name').fill(healthCenterName);
  await page.getByPlaceholder('Official Contact Info').fill('Contact Office');
  await page.getByPlaceholder('Latitude').fill('14.5995');
  await page.getByPlaceholder('Longitude').fill('120.9842');

  await page.getByRole('button', { name: /^Create$/i }).click();
  await expect(page.getByRole('heading', { name: /Healthcare provider account successfully created/i })).toBeVisible();
  await page.getByRole('button', { name: /^Close$/i }).click();

  await page.evaluate(() => localStorage.clear());
  await page.goto('/login');

  await page.getByLabel(/Email address/i).fill(providerEmail);
  await page.getByLabel(/^Password/i).fill(STRONG_PASSWORD);
  await page.getByRole('button', { name: /Sign in/i }).click();

  await expect(page.getByRole('heading', { name: /Healthcare Provider Dashboard/i })).toBeVisible();

  const providerRoutes = [
    '/',
    '/provider-dashboard',
    '/patients',
    '/users',
    '/records',
    '/analytics',
    '/provider-reports',
  ];

  for (const route of providerRoutes) {
    await page.goto(route);
    if (route === '/') {
      await expect(page).toHaveURL(/\/$/);
    } else {
      await expect(page).toHaveURL(new RegExp(`${route.replace('/', '\\/')}(\\?|$)`));
    }
  }

  await page.goto('/admin-dashboard');
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: /Healthcare Provider Dashboard/i })).toBeVisible();

  await page.evaluate(() => localStorage.clear());
  await page.goto('/register');
  await page.getByRole('button', { name: /select your city/i }).click();
  await expect(page.getByRole('option', { name: cityMunicipality })).toBeVisible();
  await page.getByRole('option', { name: cityMunicipality }).click();
  await page.getByRole('button', { name: /select your health center/i }).click();
  await expect(page.getByRole('option', { name: `${barangayName}, ${cityMunicipality}` })).toBeVisible();
});

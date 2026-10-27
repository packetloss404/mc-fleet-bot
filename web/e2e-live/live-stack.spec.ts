import { expect, test } from '@playwright/test';

test('dashboard reaches the live backend through the Next proxy', async ({ page }) => {
  const statusResponse = await page.request.get('/api/status');
  expect(statusResponse.ok()).toBeTruthy();
  const status = await statusResponse.json();
  expect(status).toMatchObject({ status: 'ok' });
  expect(status.botCount).toEqual(expect.any(Number));

  const botsResponsePromise = page.waitForResponse(
    (response) => new URL(response.url()).pathname === '/api/bots',
  );
  await page.goto('/');
  const botsResponse = await botsResponsePromise;
  expect(botsResponse.ok()).toBeTruthy();
  const { bots } = await botsResponse.json();
  expect(Array.isArray(bots)).toBeTruthy();
  expect(bots).toHaveLength(status.botCount);

  await expect(page.getByText('Bots Online').locator('..').getByText(String(bots.length), { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'World Map' })).toBeVisible();

  await page.getByRole('link', { name: 'Activity' }).click();
  await expect(page.getByRole('heading', { name: 'Activity Feed' })).toBeVisible();
});

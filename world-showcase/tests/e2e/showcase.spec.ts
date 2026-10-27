import { expect, test, type Page } from '@playwright/test';

const reportRoutes = [
  '/',
  '/reports/master-plan',
  '/reports/underground-navigation',
  '/reports/masterplan-program',
  '/reports/poi-coordinate-directory',
  '/reports/empty-eight',
  '/reports/bunker-construction-status',
  '/reports/current-decision-maps',
  '/reports/build-contract-maps',
] as const;

async function expectRenderedImages(page: Page, route: string) {
  const failures = await page.locator('img').evaluateAll(async (nodes) => {
    const images = nodes as HTMLImageElement[];
    await Promise.all(images.map(async (image) => {
      image.loading = 'eager';
      image.scrollIntoView({ block: 'center' });
      try {
        await image.decode();
      } catch {
        // Report the useful URL and dimensions below instead of a DOMException.
      }
    }));
    return images
      .filter((image) => !image.complete || image.naturalWidth === 0 || image.naturalHeight === 0)
      .map((image) => image.getAttribute('src'));
  });
  expect(failures, `${route} has broken rendered images`).toEqual([]);
}

test('the public showcase exposes current truth and labels historical reports', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/IANLAN NextGen/u);
  await expect(page.getByRole('heading', { name: /One world\.\s*One master plan\./u })).toBeVisible();
  await expect(page.getByRole('heading', { name: /IANLAN\s*NextGen/u })).toHaveCount(0);

  await page.goto('/reports/master-plan');
  await expect(page.locator('#current-plan-state')).toContainText('Current documented plan state');
  await expect(page.locator('#current-plan-state')).toContainText(/R00 is now 7\s*\/\s*7 PASS/u);
  await expect(page.locator('#current-plan-state')).toContainText(/bounded (?:MP05 )?MVP(?: is)? accepted/iu);
  await expect(page.getByText(/Historical reconciliation · 22 August 2026/u)).toBeVisible();

  await page.goto('/reports/masterplan-program');
  await expect(page.getByText(/Historical archive · 5 August 2026/u)).toBeVisible();
  await expect(page.getByText(/R00 is now 7\s*\/\s*7 PASS; bounded MP05 MVP accepted\./u)).toBeVisible();

  await page.goto('/reports/underground-navigation');
  await expect(page.getByText(/Historical underground atlas · regenerated 27 August 2026/u)).toBeVisible();
});

test('the POI page renders the complete published directory count', async ({ page, request }) => {
  const response = await request.get('/coordinates/poi-coordinate-directory.json');
  expect(response.ok()).toBeTruthy();
  const directory = await response.json() as { counts: { records: number } };

  const pageResponse = await page.goto('/reports/poi-coordinate-directory');
  expect(pageResponse?.ok(), 'POI directory route should return a successful document').toBeTruthy();
  await expect(page.locator('.coordinate-stats')).toContainText(directory.counts.records.toLocaleString('en-US'));
  await expect(page.locator('#directory')).toBeVisible();
});

test('all advertised report pages and their rendered map assets load', async ({ page, request }) => {
  const browserErrors: string[] = [];
  page.on('pageerror', (error) => browserErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push(message.text());
  });

  const mapUrls = new Set<string>();
  for (const route of reportRoutes) {
    const response = await page.goto(route, { waitUntil: 'networkidle' });
    expect(response?.ok(), `${route} should return a successful document`).toBeTruthy();
    await expect(page.locator('main')).toBeVisible();
    await expectRenderedImages(page, route);

    const linkedMaps = await page.locator('img[src], a[href]').evaluateAll((elements) => (
      elements
        .map((element) => element.getAttribute(element.tagName === 'IMG' ? 'src' : 'href'))
        .filter((value): value is string => Boolean(value && /\.(?:png|svg|webp)(?:[?#].*)?$/iu.test(value)))
        .map((value) => new URL(value, document.baseURI).href)
        .filter((value) => new URL(value).origin === document.location.origin)
    ));
    linkedMaps.forEach((url) => mapUrls.add(url));
  }

  expect(mapUrls.size).toBeGreaterThan(100);
  for (const url of mapUrls) {
    const response = await request.get(url);
    expect(response.ok(), `linked map ${url} should load`).toBeTruthy();
    expect(Number(response.headers()['content-length'] ?? 1), `${url} should not be empty`).toBeGreaterThan(0);
    if (new URL(url).pathname.endsWith('.svg')) {
      expect(await response.text(), `${url} must not contain a template placeholder`)
        .not.toMatch(/\$\{[^}]+\}|\{\{[^}]+\}\}/u);
    }
  }
  expect(browserErrors).toEqual([]);
});

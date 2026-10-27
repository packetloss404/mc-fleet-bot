import { expect, test, type Page, type Route } from '@playwright/test';

const bot = {
  name: 'Scout',
  personality: 'explorer',
  mode: 'codegen',
  state: 'IDLE',
  position: { x: 12, y: 64, z: -8 },
};

const activityEvents = [
  {
    type: 'bot:task',
    botName: 'Scout',
    description: 'Mapped the eastern ridge',
    timestamp: 1_725_000_000_000,
  },
  {
    type: 'bot:chat',
    botName: 'Scout',
    description: 'Answered Alex',
    timestamp: 1_725_000_001_000,
  },
];

async function json(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

async function mockApi(page: Page) {
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();

    if (path === '/api/bots' && method === 'GET') return json(route, { bots: [bot] });
    if (path === '/api/bots' && method === 'POST') {
      const input = request.postDataJSON();
      return json(route, { success: true, bot: { ...bot, ...input, state: 'SPAWNING', position: null } }, 201);
    }
    if (path === '/api/world') return json(route, { timeOfDay: 'day', timeOfDayTicks: 6000, day: 42, isRaining: false, onlineBots: 1, onlinePlayers: 1 });
    if (path === '/api/players') return json(route, { players: [{ name: 'Alex', isOnline: true, position: { x: 14, y: 64, z: -7 } }] });
    if (path === '/api/activity') return json(route, { events: activityEvents });
    if (path === '/api/campaigns') return json(route, { campaigns: [] });
    if (path === '/api/relationships') return json(route, { relationships: { Scout: { Alex: 72 } } });
    if (path === '/api/skills') return json(route, { count: 2, skills: [
      { name: 'mine_iron', code: null, description: 'Mine an iron vein', keywords: ['mine'], successCount: 4, failureCount: 1 },
      { name: 'build_shelter', code: null, description: 'Build a safe shelter', keywords: ['build'], successCount: 2, failureCount: 0 },
    ] });
    if (path === '/api/skills/mine_iron') return json(route, { name: 'mine_iron', code: 'async function mineIron(bot) { return true; }' });
    if (path === '/api/skills/build_shelter') return json(route, { name: 'build_shelter', code: 'async function buildShelter(bot) { return true; }' });
    if (path === '/api/skills/stats') return json(route, {
      total: 2,
      totalSuccesses: 6,
      totalFailures: 1,
      averageQuality: 0.88,
      neverUsed: 0,
      topPerformers: [{ name: 'mine_iron', successCount: 4, failureCount: 1 }],
      topFailures: [{ name: 'mine_iron', successCount: 4, failureCount: 1 }],
    });
    if (path === '/api/difficulty') return json(route, {
      tier: 'normal',
      playerCount: 1,
      averagePlayerSkill: 0.65,
      botAutonomy: 0.7,
      eventFrequency: 0.4,
      combatAggressiveness: 0.3,
      helpfulness: 0.9,
    });
    if (path === '/api/bots/Scout/conversations') return json(route, { conversations: { Alex: [
      { role: 'user', text: 'Can you map the ridge?', timestamp: 1_725_000_000_000 },
      { role: 'model', text: 'On my way.', timestamp: 1_725_000_001_000 },
    ] } });
    if (path === '/api/bots/Scout/chat' && method === 'POST') return json(route, { success: true });
    if (path === '/api/bots/Scout/tasks') return json(route, { currentTask: null, completedTasks: ['Map ridge', 'Survey river'], failedTasks: [], queuedTasks: [] });
    if (path === '/api/bots/Scout/relationships') return json(route, { relationships: { Alex: 72 } });
    if (path === '/api/bots/Scout/llm-trace') return json(route, { trace: [] });
    if (path === '/api/bots/Scout/detailed') return json(route, { bot: {
      ...bot,
      personalityDisplayName: 'Explorer',
      health: 20,
      food: 18,
      equipment: { name: 'iron_pickaxe', count: 1 },
      inventory: [{ name: 'torch', count: 16, slot: 0 }],
      world: { biome: 'plains', timeOfDay: 'day', isRaining: false, nearbyBlocks: 'grass', nearbyEntities: 'none' },
      voyager: { isRunning: true, isPaused: false, currentTask: 'Map ridge', completedTasks: ['Survey river'], failedTasks: [] },
    } });
    if (path === '/api/terrain') return json(route, { cx: 0, cz: 0, radius: 64, step: 1, size: 4, blocks: ['grass_block', 'stone', 'water', 'sand'] });
    if (path === '/api/markers') return json(route, { markers: [{ id: 'home', name: 'Home', x: 0, y: 64, z: 0 }] });
    if (path === '/api/zones') return json(route, { zones: [] });
    if (path === '/api/routes') return json(route, { routes: [] });
    if (path === '/api/schematics') return json(route, { schematics: [
      { filename: 'fort.schem', size: { x: 10, y: 5, z: 20 }, blockCount: 1000, estimated: true },
    ] });
    if (path === '/api/builds') return json(route, { builds: [] });
    if (path === '/api/missions') return json(route, { missions: [] });
    if (path === '/api/squads') return json(route, { squads: [] });

    if (method === 'POST' || method === 'PATCH' || method === 'PUT' || method === 'DELETE') {
      return json(route, { success: true });
    }
    return json(route, {});
  });
}

test.beforeEach(async ({ page }) => {
  await mockApi(page);
});

test('dashboard and bot profile expose live fleet state', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Bots Online').locator('..').getByText('1', { exact: true })).toBeVisible();
  await expect(page.getByText('Scout', { exact: true }).first()).toBeVisible();
  await page.getByRole('link', { name: /Scout/ }).click();
  await expect(page).toHaveURL(/\/bots\/Scout$/);
  await expect(page.getByRole('heading', { name: 'Scout' })).toBeVisible();
  await expect(page.getByRole('tabpanel', { name: 'Overview' }).getByText('Map ridge')).toBeVisible();
});

test('bot management creates a bot through the API', async ({ page }) => {
  let submitted: Record<string, unknown> | undefined;
  await page.route('**/api/bots', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    submitted = route.request().postDataJSON();
    await json(route, { success: true, bot: { ...bot, ...submitted } }, 201);
  });
  await page.goto('/manage');
  await page.getByPlaceholder('Bot name...').fill('BuilderOne');
  await page.getByRole('button', { name: 'Builder' }).click();
  await page.getByRole('button', { name: /Create Bot/ }).click();
  await expect(page.getByText('Bot "BuilderOne" created successfully')).toBeVisible();
  expect(submitted).toMatchObject({ name: 'BuilderOne', personality: 'builder', mode: 'codegen' });
});

test('chat opens a conversation and sends a message', async ({ page }) => {
  let sent: Record<string, unknown> | undefined;
  await page.route('**/api/bots/Scout/chat', async (route) => {
    sent = route.request().postDataJSON();
    await json(route, { success: true });
  });
  await page.goto('/chat');
  await page.getByRole('button', { name: /Scout.*Alex/ }).click();
  await expect(page.getByText('On my way.', { exact: true })).toBeVisible();
  await page.getByPlaceholder('As player...').fill('Operator');
  await page.getByPlaceholder('Type a message...').fill('Return to base');
  await page.getByRole('button', { name: 'Send' }).click();
  await expect.poll(() => sent).toMatchObject({ playerName: 'Operator', message: 'Return to base' });
});

test('activity hydrates on a direct visit and filters history', async ({ page }) => {
  await page.goto('/activity');
  await expect(page.getByText('Mapped the eastern ridge')).toBeVisible();
  await page.getByPlaceholder('Search events...').fill('Answered');
  await expect(page.getByText('Answered Alex')).toBeVisible();
  await expect(page.getByText('Mapped the eastern ridge')).toBeHidden();
});

test('social graph switches between cards and matrix', async ({ page }) => {
  await page.goto('/social');
  await expect(page.getByRole('heading', { name: 'Social Graph' })).toBeVisible();
  await expect(page.getByText('Alex', { exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Matrix' }).click();
  await expect(page.getByRole('columnheader', { name: 'Bot / Player' })).toBeVisible();
  await expect(page.getByRole('cell', { name: /Scout/ })).toBeVisible();
});

test('stats loads task, skill, and difficulty metrics', async ({ page }) => {
  await page.goto('/stats');
  await expect(page.getByRole('heading', { name: 'Stats & Leaderboards' })).toBeVisible();
  await expect(page.getByText('2 bots tracked')).toBeHidden();
  await expect(page.getByText('1 bots tracked')).toBeVisible();
  await expect(page.getByText('86%')).toBeVisible();
  await expect(page.getByText('normal', { exact: true }).first()).toBeVisible();
});

test('skill library searches and expands real code', async ({ page }) => {
  await page.goto('/skills');
  await expect(page.getByText('mine iron')).toBeVisible();
  await page.getByPlaceholder('Search skills...').fill('shelter');
  await expect(page.getByText('build shelter')).toBeVisible();
  await expect(page.getByText('mine iron')).toBeHidden();
  await page.getByText('build shelter').click();
  await expect(page.getByText(/async function buildShelter/)).toBeVisible();
});

test('world map renders terrain controls and fleet markers', async ({ page }) => {
  let terrainRequests = 0;
  await page.route('**/api/terrain?**', async (route) => {
    terrainRequests += 1;
    await json(route, { cx: 0, cz: 0, radius: 64, step: 1, size: 4, blocks: ['grass_block', 'stone', 'water', 'sand'] });
  });
  await page.goto('/map');
  await expect(page.getByRole('heading', { name: 'World Map' })).toBeVisible();
  await expect(page.getByTitle('Reload terrain')).toBeVisible();
  await expect(page.getByText('Scout', { exact: true }).first()).toBeVisible();
  await expect.poll(() => terrainRequests).toBeGreaterThan(0);
  const requestsBeforeReload = terrainRequests;
  await page.getByTitle('Reload terrain').click();
  await expect.poll(() => terrainRequests).toBeGreaterThan(requestsBeforeReload);
});

test('build catalog labels bounded block estimates honestly', async ({ page }) => {
  await page.goto('/build');
  await expect(page.getByText('fort', { exact: true })).toBeVisible();
  await expect(page.getByText('~1,000 blocks')).toBeVisible();
});

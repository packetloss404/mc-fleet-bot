const state = {
  overview: null,
};

const $ = (selector) => document.querySelector(selector);
const escapeHtml = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

function formatDate(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function renderOverview(data) {
  state.overview = data;
  const worlds = data.servers.flatMap((server) =>
    server.worlds.map((world) => ({ ...world, serverId: server.id, serverName: server.name })),
  );
  $('#server-count').textContent = String(data.servers.length);
  $('#world-count').textContent = String(worlds.length);
  $('#recipe-count').textContent = String(data.recipes.length);
  $('#registry-name').textContent = data.registry;
  $('#queue-light').classList.toggle('ok', !data.queue.active);
  $('#queue-label').textContent = data.queue.active ? 'Working' : 'Ready';
  $('#queue-copy').textContent = data.queue.active
    ? `${data.queue.queued} report${data.queue.queued === 1 ? '' : 's'} waiting behind the active job.`
    : data.queue.queued > 0
      ? `${data.queue.queued} report${data.queue.queued === 1 ? '' : 's'} queued.`
      : 'The serialized report worker is idle and ready.';

  $('#world-grid').innerHTML = worlds.length
    ? worlds
        .map(
          (world) => `
      <article class="world-card">
        <p class="eyebrow">${escapeHtml(world.serverName)}</p>
        <h3>${escapeHtml(world.name)}</h3>
        <p>${escapeHtml(world.dimension)}</p>
        <div class="card-meta">
          <span>${escapeHtml(world.serverId)} / ${escapeHtml(world.id)}</span>
          <span>${world.databaseKeys.length} database${world.databaseKeys.length === 1 ? '' : 's'}</span>
        </div>
      </article>
    `,
        )
        .join('')
    : '<p>No worlds are registered.</p>';

  $('#recipe-grid').innerHTML = data.recipes.length
    ? data.recipes
        .map(
          (recipe) => `
      <article class="recipe-card">
        <p class="eyebrow">${recipe.steps.length} step${recipe.steps.length === 1 ? '' : 's'}</p>
        <h3>${escapeHtml(recipe.name)}</h3>
        <p>${escapeHtml(recipe.description)}</p>
        <button class="ghost run-recipe" data-recipe="${escapeHtml(recipe.id)}">Run recipe</button>
      </article>
    `,
        )
        .join('')
    : '<p>No recipes were found.</p>';

  $('#job-rows').innerHTML = data.jobs.length
    ? data.jobs
        .map((job) => {
          const progress = renderProgress(job.progress);
          const stepNote = job.currentStep
            ? `<small>${escapeHtml(job.currentStep)}${progress ? ' — ' + progress : ''}</small>`
            : '';
          const lastLog =
            Array.isArray(job.logs) && job.logs.length > 0 ? job.logs[job.logs.length - 1] : null;
          const failureNote =
            (job.status === 'failed' || job.status === 'cancelled') && lastLog
              ? `<small class="failure-note" title="${escapeHtml(job.error ?? '')}">${escapeHtml(lastLog.message)}</small>`
              : '';
          const action =
            job.status === 'queued' || job.status === 'running'
              ? `<button class="ghost cancel-job" data-job="${escapeHtml(job.id)}">Cancel</button>`
              : '';
          return `
      <tr>
        <td><strong>${escapeHtml(job.recipeName)}</strong><small>${escapeHtml(job.id)}</small></td>
        <td>${escapeHtml(job.serverId)} / ${escapeHtml(job.worldId)}</td>
        <td>${escapeHtml(formatDate(job.createdAt))}</td>
        <td><span class="status ${escapeHtml(job.status)}">${escapeHtml(job.status)}</span>${stepNote}${failureNote}</td>
        <td>${job.reportUrl ? `<a class="artifact-link" href="${escapeHtml(job.reportUrl)}" target="_blank" rel="noreferrer">Open report ↗</a>` : job.status === 'failed' && job.error ? `<small title="${escapeHtml(job.error)}">See job error</small>` : action}</td>
      </tr>
    `;
        })
        .join('')
    : '<tr><td colspan="5">No report jobs yet.</td></tr>';

  fillDialog();
}

function renderProgress(progress) {
  if (!progress) return '';
  if (typeof progress.total === 'number' && progress.total > 0) {
    const pct = Math.min(100, Math.round((progress.current / progress.total) * 100));
    return `${progress.label} (${pct}%)`;
  }
  return progress.label;
}

function fillDialog(preselectedRecipe) {
  const data = state.overview;
  if (!data) return;
  const serverSelect = $('#server-select');
  const previousServer = serverSelect.value;
  serverSelect.innerHTML = data.servers
    .map((server) => `<option value="${escapeHtml(server.id)}">${escapeHtml(server.name)}</option>`)
    .join('');
  if (data.servers.some((server) => server.id === previousServer)) {
    serverSelect.value = previousServer;
  }
  fillWorlds();
  const recipeSelect = $('#recipe-select');
  const previousRecipe = preselectedRecipe || recipeSelect.value;
  recipeSelect.innerHTML = data.recipes
    .map((recipe) => `<option value="${escapeHtml(recipe.id)}">${escapeHtml(recipe.name)}</option>`)
    .join('');
  if (data.recipes.some((recipe) => recipe.id === previousRecipe)) {
    recipeSelect.value = previousRecipe;
  }
  toggleParameters();
}

function fillWorlds() {
  const data = state.overview;
  if (!data) return;
  const server = data.servers.find((candidate) => candidate.id === $('#server-select').value);
  $('#world-select').innerHTML = (server?.worlds || [])
    .map((world) => `<option value="${escapeHtml(world.id)}">${escapeHtml(world.name)}</option>`)
    .join('');
}

function toggleParameters() {
  const recipe = state.overview?.recipes.find(
    (candidate) => candidate.id === $('#recipe-select').value,
  );
  renderParameterFields(recipe);
}

function renderParameterFields(recipe) {
  const container = $('#parameter-fields');
  const parameters = recipe?.parameters ?? {};
  const keys = Object.keys(parameters);
  if (keys.length === 0) {
    container.hidden = true;
    container.innerHTML = '';
    return;
  }
  container.hidden = false;
  container.innerHTML = keys
    .map((key) => {
      const definition = parameters[key];
      const label = definition.description || key;
      if (definition.type === 'integer') {
        const minAttr = typeof definition.min === 'number' ? ` min="${definition.min}"` : '';
        const maxAttr = typeof definition.max === 'number' ? ` max="${definition.max}"` : '';
        const requiredAttr = definition.required ? ' required' : '';
        return `<label>${escapeHtml(label)}
          <input type="number" step="1" data-parameter="${escapeHtml(key)}" placeholder="${escapeHtml(key)}"${minAttr}${maxAttr}${requiredAttr}>
          <small>${escapeHtml(definition.required ? 'required' : 'optional')}${typeof definition.min === 'number' || typeof definition.max === 'number' ? ` (${definition.min ?? ''}..${definition.max ?? ''})` : ''}</small>
        </label>`;
      }
      if (definition.type === 'bounds') {
        return `<label>${escapeHtml(label)}
          <input type="text" data-parameter="${escapeHtml(key)}" placeholder="x1,y1,z1,x2,y2,z2">
          <small>inclusive x1,y1,z1,x2,y2,z2 — ${escapeHtml(definition.required ? 'required' : 'optional')}</small>
        </label>`;
      }
      return `<label>${escapeHtml(label)}
        <input type="text" data-parameter="${escapeHtml(key)}" placeholder="${escapeHtml(key)}">
        <small>${escapeHtml(definition.required ? 'required' : 'optional')}</small>
      </label>`;
    })
    .join('');
}

function readParameterValues(recipe) {
  const parameters = {};
  const definitions = recipe?.parameters ?? {};
  for (const [key, definition] of Object.entries(definitions)) {
    const input = document.querySelector(`[data-parameter="${key}"]`);
    if (!input) continue;
    const raw = input.value.trim();
    if (!raw) {
      if (definition.required) {
        throw new Error(`${definition.description || key} is required`);
      }
      continue;
    }
    if (definition.type === 'integer') {
      parameters[key] = Number(raw);
    } else {
      parameters[key] = raw;
    }
  }
  return parameters;
}

async function load() {
  try {
    const response = await fetch('/api/overview');
    if (!response.ok) throw new Error(`Overview failed: ${response.status}`);
    renderOverview(await response.json());
  } catch (error) {
    $('#queue-label').textContent = 'Unavailable';
    $('#queue-copy').textContent = error.message;
  }
}

function openDialog(recipeId) {
  fillDialog(recipeId);
  $('#form-message').textContent = '';
  $('#report-dialog').showModal();
}

async function submitReport(event) {
  event.preventDefault();
  const recipe = state.overview?.recipes.find(
    (candidate) => candidate.id === $('#recipe-select').value,
  );
  let parameters = {};
  try {
    parameters = readParameterValues(recipe);
  } catch (error) {
    $('#form-message').textContent = error instanceof Error ? error.message : 'Invalid parameters.';
    return;
  }
  $('#form-message').textContent = 'Queuing…';
  const response = await fetch('/api/jobs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      serverId: $('#server-select').value,
      worldId: $('#world-select').value,
      recipeId: $('#recipe-select').value,
      parameters,
    }),
  });
  const payload = await response.json();
  if (!response.ok) {
    $('#form-message').textContent = payload.error || 'Could not queue report.';
    return;
  }
  $('#report-dialog').close();
  await load();
  document.querySelector('#jobs').scrollIntoView({ behavior: 'smooth' });
}

$('#new-report').addEventListener('click', () => openDialog());
$('#refresh').addEventListener('click', load);
$('#server-select').addEventListener('change', fillWorlds);
$('#recipe-select').addEventListener('change', toggleParameters);
$('#report-form').addEventListener('submit', submitReport);
$('#close-dialog').addEventListener('click', () => $('#report-dialog').close());
$('#cancel-dialog').addEventListener('click', () => $('#report-dialog').close());
$('#recipe-grid').addEventListener('click', (event) => {
  const button = event.target.closest('.run-recipe');
  if (button) openDialog(button.dataset.recipe);
});

async function cancelJob(jobId) {
  const response = await fetch(`/api/jobs/${encodeURIComponent(jobId)}/cancel`, {
    method: 'POST',
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    console.warn('cancel failed', payload);
  }
  await load();
}

$('#job-rows').addEventListener('click', (event) => {
  const button = event.target.closest('.cancel-job');
  if (button) void cancelJob(button.dataset.job);
});

load();
setInterval(load, 3000);

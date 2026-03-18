const STORAGE_KEY = 'shoe-log-v1.3';
const DRAFT_KEY = 'shoe-log-drafts-v1.3';

const shoeForm = document.getElementById('shoe-form');
const runForm = document.getElementById('run-form');
const runShoeSelect = document.getElementById('run-shoe');
const shoeList = document.getElementById('shoe-list');
const runList = document.getElementById('run-list');
const statusEl = document.getElementById('status');
const exportBtn = document.getElementById('export-btn');
const importBtn = document.getElementById('import-btn');
const importFileInput = document.getElementById('import-file');

const today = new Date().toISOString().slice(0, 10);
runForm.elements.date.value = today;

let state = loadState();
restoreDrafts();
render();

function loadState() {
  try {
    const raw =
      localStorage.getItem(STORAGE_KEY) ||
      localStorage.getItem('shoe-log-v1.2') ||
      localStorage.getItem('shoe-log-v1.1');
    if (!raw) return { schemaVersion: 3, shoes: [], runs: [], inputLog: [] };
    const parsed = JSON.parse(raw);
    return {
      schemaVersion: parsed.schemaVersion || 3,
      shoes: Array.isArray(parsed.shoes) ? parsed.shoes : [],
      runs: Array.isArray(parsed.runs) ? parsed.runs : [],
      inputLog: Array.isArray(parsed.inputLog) ? parsed.inputLog : []
    };
  } catch {
    return { schemaVersion: 3, shoes: [], runs: [], inputLog: [] };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadDrafts() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return { shoe: {}, run: {} };
    const parsed = JSON.parse(raw);
    return {
      shoe: parsed?.shoe || {},
      run: parsed?.run || {}
    };
  } catch {
    return { shoe: {}, run: {} };
  }
}

function saveDrafts() {
  const drafts = {
    shoe: {
      name: shoeForm.elements.name.value,
      model: shoeForm.elements.model.value,
      startMiles: shoeForm.elements.startMiles.value,
      retireAt: shoeForm.elements.retireAt.value
    },
    run: {
      shoeId: runForm.elements.shoeId.value,
      miles: runForm.elements.miles.value,
      date: runForm.elements.date.value || today
    }
  };

  localStorage.setItem(DRAFT_KEY, JSON.stringify(drafts));
}

function restoreDrafts() {
  const drafts = loadDrafts();

  shoeForm.elements.name.value = drafts.shoe.name || '';
  shoeForm.elements.model.value = drafts.shoe.model || '';
  shoeForm.elements.startMiles.value = drafts.shoe.startMiles || '';
  shoeForm.elements.retireAt.value = drafts.shoe.retireAt || '';

  runForm.elements.miles.value = drafts.run.miles || '';
  runForm.elements.date.value = drafts.run.date || today;
}

function resetShoeDraft() {
  shoeForm.reset();
  saveDrafts();
}

function resetRunDraft() {
  runForm.reset();
  runForm.elements.date.value = today;
  saveDrafts();
}

function id() {
  return Math.random().toString(36).slice(2, 10);
}

function logInput(type, payload) {
  state.inputLog.unshift({
    id: id(),
    type,
    payload,
    capturedAt: new Date().toISOString()
  });

  if (state.inputLog.length > 1000) {
    state.inputLog = state.inputLog.slice(0, 1000);
  }
}

function milesForShoe(shoeId) {
  return state.runs
    .filter((r) => r.shoeId === shoeId)
    .reduce((sum, r) => sum + (Number(r.miles) || 0), 0);
}

function totalMiles(shoe) {
  return (Number(shoe.startMiles) || 0) + milesForShoe(shoe.id);
}

function getTag(shoe, total) {
  if (!shoe.retireAt) return { text: 'Active', cls: 'ok' };
  const left = shoe.retireAt - total;
  if (left <= 0) return { text: 'Retire', cls: 'danger' };
  if (left <= 50) return { text: `~${left.toFixed(1)} mi left`, cls: 'warn' };
  return { text: 'Active', cls: 'ok' };
}

shoeForm.addEventListener('input', saveDrafts);
runForm.addEventListener('input', saveDrafts);

shoeForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const form = new FormData(shoeForm);
  const name = String(form.get('name') || '').trim();
  if (!name) return;

  const shoe = {
    id: id(),
    name,
    model: String(form.get('model') || '').trim(),
    startMiles: Number(form.get('startMiles') || 0) || 0,
    retireAt: form.get('retireAt') ? Number(form.get('retireAt')) : null,
    createdAt: new Date().toISOString()
  };

  state.shoes.unshift(shoe);
  logInput('shoe-added', {
    shoeId: shoe.id,
    name: shoe.name,
    model: shoe.model,
    startMiles: shoe.startMiles,
    retireAt: shoe.retireAt
  });

  saveState();
  resetShoeDraft();
  setStatus('Shoe added.');
  render();
});

runForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!state.shoes.length) return setStatus('Add a shoe first.');

  const form = new FormData(runForm);
  const shoeId = String(form.get('shoeId'));
  const miles = Number(form.get('miles'));
  const date = String(form.get('date'));

  if (!shoeId || !miles || miles <= 0 || !date) return setStatus('Enter valid run details.');

  const run = { id: id(), shoeId, miles, date, createdAt: new Date().toISOString() };

  state.runs.unshift(run);
  logInput('run-added', {
    runId: run.id,
    shoeId: run.shoeId,
    miles: run.miles,
    date: run.date
  });
  saveState();
  resetRunDraft();
  setStatus('Run logged.');
  render();
});

exportBtn.addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `shoe-log-backup-${today}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  setStatus('Backup exported.');
});

importBtn.addEventListener('click', () => importFileInput.click());

importFileInput.addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed.shoes) || !Array.isArray(parsed.runs)) {
      throw new Error('Invalid backup format.');
    }

    if (!confirm('Replace current data with this backup?')) return;

    state = {
      schemaVersion: parsed.schemaVersion || 3,
      shoes: parsed.shoes,
      runs: parsed.runs,
      inputLog: Array.isArray(parsed.inputLog) ? parsed.inputLog : []
    };
    saveState();
    setStatus('Backup imported.');
    render();
  } catch (err) {
    setStatus(err.message || 'Import failed.');
  } finally {
    importFileInput.value = '';
  }
});

function setStatus(msg) {
  statusEl.textContent = msg;
  setTimeout(() => {
    if (statusEl.textContent === msg) statusEl.textContent = '';
  }, 3000);
}

function render() {
  renderShoeSelect();
  renderShoes();
  renderRuns();
}

function renderShoeSelect() {
  const selected = runForm.elements.shoeId.value || loadDrafts().run.shoeId || '';
  runShoeSelect.innerHTML = '';

  if (!state.shoes.length) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = 'No shoes yet';
    runShoeSelect.appendChild(opt);
    runShoeSelect.disabled = true;
    return;
  }

  runShoeSelect.disabled = false;
  const first = document.createElement('option');
  first.value = '';
  first.textContent = 'Select shoe';
  runShoeSelect.appendChild(first);

  state.shoes.forEach((shoe) => {
    const opt = document.createElement('option');
    opt.value = shoe.id;
    opt.textContent = shoe.model ? `${shoe.name} — ${shoe.model}` : shoe.name;
    runShoeSelect.appendChild(opt);
  });

  if (selected && state.shoes.some((s) => s.id === selected)) {
    runShoeSelect.value = selected;
  }
}

function renderShoes() {
  if (!state.shoes.length) {
    shoeList.innerHTML = '<p class="empty">No shoes yet. Add your first shoe above.</p>';
    return;
  }

  shoeList.innerHTML = state.shoes.map((shoe) => {
    const total = totalMiles(shoe);
    const tag = getTag(shoe, total);
    const runMiles = milesForShoe(shoe.id);
    return `
      <article class="item">
        <div class="row"><strong>${escapeHtml(shoe.name)}</strong><span class="tag ${tag.cls}">${tag.text}</span></div>
        <div class="meta">${escapeHtml(shoe.model || 'No model')}</div>
        <div class="meta">Total: ${total.toFixed(1)} mi • Logged: ${runMiles.toFixed(1)} mi • Start: ${Number(shoe.startMiles || 0).toFixed(1)} mi</div>
        <div class="actions">
          <button data-action="edit-shoe" data-id="${shoe.id}" class="btn-muted" type="button">Edit</button>
          <button data-action="delete-shoe" data-id="${shoe.id}" class="btn-danger" type="button">Delete</button>
        </div>
      </article>
    `;
  }).join('');
}

function renderRuns() {
  if (!state.runs.length) {
    runList.innerHTML = '<p class="empty">No runs logged yet. Log one above.</p>';
    return;
  }

  runList.innerHTML = state.runs.slice(0, 30).map((run) => {
    const shoe = state.shoes.find((s) => s.id === run.shoeId);
    return `
      <article class="item">
        <div class="row"><strong>${Number(run.miles).toFixed(1)} mi</strong><span>${escapeHtml(run.date)}</span></div>
        <div class="meta">${escapeHtml(shoe?.name || 'Unknown shoe')}</div>
        <div class="actions">
          <button data-action="edit-run" data-id="${run.id}" class="btn-muted" type="button">Edit</button>
          <button data-action="delete-run" data-id="${run.id}" class="btn-danger" type="button">Delete</button>
        </div>
      </article>
    `;
  }).join('');
}

document.addEventListener('click', (e) => {
  const target = e.target.closest('button[data-action]');
  if (!target) return;
  const { action, id: targetId } = target.dataset;

  if (action === 'delete-run') return deleteRun(targetId);
  if (action === 'edit-run') return editRun(targetId);
  if (action === 'delete-shoe') return deleteShoe(targetId);
  if (action === 'edit-shoe') return editShoe(targetId);
});

function deleteRun(runId) {
  if (!confirm('Delete this run?')) return;
  const run = state.runs.find((r) => r.id === runId);
  state.runs = state.runs.filter((r) => r.id !== runId);

  if (run) {
    logInput('run-deleted', {
      runId: run.id,
      shoeId: run.shoeId,
      miles: run.miles,
      date: run.date
    });
  }

  saveState();
  setStatus('Run deleted.');
  render();
}

function editRun(runId) {
  const run = state.runs.find((r) => r.id === runId);
  if (!run) return;

  const miles = Number(prompt('Miles:', String(run.miles)));
  if (!miles || miles <= 0) return setStatus('Invalid miles.');
  const date = prompt('Date (YYYY-MM-DD):', run.date);
  if (!date) return;

  const previous = { miles: run.miles, date: run.date, shoeId: run.shoeId };

  run.miles = miles;
  run.date = date;

  logInput('run-edited', {
    runId: run.id,
    before: previous,
    after: { miles: run.miles, date: run.date, shoeId: run.shoeId }
  });

  saveState();
  setStatus('Run updated.');
  render();
}

function deleteShoe(shoeId) {
  const shoe = state.shoes.find((s) => s.id === shoeId);
  if (!shoe) return;
  if (!confirm(`Delete ${shoe.name}? Runs for this shoe will also be deleted.`)) return;

  const relatedRuns = state.runs.filter((r) => r.shoeId === shoeId);

  state.shoes = state.shoes.filter((s) => s.id !== shoeId);
  state.runs = state.runs.filter((r) => r.shoeId !== shoeId);

  logInput('shoe-deleted', {
    shoeId: shoe.id,
    name: shoe.name,
    model: shoe.model,
    startMiles: shoe.startMiles,
    retireAt: shoe.retireAt,
    removedRunCount: relatedRuns.length
  });

  saveState();
  setStatus('Shoe deleted.');
  render();
}

function editShoe(shoeId) {
  const shoe = state.shoes.find((s) => s.id === shoeId);
  if (!shoe) return;

  const name = prompt('Shoe name:', shoe.name);
  if (!name) return;
  const model = prompt('Brand / Model (optional):', shoe.model || '') ?? '';
  const startRaw = prompt('Starting miles:', String(shoe.startMiles ?? 0));
  if (startRaw === null) return;
  const retireRaw = prompt('Retire at miles (optional):', shoe.retireAt ?? '');

  const previous = {
    name: shoe.name,
    model: shoe.model,
    startMiles: shoe.startMiles,
    retireAt: shoe.retireAt
  };

  shoe.name = name.trim();
  shoe.model = model.trim();
  shoe.startMiles = Number(startRaw || 0) || 0;
  shoe.retireAt = retireRaw ? Number(retireRaw) : null;

  logInput('shoe-edited', {
    shoeId: shoe.id,
    before: previous,
    after: {
      name: shoe.name,
      model: shoe.model,
      startMiles: shoe.startMiles,
      retireAt: shoe.retireAt
    }
  });

  saveState();
  setStatus('Shoe updated.');
  render();
}

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

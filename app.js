const STORAGE_KEY = 'shoe-log-v1.4';
const DRAFT_KEY = 'shoe-log-drafts-v1.4';

const shoeForm = document.getElementById('shoe-form');
const runForm = document.getElementById('run-form');
const runShoeSelect = document.getElementById('run-shoe');
const shoeList = document.getElementById('shoe-list');
const runList = document.getElementById('run-list');
const statusEl = document.getElementById('status');
const exportBtn = document.getElementById('export-btn');
const importBtn = document.getElementById('import-btn');
const importFileInput = document.getElementById('import-file');
const summaryCards = document.getElementById('summary-cards');
const alertsEl = document.getElementById('alerts');
const toastEl = document.getElementById('toast');

const shoeErrorEl = document.getElementById('shoe-error');
const runErrorEl = document.getElementById('run-error');
const shoeSavedEl = document.getElementById('shoe-saved');
const runSavedEl = document.getElementById('run-saved');

const editModal = document.getElementById('edit-modal');
const editForm = document.getElementById('edit-form');
const editTitle = document.getElementById('edit-title');
const editFields = document.getElementById('edit-fields');
const editError = document.getElementById('edit-error');
const editCancel = document.getElementById('edit-cancel');

const today = new Date().toISOString().slice(0, 10);
runForm.elements.date.value = today;

let editContext = null;
let state = loadState();
restoreDrafts();
render();

function loadState() {
  try {
    const raw =
      localStorage.getItem(STORAGE_KEY) ||
      localStorage.getItem('shoe-log-v1.3') ||
      localStorage.getItem('shoe-log-v1.2') ||
      localStorage.getItem('shoe-log-v1.1');

    if (!raw) return { schemaVersion: 4, shoes: [], runs: [], inputLog: [] };

    const parsed = JSON.parse(raw);
    return {
      schemaVersion: parsed.schemaVersion || 4,
      shoes: Array.isArray(parsed.shoes) ? parsed.shoes : [],
      runs: Array.isArray(parsed.runs) ? parsed.runs : [],
      inputLog: Array.isArray(parsed.inputLog) ? parsed.inputLog : []
    };
  } catch {
    return { schemaVersion: 4, shoes: [], runs: [], inputLog: [] };
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
  shoeSavedEl.textContent = 'Draft saved';
  runSavedEl.textContent = 'Draft saved';
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
  state.inputLog.unshift({ id: id(), type, payload, capturedAt: new Date().toISOString() });
  if (state.inputLog.length > 1000) state.inputLog = state.inputLog.slice(0, 1000);
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

function getProgressPercent(shoe, total) {
  if (!shoe.retireAt || shoe.retireAt <= 0) return Math.min((total / 500) * 100, 100);
  return Math.max(0, Math.min((total / shoe.retireAt) * 100, 100));
}

function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add('show');
  setTimeout(() => toastEl.classList.remove('show'), 1800);
}

function setSavedNow(targetEl) {
  targetEl.textContent = `Saved ${new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
}

shoeForm.addEventListener('input', saveDrafts);
runForm.addEventListener('input', saveDrafts);

shoeForm.addEventListener('submit', (e) => {
  e.preventDefault();
  shoeErrorEl.textContent = '';

  const form = new FormData(shoeForm);
  const name = String(form.get('name') || '').trim();
  if (!name) {
    shoeErrorEl.textContent = 'Shoe name is required.';
    return;
  }

  const startMiles = Number(form.get('startMiles') || 0) || 0;
  const retireAt = form.get('retireAt') ? Number(form.get('retireAt')) : null;
  if (retireAt !== null && retireAt <= 0) {
    shoeErrorEl.textContent = 'Retire miles must be greater than 0.';
    return;
  }

  const shoe = {
    id: id(),
    name,
    model: String(form.get('model') || '').trim(),
    startMiles,
    retireAt,
    createdAt: new Date().toISOString()
  };

  state.shoes.unshift(shoe);
  logInput('shoe-added', { ...shoe });

  saveState();
  resetShoeDraft();
  setSavedNow(shoeSavedEl);
  setStatus('Shoe added.');
  showToast('Shoe added');
  render();
});

runForm.addEventListener('submit', (e) => {
  e.preventDefault();
  runErrorEl.textContent = '';

  if (!state.shoes.length) {
    runErrorEl.textContent = 'Add a shoe first.';
    return;
  }

  const form = new FormData(runForm);
  const shoeId = String(form.get('shoeId') || '').trim();
  const miles = Number(form.get('miles'));
  const date = String(form.get('date') || '').trim();

  if (!shoeId || !miles || miles <= 0 || !date) {
    runErrorEl.textContent = 'Enter a shoe, miles, and date.';
    return;
  }

  const run = { id: id(), shoeId, miles, date, createdAt: new Date().toISOString() };
  state.runs.unshift(run);
  logInput('run-added', { ...run });

  saveState();
  resetRunDraft();
  setSavedNow(runSavedEl);
  setStatus('Run logged.');
  showToast('Run saved');
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
  showToast('Backup exported');
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
      schemaVersion: parsed.schemaVersion || 4,
      shoes: parsed.shoes,
      runs: parsed.runs,
      inputLog: Array.isArray(parsed.inputLog) ? parsed.inputLog : []
    };

    saveState();
    setStatus('Backup imported.');
    showToast('Backup imported');
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
  renderSummary();
  renderShoes();
  renderRuns();
}

function renderSummary() {
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(now.getDate() - 7);

  const weeklyRuns = state.runs.filter((r) => new Date(r.date) >= weekAgo);
  const weeklyMiles = weeklyRuns.reduce((sum, r) => sum + (Number(r.miles) || 0), 0);
  const avgRun = weeklyRuns.length ? weeklyMiles / weeklyRuns.length : 0;

  summaryCards.innerHTML = `
    <article class="summary-card">
      <div class="summary-label">This Week</div>
      <div class="summary-value">${weeklyMiles.toFixed(1)} mi</div>
    </article>
    <article class="summary-card">
      <div class="summary-label">Runs</div>
      <div class="summary-value">${weeklyRuns.length}</div>
    </article>
    <article class="summary-card">
      <div class="summary-label">Avg Run</div>
      <div class="summary-value">${avgRun.toFixed(1)} mi</div>
    </article>
  `;

  const alertShoes = state.shoes
    .map((shoe) => {
      const total = totalMiles(shoe);
      const tag = getTag(shoe, total);
      const left = shoe.retireAt ? shoe.retireAt - total : null;
      return { shoe, total, tag, left };
    })
    .filter((entry) => entry.tag.cls !== 'ok')
    .sort((a, b) => (a.left ?? Infinity) - (b.left ?? Infinity))
    .slice(0, 3);

  if (!alertShoes.length) {
    alertsEl.innerHTML = '<p class="meta">No retirement alerts right now.</p>';
    return;
  }

  alertsEl.innerHTML = alertShoes
    .map(({ shoe, total, tag }) => `<div class="alert-item"><strong>${escapeHtml(shoe.name)}</strong>: ${tag.text} (${total.toFixed(1)} mi)</div>`)
    .join('');
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

  shoeList.innerHTML = state.shoes
    .map((shoe) => {
      const total = totalMiles(shoe);
      const runMiles = milesForShoe(shoe.id);
      const tag = getTag(shoe, total);
      const percent = getProgressPercent(shoe, total);

      return `
      <article class="item">
        <div class="row"><strong>${escapeHtml(shoe.name)}</strong><span class="tag ${tag.cls}">${tag.text}</span></div>
        <div class="meta">${escapeHtml(shoe.model || 'No model')}</div>
        <div class="meta">Total: ${total.toFixed(1)} mi • Logged: ${runMiles.toFixed(1)} mi • Start: ${Number(shoe.startMiles || 0).toFixed(1)} mi</div>
        <div class="progress" role="progressbar" aria-label="Mileage progress"><span style="width:${percent.toFixed(1)}%"></span></div>
        <div class="actions">
          <button data-action="edit-shoe" data-id="${shoe.id}" class="btn-muted" type="button">Edit</button>
          <button data-action="delete-shoe" data-id="${shoe.id}" class="btn-danger" type="button">Delete</button>
        </div>
      </article>`;
    })
    .join('');
}

function renderRuns() {
  if (!state.runs.length) {
    runList.innerHTML = '<p class="empty">No runs logged yet. Log one above.</p>';
    return;
  }

  runList.innerHTML = state.runs
    .slice(0, 30)
    .map((run) => {
      const shoe = state.shoes.find((s) => s.id === run.shoeId);
      return `
      <article class="item">
        <div class="row"><strong>${Number(run.miles).toFixed(1)} mi</strong><span>${escapeHtml(run.date)}</span></div>
        <div class="meta">${escapeHtml(shoe?.name || 'Unknown shoe')}</div>
        <div class="actions">
          <button data-action="edit-run" data-id="${run.id}" class="btn-muted" type="button">Edit</button>
          <button data-action="delete-run" data-id="${run.id}" class="btn-danger" type="button">Delete</button>
        </div>
      </article>`;
    })
    .join('');
}

document.addEventListener('click', (e) => {
  const target = e.target.closest('button[data-action]');
  if (!target) return;
  const { action, id: targetId } = target.dataset;

  if (action === 'delete-run') return deleteRun(targetId);
  if (action === 'edit-run') return openEditRun(targetId);
  if (action === 'delete-shoe') return deleteShoe(targetId);
  if (action === 'edit-shoe') return openEditShoe(targetId);
});

function deleteRun(runId) {
  if (!confirm('Delete this run?')) return;
  const run = state.runs.find((r) => r.id === runId);
  state.runs = state.runs.filter((r) => r.id !== runId);
  if (run) logInput('run-deleted', { ...run });
  saveState();
  setStatus('Run deleted.');
  showToast('Run deleted');
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
    ...shoe,
    removedRunCount: relatedRuns.length
  });

  saveState();
  setStatus('Shoe deleted.');
  showToast('Shoe deleted');
  render();
}

function openEditShoe(shoeId) {
  const shoe = state.shoes.find((s) => s.id === shoeId);
  if (!shoe) return;

  editContext = { type: 'shoe', id: shoeId };
  editTitle.textContent = 'Edit Shoe';
  editError.textContent = '';

  editFields.innerHTML = `
    <label><span class="label">Shoe name</span><input name="name" value="${escapeHtmlAttr(shoe.name)}" required /></label>
    <label><span class="label">Brand / Model</span><input name="model" value="${escapeHtmlAttr(shoe.model || '')}" /></label>
    <label><span class="label">Starting miles</span><input name="startMiles" type="number" min="0" step="0.1" value="${Number(shoe.startMiles || 0)}" /></label>
    <label><span class="label">Retire at miles</span><input name="retireAt" type="number" min="1" step="1" value="${shoe.retireAt ?? ''}" /></label>
  `;

  editModal.showModal();
}

function openEditRun(runId) {
  const run = state.runs.find((r) => r.id === runId);
  if (!run) return;

  editContext = { type: 'run', id: runId };
  editTitle.textContent = 'Edit Run';
  editError.textContent = '';

  const options = state.shoes
    .map((shoe) => `<option value="${shoe.id}" ${shoe.id === run.shoeId ? 'selected' : ''}>${escapeHtml(shoe.name)}</option>`)
    .join('');

  editFields.innerHTML = `
    <label><span class="label">Shoe</span><select name="shoeId">${options}</select></label>
    <label><span class="label">Miles</span><input name="miles" type="number" min="0.1" step="0.1" value="${Number(run.miles)}" required /></label>
    <label><span class="label">Date</span><input name="date" type="date" value="${escapeHtmlAttr(run.date)}" required /></label>
  `;

  editModal.showModal();
}

editForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!editContext) return;
  editError.textContent = '';

  const form = new FormData(editForm);

  if (editContext.type === 'shoe') {
    const shoe = state.shoes.find((s) => s.id === editContext.id);
    if (!shoe) return;

    const name = String(form.get('name') || '').trim();
    const startMiles = Number(form.get('startMiles') || 0) || 0;
    const retireAtRaw = String(form.get('retireAt') || '').trim();
    const retireAt = retireAtRaw ? Number(retireAtRaw) : null;

    if (!name) {
      editError.textContent = 'Shoe name is required.';
      return;
    }

    const before = { ...shoe };
    shoe.name = name;
    shoe.model = String(form.get('model') || '').trim();
    shoe.startMiles = startMiles;
    shoe.retireAt = retireAt;

    logInput('shoe-edited', { shoeId: shoe.id, before, after: { ...shoe } });
    saveState();
    setStatus('Shoe updated.');
    showToast('Shoe updated');
    editModal.close();
    render();
    return;
  }

  if (editContext.type === 'run') {
    const run = state.runs.find((r) => r.id === editContext.id);
    if (!run) return;

    const shoeId = String(form.get('shoeId') || '').trim();
    const miles = Number(form.get('miles'));
    const date = String(form.get('date') || '').trim();

    if (!shoeId || !miles || miles <= 0 || !date) {
      editError.textContent = 'Please enter valid run values.';
      return;
    }

    const before = { ...run };
    run.shoeId = shoeId;
    run.miles = miles;
    run.date = date;

    logInput('run-edited', { runId: run.id, before, after: { ...run } });
    saveState();
    setStatus('Run updated.');
    showToast('Run updated');
    editModal.close();
    render();
  }
});

editCancel.addEventListener('click', () => editModal.close());

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function escapeHtmlAttr(text) {
  return escapeHtml(text).replaceAll('`', '&#096;');
}

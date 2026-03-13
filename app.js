const STORAGE_KEY = 'shoe-log-v1';

const shoeForm = document.getElementById('shoe-form');
const runForm = document.getElementById('run-form');
const runShoeSelect = document.getElementById('run-shoe');
const shoeList = document.getElementById('shoe-list');
const runList = document.getElementById('run-list');
const statusEl = document.getElementById('status');

const today = new Date().toISOString().slice(0, 10);
runForm.elements.date.value = today;

let state = loadState();
render();

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { shoes: [], runs: [] };
    const parsed = JSON.parse(raw);
    return {
      shoes: Array.isArray(parsed.shoes) ? parsed.shoes : [],
      runs: Array.isArray(parsed.runs) ? parsed.runs : []
    };
  } catch {
    return { shoes: [], runs: [] };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function id() {
  return Math.random().toString(36).slice(2, 10);
}

function milesForShoe(shoeId) {
  return state.runs
    .filter((r) => r.shoeId === shoeId)
    .reduce((sum, r) => sum + Number(r.miles), 0);
}

function totalMiles(shoe) {
  return Number(shoe.startMiles || 0) + milesForShoe(shoe.id);
}

function getTag(shoe, total) {
  if (!shoe.retireAt) return { text: 'Active', cls: 'ok' };
  const left = shoe.retireAt - total;
  if (left <= 0) return { text: 'Retire', cls: 'danger' };
  if (left <= 50) return { text: `~${left.toFixed(1)} mi left`, cls: 'warn' };
  return { text: 'Active', cls: 'ok' };
}

shoeForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const form = new FormData(shoeForm);
  const name = String(form.get('name') || '').trim();
  if (!name) return;

  state.shoes.unshift({
    id: id(),
    name,
    model: String(form.get('model') || '').trim(),
    startMiles: Number(form.get('startMiles') || 0),
    retireAt: form.get('retireAt') ? Number(form.get('retireAt')) : null,
    createdAt: new Date().toISOString()
  });

  saveState();
  shoeForm.reset();
  setStatus('Shoe added.');
  render();
});

runForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!state.shoes.length) {
    setStatus('Add a shoe first.');
    return;
  }

  const form = new FormData(runForm);
  const shoeId = String(form.get('shoeId'));
  const miles = Number(form.get('miles'));
  const date = String(form.get('date'));

  if (!shoeId || !miles || miles <= 0 || !date) {
    setStatus('Enter valid run details.');
    return;
  }

  state.runs.unshift({ id: id(), shoeId, miles, date, createdAt: new Date().toISOString() });
  saveState();
  runForm.reset();
  runForm.elements.date.value = today;
  setStatus('Run logged.');
  render();
});

function setStatus(msg) {
  statusEl.textContent = msg;
  setTimeout(() => {
    if (statusEl.textContent === msg) statusEl.textContent = '';
  }, 2500);
}

function render() {
  renderShoeSelect();
  renderShoes();
  renderRuns();
}

function renderShoeSelect() {
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
}

function renderShoes() {
  if (!state.shoes.length) {
    shoeList.innerHTML = '<p class="empty">No shoes yet.</p>';
    return;
  }

  shoeList.innerHTML = state.shoes
    .map((shoe) => {
      const total = totalMiles(shoe);
      const tag = getTag(shoe, total);
      const runMiles = milesForShoe(shoe.id);
      return `
        <article class="item">
          <div class="row"><strong>${escapeHtml(shoe.name)}</strong><span class="tag ${tag.cls}">${tag.text}</span></div>
          <div class="meta">${escapeHtml(shoe.model || 'No model')}</div>
          <div class="meta">Total: ${total.toFixed(1)} mi • Logged: ${runMiles.toFixed(1)} mi • Start: ${Number(shoe.startMiles || 0).toFixed(1)} mi</div>
        </article>
      `;
    })
    .join('');
}

function renderRuns() {
  if (!state.runs.length) {
    runList.innerHTML = '<p class="empty">No runs logged yet.</p>';
    return;
  }

  runList.innerHTML = state.runs
    .slice(0, 20)
    .map((run) => {
      const shoe = state.shoes.find((s) => s.id === run.shoeId);
      return `
        <article class="item">
          <div class="row"><strong>${run.miles.toFixed(1)} mi</strong><span>${escapeHtml(run.date)}</span></div>
          <div class="meta">${escapeHtml(shoe?.name || 'Unknown shoe')}</div>
        </article>
      `;
    })
    .join('');
}

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

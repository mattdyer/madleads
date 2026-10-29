const api = {
  async list(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/leads${qs ? `?${qs}` : ''}`);
  },
  stats: () => request('/api/leads/stats'),
  create: (data) => request('/api/leads', { method: 'POST', body: data }),
  update: (id, data) => request(`/api/leads/${id}`, { method: 'PUT', body: data }),
  remove: (id) => request(`/api/leads/${id}`, { method: 'DELETE' }),
  import: (payload) => request('/api/leads/import', { method: 'POST', body: payload }),
};

async function request(url, { method = 'GET', body } = {}) {
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

const els = {
  body: document.getElementById('leads-body'),
  empty: document.getElementById('empty-state'),
  stats: document.getElementById('stats'),
  search: document.getElementById('search'),
  filter: document.getElementById('status-filter'),
  modal: document.getElementById('modal'),
  form: document.getElementById('lead-form'),
  formError: document.getElementById('form-error'),
  modalTitle: document.getElementById('modal-title'),
  toast: document.getElementById('toast'),
};

const money = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]);
}

let toastTimer;
function toast(message, isError = false) {
  els.toast.textContent = message;
  els.toast.classList.toggle('error', isError);
  els.toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { els.toast.hidden = true; }, 3000);
}

async function loadLeads() {
  try {
    const params = {};
    if (els.search.value.trim()) params.search = els.search.value.trim();
    if (els.filter.value) params.status = els.filter.value;
    const leads = await api.list(params);
    renderLeads(leads);
  } catch (err) {
    toast(err.message, true);
  }
}

function renderLeads(leads) {
  els.body.innerHTML = '';
  els.empty.hidden = leads.length > 0;

  for (const lead of leads) {
    const tr = document.createElement('tr');
    const contact = [lead.email, lead.phone].filter(Boolean).join(' · ');
    tr.innerHTML = `
      <td><strong>${escapeHtml(lead.name)}</strong></td>
      <td class="company">${escapeHtml(lead.company) || '—'}</td>
      <td class="contact">${escapeHtml(contact) || '—'}</td>
      <td class="company">${escapeHtml(lead.source) || '—'}</td>
      <td><span class="badge ${escapeHtml(lead.status)}">${escapeHtml(lead.status)}</span></td>
      <td class="num">${money.format(Number(lead.value) || 0)}</td>
      <td>
        <div class="row-actions">
          <button class="btn btn-icon" data-edit="${lead.id}">Edit</button>
          <button class="btn btn-icon btn-danger" data-delete="${lead.id}">Delete</button>
        </div>
      </td>`;
    els.body.appendChild(tr);
  }
}

async function loadStats() {
  try {
    const stats = await api.stats();
    const byStatus = Object.fromEntries(stats.byStatus.map((s) => [s.status, s]));
    const cards = [
      ['Total leads', stats.total],
      ['Pipeline value', money.format(Number(stats.pipeline_value) || 0)],
      ['Won', byStatus.won?.count ?? 0],
      ['Qualified', byStatus.qualified?.count ?? 0],
    ];
    els.stats.innerHTML = cards
      .map(([label, value]) => `<div class="stat"><div class="label">${label}</div><div class="value">${value}</div></div>`)
      .join('');
  } catch (err) {
    console.error(err);
  }
}

function openModal(lead = null) {
  els.form.reset();
  els.formError.hidden = true;
  els.modalTitle.textContent = lead ? 'Edit Lead' : 'New Lead';
  els.form.elements.id.value = lead?.id ?? '';
  if (lead) {
    for (const field of ['name', 'company', 'email', 'phone', 'source', 'status', 'value', 'notes']) {
      els.form.elements[field].value = lead[field] ?? (field === 'value' ? 0 : '');
    }
  }
  els.modal.hidden = false;
  els.form.elements.name.focus();
}

function closeModal() {
  els.modal.hidden = true;
}

els.form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = Object.fromEntries(new FormData(els.form));
  const id = formData.id;
  delete formData.id;
  try {
    if (id) {
      await api.update(id, formData);
      toast('Lead updated');
    } else {
      await api.create(formData);
      toast('Lead created');
    }
    closeModal();
    await Promise.all([loadLeads(), loadStats()]);
  } catch (err) {
    els.formError.textContent = err.message;
    els.formError.hidden = false;
  }
});

els.body.addEventListener('click', async (e) => {
  const editId = e.target.closest('[data-edit]')?.dataset.edit;
  const deleteId = e.target.closest('[data-delete]')?.dataset.delete;
  if (editId) {
    const lead = await request(`/api/leads/${editId}`);
    openModal(lead);
  } else if (deleteId) {
    if (!confirm('Delete this lead?')) return;
    try {
      await api.remove(deleteId);
      toast('Lead deleted');
      await Promise.all([loadLeads(), loadStats()]);
    } catch (err) {
      toast(err.message, true);
    }
  }
});

document.getElementById('new-lead-btn').addEventListener('click', () => openModal());

async function exportLeads() {
  try {
    const res = await fetch('/api/leads/export');
    if (!res.ok) throw new Error(`Export failed (${res.status})`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast('Leads exported');
  } catch (err) {
    toast(err.message, true);
  }
}

const importFile = document.getElementById('import-file');
document.getElementById('export-btn').addEventListener('click', exportLeads);
document.getElementById('import-btn').addEventListener('click', () => importFile.click());

importFile.addEventListener('change', async () => {
  const file = importFile.files[0];
  importFile.value = '';
  if (!file) return;

  let parsed;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    toast('That file is not valid JSON', true);
    return;
  }

  try {
    const result = await api.import(parsed);
    const skipped = result.skipped ? `, skipped ${result.skipped}` : '';
    toast(`Imported ${result.inserted} lead(s)${skipped}`, result.skipped > 0);
    await Promise.all([loadLeads(), loadStats()]);
  } catch (err) {
    toast(err.message, true);
  }
});
els.modal.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) closeModal(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !els.modal.hidden) closeModal(); });

let searchTimer;
els.search.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(loadLeads, 250);
});
els.filter.addEventListener('change', loadLeads);

loadLeads();
loadStats();

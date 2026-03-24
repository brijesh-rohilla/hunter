// public/js/app.js
'use strict';

/* ── Tab navigation ──────────────────────────────────────────────────────── */
document.querySelectorAll('.nav-item').forEach((btn) => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.tab;

    document.querySelectorAll('.nav-item').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));

    btn.classList.add('active');
    document.getElementById(`tab-${target}`).classList.add('active');
  });
});

/* ── Utility helpers ─────────────────────────────────────────────────────── */
function showBanner(id, message, type /* 'success' | 'error' */) {
  const el = document.getElementById(id);
  el.textContent = message;
  el.className = `result-banner ${type}`;
  el.style.display = 'block';
  // Auto-hide after 8 s for success banners
  if (type === 'success') setTimeout(() => (el.style.display = 'none'), 8000);
}

function hideBanner(id) {
  const el = document.getElementById(id);
  el.style.display = 'none';
}

function setLoading(btnId, spinnerId, loading) {
  const btn = document.getElementById(btnId);
  const spinner = document.getElementById(spinnerId);
  const text = btn.querySelector('.btn-text');
  btn.disabled = loading;
  spinner.style.display = loading ? 'block' : 'none';
  if (text) text.style.opacity = loading ? '0.5' : '1';
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/* ── Upload form ─────────────────────────────────────────────────────────── */
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('jsonFile');
const fileInfo = document.getElementById('fileInfo');
let selectedFile = null;

// Drag & drop handlers
dropzone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropzone.classList.add('drag-over');
});

dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));

dropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropzone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) setFile(file);
});

fileInput.addEventListener('change', () => {
  if (fileInput.files[0]) setFile(fileInput.files[0]);
});

function setFile(file) {
  if (!file.name.endsWith('.json') && file.type !== 'application/json') {
    showBanner('uploadResult', 'Only .json files are accepted.', 'error');
    return;
  }
  selectedFile = file;
  fileInfo.textContent = `📄 ${file.name}  (${(file.size / 1024).toFixed(1)} KB)`;
  fileInfo.style.display = 'inline-block';
  hideBanner('uploadResult');
}

// Clear button
document.getElementById('clearUpload').addEventListener('click', () => {
  document.getElementById('uploadForm').reset();
  selectedFile = null;
  fileInfo.style.display = 'none';
  hideBanner('uploadResult');
});

// Upload form submit
document.getElementById('uploadForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  hideBanner('uploadResult');

  const city = document.getElementById('uploadCity').value;
  if (!city) {
    showBanner('uploadResult', 'Please select a city before uploading.', 'error');
    return;
  }

  const jsonText = document.getElementById('jsonText').value.trim();
  if (!jsonText && !selectedFile) {
    showBanner(
      'uploadResult',
      'Please provide JSON data — either paste it or upload a file.',
      'error',
    );
    return;
  }

  if (jsonText && !selectedFile) {
    const data = JSON.parse(jsonText);

    if (!Array.isArray(data)) {
      showBanner(
        'uploadResult',
        'Invalid JSON data. Please ensure it is an array of objects.',
        'error',
      );
      return;
    }
  }

  const formData = new FormData();
  formData.append('city', city);

  if (selectedFile) {
    formData.append('jsonFile', selectedFile);
  } else {
    formData.append('jsonText', jsonText);
  }

  setLoading('uploadBtn', 'uploadSpinner', true);

  try {
    const res = await fetch('/api/companies/upload', {
      method: 'POST',
      body: formData,
    });

    const json = await res.json();

    if (!res.ok || !json.success) {
      showBanner('uploadResult', `Error: ${json.message || 'Upload failed.'}`, 'error');
      return;
    }

    const { inserted, updated, total } = json.data;
    showBanner(
      'uploadResult',
      `✓ ${total} record(s) processed — ${inserted} inserted, ${updated} updated.`,
      'success',
    );

    // Clear form on success
    document.getElementById('uploadForm').reset();
    selectedFile = null;
    fileInfo.style.display = 'none';
  } catch (err) {
    showBanner('uploadResult', `Network error: ${err.message}`, 'error');
  } finally {
    setLoading('uploadBtn', 'uploadSpinner', false);
  }
});

// Patch spinner element IDs after DOM is ready
(function patchUploadBtn() {
  const btn = document.getElementById('uploadBtn');
  const spinner = btn.querySelector('.btn-spinner');
  if (spinner) spinner.id = 'uploadSpinner';
})();

/* ── Query form ─────────────────────────────────────────────────────────── */
let currentCity = null;

document.getElementById('queryForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  hideBanner('queryResult');

  const city = document.getElementById('queryCity').value;
  if (!city) {
    showBanner('queryResult', 'Please select a city to query.', 'error');
    return;
  }

  const queryBtn = document.getElementById('queryBtn');
  const qSpinner = queryBtn.querySelector('.btn-spinner');
  if (qSpinner) qSpinner.id = 'querySpinner';

  setLoading('queryBtn', 'querySpinner', true);
  document.getElementById('exportSection').style.display = 'none';

  try {
    const res = await fetch(`/api/companies?city=${encodeURIComponent(city)}`);
    const json = await res.json();

    if (!res.ok || !json.success) {
      showBanner('queryResult', `Error: ${json.message || 'Query failed.'}`, 'error');
      return;
    }

    currentCity = city;
    document.getElementById('recordCount').textContent = json.count;
    document.getElementById('countCity').textContent = city;
    document.getElementById('exportSection').style.display = 'block';

    if (json.count === 0) {
      showBanner('queryResult', `No records found for "${city}".`, 'error');
    }
  } catch (err) {
    showBanner('queryResult', `Network error: ${err.message}`, 'error');
  } finally {
    setLoading('queryBtn', 'querySpinner', false);
  }
});

// Patch query btn spinner
(function patchQueryBtn() {
  const btn = document.getElementById('queryBtn');
  const spinner = btn.querySelector('.btn-spinner');
  if (spinner) spinner.id = 'querySpinner';
})();

/* ── Export buttons ─────────────────────────────────────────────────────── */
async function downloadExport(format) {
  if (!currentCity) return;

  const mimeMap = {
    pdf: 'application/pdf',
    csv: 'text/csv',
    json: 'application/json',
  };

  try {
    const res = await fetch(
      `/api/companies/export?city=${encodeURIComponent(currentCity)}&format=${format}`,
    );

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      showBanner('queryResult', `Export failed: ${json.message || res.statusText}`, 'error');
      return;
    }

    const blob = await res.blob();
    const disposition = res.headers.get('Content-Disposition') || '';
    const match = disposition.match(/filename="([^"]+)"/);
    const filename = match ? match[1] : `companies_${currentCity}.${format}`;
    triggerDownload(blob, filename);
  } catch (err) {
    showBanner('queryResult', `Network error: ${err.message}`, 'error');
  }
}

document.getElementById('btnPDF').addEventListener('click', () => downloadExport('pdf'));
document.getElementById('btnCSV').addEventListener('click', () => downloadExport('csv'));
document.getElementById('btnJSON').addEventListener('click', () => downloadExport('json'));

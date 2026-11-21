(function () {
  'use strict';

  const state = {
    gateChecked: false,
    selfieFile: null,
    selfieDescriptor: null,
    searching: false,
    results: [],
    aborted: false
  };

  const el = {
    gate: document.getElementById('gate'),
    formGate: document.getElementById('form-gate'),
    galleryCode: document.getElementById('galleryCode'),
    gateError: document.getElementById('gateError'),
    btnGate: document.getElementById('btn-gate'),
    search: document.getElementById('search'),
    consentCheckbox: document.getElementById('consentCheckbox'),
    selfieFieldset: document.getElementById('selfie-fieldset'),
    btnCamera: document.getElementById('btn-camera'),
    btnUpload: document.getElementById('btn-upload'),
    cameraInput: document.getElementById('cameraInput'),
    fileInput: document.getElementById('fileInput'),
    preview: document.getElementById('preview'),
    previewImg: document.getElementById('previewImg'),
    previewInfo: document.getElementById('previewInfo'),
    btnReplace: document.getElementById('btn-replace'),
    btnClear: document.getElementById('btn-clear'),
    selfieError: document.getElementById('selfieError'),
    btnSearch: document.getElementById('btn-search'),
    placeholder: document.getElementById('placeholder'),
    stateSearching: document.getElementById('state-searching'),
    progressBar: document.getElementById('progressBar'),
    progressFill: document.getElementById('progressFill'),
    searchingText: document.getElementById('searchingText'),
    btnCancelSearch: document.getElementById('btn-cancel-search'),
    stateResults: document.getElementById('state-results'),
    resultsCount: document.getElementById('resultsCount'),
    gallery: document.getElementById('gallery'),
    btnDownloadAll: document.getElementById('btn-download-all'),
    downloadStatus: document.getElementById('downloadStatus'),
    stateEmpty: document.getElementById('state-empty'),
    btnRetry: document.getElementById('btn-retry'),
    stateError: document.getElementById('state-error'),
    errorText: document.getElementById('errorText'),
    btnErrorRetry: document.getElementById('btn-error-retry'),
    sessionControls: document.getElementById('sessionControls'),
    btnDeleteSession: document.getElementById('btn-delete-session'),
    toast: document.getElementById('toast')
  };

  let toastTimer = null;
  let isDownloading = false;

  function showToast(message, type) {
    if (!el.toast) return;
    el.toast.textContent = message;
    el.toast.classList.remove('toast-error', 'toast-success');
    if (type === 'error') el.toast.classList.add('toast-error');
    if (type === 'success') el.toast.classList.add('toast-success');
    el.toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.toast.hidden = true; }, 3200);
  }

  function setButtonLoading(button, loading, loadingText) {
    if (!button) return;
    const label = button.querySelector('.btn-label');
    const spinner = button.querySelector('.spinner');
    button.disabled = loading;
    if (spinner) spinner.hidden = !loading;
    if (label && loadingText) label.textContent = loading ? loadingText : label.dataset.idleText || label.textContent;
  }

  function hideAllStates() {
    if (el.placeholder) el.placeholder.hidden = true;
    if (el.stateSearching) el.stateSearching.hidden = true;
    if (el.stateResults) el.stateResults.hidden = true;
    if (el.stateEmpty) el.stateEmpty.hidden = true;
    if (el.stateError) el.stateError.hidden = true;
  }

  function setProgress(percent) {
    const clamped = Math.max(0, Math.min(100, percent));
    if (el.progressFill) el.progressFill.style.width = `${clamped}%`;
    if (el.progressBar) el.progressBar.setAttribute('aria-valuenow', String(Math.round(clamped)));
  }

  function setDownloadStatus(message, type) {
    if (!el.downloadStatus) return;
    el.downloadStatus.classList.remove('is-error', 'is-success');
    if (!message) {
      el.downloadStatus.hidden = true;
      el.downloadStatus.textContent = '';
      return;
    }
    el.downloadStatus.hidden = false;
    el.downloadStatus.textContent = message;
    if (type) el.downloadStatus.classList.add(`is-${type}`);
  }

  function setDownloadLoading(loading) {
    if (!el.btnDownloadAll) return;
    const label = el.btnDownloadAll.querySelector('.btn-label');
    const spinner = el.btnDownloadAll.querySelector('.spinner');
    el.btnDownloadAll.disabled = loading;
    if (spinner) spinner.hidden = !loading;
    if (label) label.textContent = loading ? 'جارٍ التحضير…' : 'تحميل كل الصور';
  }

  function getImageExtension(url) {
    try {
      const path = new URL(url, window.location.origin).pathname;
      const match = path.match(/\.(jpe?g|png|webp|gif)(?:$|\?)/i);
      if (match) return match[1].toLowerCase();
    } catch (_) {}
    return 'jpg';
  }

  function sanitizeFileName(name) {
    return String(name).replace(/[\\/:*?"<>|]+/g, '_');
  }

  async function fetchImageAsBlob(url) {
    const response = await fetch(url, { credentials: 'same-origin' });
    if (!response.ok) throw new Error(`فشل تحميل الصورة (${response.status})`);
    return response.blob();
  }

  async function downloadAllResults(results) {
    if (isDownloading) return;

    if (!Array.isArray(results) || results.length === 0) {
      setDownloadStatus('لا توجد صور لتحميلها.', 'error');
      return;
    }

    if (typeof JSZip === 'undefined') {
      setDownloadStatus('تعذّر تحميل مكتبة الضغط. حاول مرة أخرى.', 'error');
      return;
    }

    isDownloading = true;
    setDownloadLoading(true);
    setDownloadStatus('جارٍ تجهيز الصور…');

    try {
      const zip = new JSZip();
      const folder = zip.folder('evano-baptism');
      let completed = 0;
      let failed = 0;

      for (let i = 0; i < results.length; i += 1) {
        const item = results[i];
        const url = typeof item === 'string' ? item : (item.url || item.src);
        if (!url) { failed += 1; continue; }

        try {
          const blob = await fetchImageAsBlob(url);
          const ext = getImageExtension(url);
          const baseName = (typeof item === 'object' && item.name)
            ? sanitizeFileName(item.name)
            : `photo-${String(i + 1).padStart(3, '0')}`;
          const fileName = `${baseName}.${ext}`;
          folder.file(fileName, blob);
          completed += 1;
          setDownloadStatus(`جارٍ تجهيز الصور… (${completed}/${results.length})`);
        } catch (_) {
          failed += 1;
        }
      }

      if (completed === 0) {
        setDownloadStatus('تعذّر تحميل أي صورة. حاول مرة أخرى.', 'error');
        return;
      }

      setDownloadStatus('جارٍ إنشاء ملف ZIP…');
      const zipBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });

      const now = new Date();
      const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const downloadUrl = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `evano-baptism-${stamp}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 4000);

      if (failed > 0) {
        setDownloadStatus(`تم التحميل: ${completed} صورة، فشل ${failed}.`, 'success');
      } else {
        setDownloadStatus(`تم تحميل ${completed} صورة بنجاح.`, 'success');
      }
    } catch (_) {
      setDownloadStatus('حدث خطأ أثناء التحميل. حاول مرة أخرى.', 'error');
    } finally {
      isDownloading = false;
      setDownloadLoading(false);
    }
  }

  function resetResultsUI() {
    state.results = [];
    window.currentSearchResults = [];
    if (el.gallery) el.gallery.innerHTML = '';
    if (el.resultsCount) el.resultsCount.textContent = '';
    if (el.downloadStatus) setDownloadStatus('');
    if (el.btnDownloadAll) el.btnDownloadAll.disabled = false;
  }

  function showResults(matches) {
    hideAllStates();
    state.results = matches;
    window.currentSearchResults = matches;

    if (el.stateResults) el.stateResults.hidden = false;
    if (el.sessionControls) el.sessionControls.hidden = false;

    if (el.resultsCount) {
      el.resultsCount.textContent = matches.length === 1
        ? 'صورة واحدة مطابقة'
        : `${matches.length} صور مطابقة`;
    }

    if (el.gallery) {
      el.gallery.innerHTML = '';
      matches.forEach((item) => {
        const url = typeof item === 'string' ? item : (item.url || item.src);
        if (!url) return;
        const li = document.createElement('li');
        const img = document.createElement('img');
        img.src = url;
        img.alt = 'صورة مطابقة';
        img.loading = 'lazy';
        li.appendChild(img);
        el.gallery.appendChild(li);
      });
    }

    if (el.btnDownloadAll) el.btnDownloadAll.disabled = false;
    setDownloadStatus('');
  }

  function showEmpty() {
    hideAllStates();
    if (el.stateEmpty) el.stateEmpty.hidden = false;
    if (el.sessionControls) el.sessionControls.hidden = false;
  }

  function showError(message) {
    hideAllStates();
    if (el.stateError) el.stateError.hidden = false;
    if (el.errorText) el.errorText.textContent = message || 'حدث خطأ غير متوقع.';
    if (el.sessionControls) el.sessionControls.hidden = false;
  }

  function showSearching() {
    hideAllStates();
    if (el.stateSearching) el.stateSearching.hidden = false;
    setProgress(0);
    if (el.searchingText) el.searchingText.textContent = 'جارٍ البحث…';
  }

  function setSelfiePreview(file) {
    if (!file) return;
    state.selfieFile = file;

    const url = URL.createObjectURL(file);
    if (el.previewImg) {
      el.previewImg.src = url;
      el.previewImg.onload = () => URL.revokeObjectURL(url);
    }
    if (el.previewInfo) {
      const kb = Math.round(file.size / 1024);
      el.previewInfo.textContent = `${file.name} — ${kb} كيلوبايت`;
    }
    if (el.preview) el.preview.hidden = false;
    if (el.btnSearch) el.btnSearch.disabled = false;
    if (el.selfieError) el.selfieError.hidden = true;
  }

  function clearSelfie() {
    state.selfieFile = null;
    state.selfieDescriptor = null;
    if (el.previewImg) el.previewImg.removeAttribute('src');
    if (el.preview) el.preview.hidden = true;
    if (el.btnSearch) el.btnSearch.disabled = true;
    if (el.fileInput) el.fileInput.value = '';
    if (el.cameraInput) el.cameraInput.value = '';
  }

  function handleFileSelected(file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      if (el.selfieError) {
        el.selfieError.textContent = 'الملف المختار ليس صورة.';
        el.selfieError.hidden = false;
      }
      return;
    }
    setSelfiePreview(file);
  }

  async function runSearch() {
    if (state.searching) return;
    if (!state.selfieFile) {
      if (el.selfieError) {
        el.selfieError.textContent = 'اختر صورة أولاً.';
        el.selfieError.hidden = false;
      }
      return;
    }

    resetResultsUI();
    state.searching = true;
    state.aborted = false;
    showSearching();
    setButtonLoading(el.btnSearch, true, 'جارٍ البحث…');

    try {
      if (!window.FaceEngine || typeof window.FaceEngine.getDescriptorFromFile !== 'function') {
        throw new Error('محرك الوجه غير جاهز.');
      }

      const descriptor = await window.FaceEngine.getDescriptorFromFile(state.selfieFile);
      if (!descriptor) {
        throw new Error('لم يتم اكتشاف وجه واضح في الصورة. جرّب صورة أخرى.');
      }
      state.selfieDescriptor = descriptor;

      setProgress(20);
      if (el.searchingText) el.searchingText.textContent = 'جارٍ البحث في الألبوم…';

      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ descriptor: Array.from(descriptor) })
      });

      if (state.aborted) return;

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        throw new Error(errText || 'تعذّر إكمال البحث.');
      }

      const data = await response.json();
      setProgress(100);
      const matches = Array.isArray(data.matches) ? data.matches : [];
      if (matches.length === 0) {
        showEmpty();
      } else {
        showResults(matches);
      }
    } catch (err) {
      if (state.aborted) return;
      showError(err && err.message ? err.message : 'تعذّر إكمال البحث.');
    } finally {
      state.searching = false;
      setButtonLoading(el.btnSearch, false, 'ابحث عن صوري');
    }
  }

  async function verifyGate(code) {
    if (!code || code.length < 4) {
      if (el.gateError) {
        el.gateError.textContent = 'الرمز قصير جداً.';
        el.gateError.hidden = false;
      }
      return false;
    }

    setButtonLoading(el.btnGate, true, 'جارٍ التحقق…');
    if (el.gateError) el.gateError.hidden = true;

    try {
      const response = await fetch('/api/gallery/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ code })
      });

      if (!response.ok) {
        throw new Error('الرمز غير صحيح.');
      }

      return true;
    } catch (err) {
      if (el.gateError) {
        el.gateError.textContent = err && err.message ? err.message : 'الرمز غير صحيح.';
        el.gateError.hidden = false;
      }
      return false;
    } finally {
      setButtonLoading(el.btnGate, false, 'متابعة');
    }
  }

  async function bootstrap() {
    if (el.gate) el.gate.hidden = true;
    if (el.search) el.search.hidden = true;

    try {
      const response = await fetch('/api/gallery/session', { credentials: 'same-origin' });
      if (response.ok) {
        state.gateChecked = true;
        if (el.search) el.search.hidden = false;
        if (el.sessionControls) el.sessionControls.hidden = false;
      } else {
        if (el.gate) el.gate.hidden = false;
      }
    } catch (_) {
      if (el.gate) el.gate.hidden = false;
    }
  }

  function bindEvents() {
    if (el.formGate) {
      el.formGate.addEventListener('submit', async (event) => {
        event.preventDefault();
        const code = el.galleryCode ? el.galleryCode.value.trim() : '';
        const ok = await verifyGate(code);
        if (ok) {
          state.gateChecked = true;
          if (el.gate) el.gate.hidden = true;
          if (el.search) el.search.hidden = false;
          if (el.sessionControls) el.sessionControls.hidden = false;
        }
      });
    }

    if (el.consentCheckbox) {
      el.consentCheckbox.addEventListener('change', () => {
        if (el.selfieFieldset) el.selfieFieldset.disabled = !el.consentCheckbox.checked;
      });
    }

    if (el.btnCamera) {
      el.btnCamera.addEventListener('click', () => el.cameraInput && el.cameraInput.click());
    }
    if (el.btnUpload) {
      el.btnUpload.addEventListener('click', () => el.fileInput && el.fileInput.click());
    }
    if (el.cameraInput) {
      el.cameraInput.addEventListener('change', (event) => {
        const file = event.target.files && event.target.files[0];
        handleFileSelected(file);
      });
    }
    if (el.fileInput) {
      el.fileInput.addEventListener('change', (event) => {
        const file = event.target.files && event.target.files[0];
        handleFileSelected(file);
      });
    }

    if (el.btnReplace) {
      el.btnReplace.addEventListener('click', () => el.fileInput && el.fileInput.click());
    }
    if (el.btnClear) {
      el.btnClear.addEventListener('click', clearSelfie);
    }

    if (el.btnSearch) {
      el.btnSearch.addEventListener('click', runSearch);
    }

    if (el.btnCancelSearch) {
      el.btnCancelSearch.addEventListener('click', () => {
        state.aborted = true;
        state.searching = false;
        hideAllStates();
        if (el.placeholder) el.placeholder.hidden = false;
        setButtonLoading(el.btnSearch, false, 'ابحث عن صوري');
      });
    }

    if (el.btnRetry || el.btnErrorRetry) {
      [el.btnRetry, el.btnErrorRetry].forEach((btn) => {
        if (!btn) return;
        btn.addEventListener('click', () => {
          hideAllStates();
          if (el.placeholder) el.placeholder.hidden = false;
        });
      });
    }

    if (el.btnDeleteSession) {
      el.btnDeleteSession.addEventListener('click', async () => {
        try {
          await fetch('/api/search/session', { method: 'DELETE', credentials: 'same-origin' });
          showToast('تم حذف بيانات جلسة البحث.', 'success');
          resetResultsUI();
          hideAllStates();
          if (el.placeholder) el.placeholder.hidden = false;
          if (el.sessionControls) el.sessionControls.hidden = true;
        } catch (_) {
          showToast('تعذّر حذف بيانات الجلسة.', 'error');
        }
      });
    }

    if (el.btnDownloadAll) {
      el.btnDownloadAll.addEventListener('click', () => {
        downloadAllResults(state.results);
      });
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    bindEvents();
    bootstrap();
  });

  window.currentSearchResults = [];
})();

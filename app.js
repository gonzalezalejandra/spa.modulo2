/* =============================================================
   SPA Administrador de Prompts — Lógica JavaScript
   Autor: Generado por Antigravity
   Versión: 1.0.0
   ============================================================= */

'use strict';

// ── CONFIGURACIÓN ─────────────────────────────────────────────
const CONFIG_KEY     = 'promptmanager_api_url';
const THEME_KEY      = 'promptmanager_theme';
const TOAST_DURATION = 4000; // ms

// ── ESTADO GLOBAL ─────────────────────────────────────────────
const State = {
  prompts        : [],      // todos los prompts de la API
  filtered       : [],      // prompts después de filtrar
  currentEditId  : null,    // ID del prompt siendo editado
  currentDeleteId: null,    // ID del prompt siendo eliminado
  currentDetailId: null,    // ID del prompt visto en detalle
  apiUrl         : '',      // URL del Apps Script Web App
  sortCol        : '',      // columna de ordenamiento actual
  sortDir        : 'asc',   // 'asc' | 'desc'
  isLoading      : false,
};

// ── DOM REFERENCES ────────────────────────────────────────────
const $ = id => document.getElementById(id);

const DOM = {
  // Header
  themeToggle    : $('themeToggle'),
  statTotal      : $('statTotal'),
  statCategories : $('statCategories'),

  // Config banner
  configBanner   : $('configBanner'),
  appsScriptUrl  : $('appsScriptUrl'),
  saveConfigBtn  : $('saveConfigBtn'),
  configToggleBtn: $('configToggleBtn'),

  // Toolbar
  searchInput    : $('searchInput'),
  categoryFilter : $('categoryFilter'),
  newPromptBtn   : $('newPromptBtn'),

  // Table
  promptsTbody   : $('promptsTbody'),
  resultsCount   : $('resultsCount'),

  // Form Modal
  formModal      : $('formModal'),
  formModalIcon  : $('formModalIcon'),
  formModalTitle : $('formModalTitle'),
  formModalSubtitle: $('formModalSubtitle'),
  formModalClose : $('formModalClose'),
  promptForm     : $('promptForm'),
  fieldCategoria : $('fieldCategoria'),
  fieldNombrePrompt: $('fieldNombrePrompt'),
  fieldPrompt    : $('fieldPrompt'),
  fieldEjemplos  : $('fieldEjemplos'),
  promptCharCount: $('promptCharCount'),
  formCancelBtn  : $('formCancelBtn'),
  formSubmitBtn  : $('formSubmitBtn'),
  formSubmitIcon : $('formSubmitIcon'),
  formSubmitText : $('formSubmitText'),
  categoriasDatalist: $('categoriasDatalist'),

  // Delete Modal
  deleteModal    : $('deleteModal'),
  deleteModalClose: $('deleteModalClose'),
  deleteItemName : $('deleteItemName'),
  deleteItemCat  : $('deleteItemCat'),
  deleteCancelBtn: $('deleteCancelBtn'),
  deleteConfirmBtn: $('deleteConfirmBtn'),

  // Detail Modal
  detailModal    : $('detailModal'),
  detailModalTitle: $('detailModalTitle'),
  detailModalCategory: $('detailModalCategory'),
  detailModalClose: $('detailModalClose'),
  detailPromptText: $('detailPromptText'),
  detailEjemplosText: $('detailEjemplosText'),
  detailEjemplosSection: $('detailEjemplosSection'),
  detailFechaText: $('detailFechaText'),
  detailFechaSection: $('detailFechaSection'),
  detailCloseBtn : $('detailCloseBtn'),
  detailEditBtn  : $('detailEditBtn'),

  // Toast
  toastContainer : $('toastContainer'),
};

// ══════════════════════════════════════════════════════════════
//  THEME MANAGER
// ══════════════════════════════════════════════════════════════
const ThemeManager = {
  init() {
    const saved = localStorage.getItem(THEME_KEY) || 'light';
    this.apply(saved);
    DOM.themeToggle.addEventListener('click', () => this.toggle());
  },

  apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
  },

  toggle() {
    const current = document.documentElement.getAttribute('data-theme');
    this.apply(current === 'dark' ? 'light' : 'dark');
  },
};

// ══════════════════════════════════════════════════════════════
//  API SERVICE
// ══════════════════════════════════════════════════════════════
const ApiService = {
  /**
   * Realiza una solicitud GET al Apps Script Web App.
   */
  async get(params = {}) {
    const url = new URL(State.apiUrl);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

    const res = await fetch(url.toString(), {
      method: 'GET',
      redirect: 'follow',
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  /**
   * Realiza una solicitud POST al Apps Script Web App.
   */
  async post(body) {
    const res = await fetch(State.apiUrl, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  /** Obtiene todos los prompts */
  async getAllPrompts() {
    return this.get({ action: 'getAll' });
  },

  /** Crea un nuevo prompt */
  async createPrompt(data) {
    return this.post({ action: 'create', data });
  },

  /** Actualiza un prompt existente */
  async updatePrompt(id, data) {
    return this.post({ action: 'update', id, data });
  },

  /** Elimina un prompt */
  async deletePrompt(id) {
    return this.post({ action: 'delete', id });
  },
};

// ══════════════════════════════════════════════════════════════
//  CONFIG MANAGER
// ══════════════════════════════════════════════════════════════
const ConfigManager = {
  init() {
    const saved = localStorage.getItem(CONFIG_KEY);
    if (saved) {
      State.apiUrl = saved;
      DOM.appsScriptUrl.value = saved;
      DOM.configBanner.classList.add('hidden');
    } else {
      State.apiUrl = '';
      DOM.appsScriptUrl.value = '';
      DOM.configBanner.classList.remove('hidden');
    }

    DOM.saveConfigBtn.addEventListener('click', () => this.save());
    DOM.appsScriptUrl.addEventListener('keydown', e => {
      if (e.key === 'Enter') this.save();
    });

    if (DOM.configToggleBtn) {
      DOM.configToggleBtn.addEventListener('click', () => {
        DOM.configBanner.classList.toggle('hidden');
        if (!DOM.configBanner.classList.contains('hidden')) {
          DOM.appsScriptUrl.focus();
        }
      });
    }
  },

  save() {
    const url = DOM.appsScriptUrl.value.trim();
    if (!url) {
      Toast.show('error', 'URL requerida', 'Ingresá la URL del Web App de Apps Script.');
      return;
    }
    if (!url.startsWith('https://script.google.com')) {
      Toast.show('error', 'URL inválida', 'La URL debe comenzar con https://script.google.com');
      return;
    }

    State.apiUrl = url;
    localStorage.setItem(CONFIG_KEY, url);
    DOM.configBanner.classList.add('hidden');
    Toast.show('success', 'Configuración guardada', 'Conectando con Google Sheets...');
    DataController.loadAll();
  },

  reset() {
    localStorage.removeItem(CONFIG_KEY);
    State.apiUrl = '';
    DOM.appsScriptUrl.value = '';
    DOM.configBanner.classList.remove('hidden');
  },
};

// ══════════════════════════════════════════════════════════════
//  TOAST NOTIFICATIONS
// ══════════════════════════════════════════════════════════════
const Toast = {
  show(type, title, message = '') {
    const icons = { success: '✅', error: '❌', info: 'ℹ️' };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <div class="toast-icon">${icons[type] || 'ℹ️'}</div>
      <div class="toast-content">
        <div class="toast-title">${this._esc(title)}</div>
        ${message ? `<div class="toast-message">${this._esc(message)}</div>` : ''}
      </div>
    `;

    DOM.toastContainer.appendChild(toast);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => toast.classList.add('show'));
    });

    setTimeout(() => {
      toast.classList.remove('show');
      toast.addEventListener('transitionend', () => toast.remove(), { once: true });
    }, TOAST_DURATION);
  },

  _esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  },
};

// ══════════════════════════════════════════════════════════════
//  TABLE RENDERER
// ══════════════════════════════════════════════════════════════
const TableRenderer = {
  render(prompts) {
    const tbody = DOM.promptsTbody;
    tbody.innerHTML = '';

    // Actualizar contador
    DOM.resultsCount.textContent = `${prompts.length} resultado${prompts.length !== 1 ? 's' : ''}`;

    if (prompts.length === 0) {
      tbody.innerHTML = `
        <tr><td colspan="6">
          <div class="empty-state">
            <span class="empty-icon">🔍</span>
            <div class="empty-title">No se encontraron prompts</div>
            <div class="empty-description">
              Probá cambiando los filtros o creá tu primer prompt con el botón "Nuevo Prompt".
            </div>
            <button class="btn btn-primary" onclick="ModalController.openCreate()">✨ Nuevo Prompt</button>
          </div>
        </td></tr>
      `;
      return;
    }

    const fragment = document.createDocumentFragment();

    prompts.forEach(p => {
      const tr = document.createElement('tr');
      tr.setAttribute('data-id', p.id);

      tr.innerHTML = `
        <td class="td-category">
          <span class="category-badge">${this._esc(p.categoria || '—')}</span>
        </td>
        <td class="td-name">${this._esc(p.nombrePrompt || '—')}</td>
        <td class="td-prompt">
          <div class="cell-text">${this._esc(p.prompt || '—')}</div>
          ${(p.prompt || '').length > 80
            ? `<button class="expand-btn" data-id="${this._esc(p.id)}" data-action="detail">Ver completo</button>`
            : ''}
        </td>
        <td class="td-examples">
          <div class="cell-text">${this._esc(p.ejemplos || '—')}</div>
          ${(p.ejemplos || '').length > 60
            ? `<button class="expand-btn" data-id="${this._esc(p.id)}" data-action="detail">Ver completo</button>`
            : ''}
        </td>
        <td class="td-fecha">${this._esc((p.fecha || '').split(' ')[0] || '—')}</td>
        <td class="td-actions">
          <div class="actions-group">
            <button
              class="btn btn-icon edit"
              data-id="${this._esc(p.id)}"
              data-action="edit"
              title="Editar prompt"
              aria-label="Editar ${this._esc(p.nombrePrompt)}"
            >✏️</button>
            <button
              class="btn btn-icon delete"
              data-id="${this._esc(p.id)}"
              data-action="delete"
              title="Eliminar prompt"
              aria-label="Eliminar ${this._esc(p.nombrePrompt)}"
            >🗑️</button>
          </div>
        </td>
      `;

      fragment.appendChild(tr);
    });

    tbody.appendChild(fragment);
  },

  showLoading() {
    DOM.promptsTbody.innerHTML = `
      <tr><td colspan="6">
        <div class="loading-state">
          <div class="spinner"></div>
          <div class="loading-text">Cargando prompts...</div>
        </div>
      </td></tr>
    `;
    DOM.resultsCount.textContent = '—';
  },

  _esc(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  },
};

// ══════════════════════════════════════════════════════════════
//  FILTER & SORT
// ══════════════════════════════════════════════════════════════
const FilterController = {
  apply() {
    const search   = DOM.searchInput.value.trim().toLowerCase();
    const category = DOM.categoryFilter.value;

    let result = State.prompts.filter(p => {
      const matchCat = !category || p.categoria === category;
      const matchSearch = !search || [
        p.categoria, p.nombrePrompt, p.prompt, p.ejemplos
      ].some(v => (v || '').toLowerCase().includes(search));
      return matchCat && matchSearch;
    });

    // Ordenamiento
    if (State.sortCol) {
      result = [...result].sort((a, b) => {
        if (State.sortCol === 'fecha') {
          const parseDate = str => {
            if (!str) return 0;
            const [dmy, hm] = str.split(' ');
            if (!dmy) return 0;
            const [d, m, y] = dmy.split('/').map(Number);
            const [h, min] = hm ? hm.split(':').map(Number) : [0, 0];
            return new Date(y, m - 1, d, h, min).getTime();
          };
          const va = parseDate(a.fecha);
          const vb = parseDate(b.fecha);
          return State.sortDir === 'asc' ? va - vb : vb - va;
        }
        const va = (a[State.sortCol] || '').toLowerCase();
        const vb = (b[State.sortCol] || '').toLowerCase();
        return State.sortDir === 'asc'
          ? va.localeCompare(vb)
          : vb.localeCompare(va);
      });
    }

    State.filtered = result;
    TableRenderer.render(result);
  },

  updateCategories() {
    const cats = [...new Set(State.prompts.map(p => p.categoria).filter(Boolean))].sort();
    const current = DOM.categoryFilter.value;

    DOM.categoryFilter.innerHTML = '<option value="">📂 Todas las categorías</option>';
    cats.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      DOM.categoryFilter.appendChild(opt);
    });

    // Restaurar selección si sigue existiendo
    if (cats.includes(current)) DOM.categoryFilter.value = current;

    // Actualizar datalist del formulario
    DOM.categoriasDatalist.innerHTML = '';
    cats.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat;
      DOM.categoriasDatalist.appendChild(opt);
    });

    // Stats del header
    DOM.statCategories.textContent = cats.length;
  },

  updateStats() {
    DOM.statTotal.textContent = State.prompts.length;
  },
};

// ══════════════════════════════════════════════════════════════
//  DATA CONTROLLER
// ══════════════════════════════════════════════════════════════
const DataController = {
  async loadAll() {
    if (!State.apiUrl) return;

    TableRenderer.showLoading();

    try {
      const res = await ApiService.getAllPrompts();
      if (!res.success) throw new Error(res.error || 'Error al obtener datos');

      State.prompts = res.data || [];
      FilterController.updateCategories();
      FilterController.updateStats();
      FilterController.apply();

    } catch (err) {
      console.error('[DataController.loadAll]', err);
      Toast.show('error', 'Error de conexión', err.message);
      DOM.configBanner.classList.remove('hidden');
      DOM.promptsTbody.innerHTML = `
        <tr><td colspan="6">
          <div class="empty-state">
            <span class="empty-icon">⚠️</span>
            <div class="empty-title">Error al cargar los prompts</div>
            <div class="empty-description">${err.message}. Verificá la URL del Apps Script y volvé a intentarlo.</div>
            <button class="btn btn-secondary" onclick="DataController.loadAll()">🔄 Reintentar</button>
          </div>
        </td></tr>
      `;
    }
  },

  async create(data) {
    const res = await ApiService.createPrompt(data);
    if (!res.success) throw new Error(res.error || 'Error al crear');
    Toast.show('success', 'Prompt creado', `"${data.nombrePrompt}" agregado correctamente.`);
    await this.loadAll();
    return res;
  },

  async update(id, data) {
    const res = await ApiService.updatePrompt(id, data);
    if (!res.success) throw new Error(res.error || 'Error al actualizar');
    Toast.show('success', 'Prompt actualizado', `"${data.nombrePrompt}" actualizado correctamente.`);
    await this.loadAll();
    return res;
  },

  async delete(id) {
    const res = await ApiService.deletePrompt(id);
    if (!res.success) throw new Error(res.error || 'Error al eliminar');
    Toast.show('success', 'Prompt eliminado', 'El prompt fue borrado permanentemente.');
    await this.loadAll();
    return res;
  },
};

// ══════════════════════════════════════════════════════════════
//  MODAL CONTROLLER
// ══════════════════════════════════════════════════════════════
const ModalController = {
  // ── FORM MODAL ──────────────────────────────────────────────
  openCreate() {
    State.currentEditId = null;

    DOM.formModalIcon.className      = 'modal-icon create';
    DOM.formModalIcon.textContent    = '✨';
    DOM.formModalTitle.textContent   = 'Nuevo Prompt';
    DOM.formModalSubtitle.textContent = 'Completá los campos para agregar un prompt';
    DOM.formSubmitIcon.textContent   = '✨';
    DOM.formSubmitText.textContent   = 'Crear Prompt';
    DOM.promptForm.reset();
    DOM.promptCharCount.textContent  = '0';

    this.openModal(DOM.formModal);
    setTimeout(() => DOM.fieldCategoria.focus(), 100);
  },

  openEdit(id) {
    const prompt = State.prompts.find(p => p.id === id);
    if (!prompt) return;

    State.currentEditId = id;

    DOM.formModalIcon.className      = 'modal-icon edit';
    DOM.formModalIcon.textContent    = '✏️';
    DOM.formModalTitle.textContent   = 'Editar Prompt';
    DOM.formModalSubtitle.textContent = `Modificando: ${prompt.nombrePrompt}`;
    DOM.formSubmitIcon.textContent   = '💾';
    DOM.formSubmitText.textContent   = 'Guardar Cambios';

    DOM.fieldCategoria.value    = prompt.categoria    || '';
    DOM.fieldNombrePrompt.value = prompt.nombrePrompt || '';
    DOM.fieldPrompt.value       = prompt.prompt       || '';
    DOM.fieldEjemplos.value     = prompt.ejemplos     || '';
    DOM.promptCharCount.textContent = (prompt.prompt || '').length;

    this.openModal(DOM.formModal);
    setTimeout(() => DOM.fieldCategoria.focus(), 100);
  },

  closeForm() {
    this.closeModal(DOM.formModal);
    State.currentEditId = null;
  },

  // ── DELETE MODAL ─────────────────────────────────────────────
  openDelete(id) {
    const prompt = State.prompts.find(p => p.id === id);
    if (!prompt) return;

    State.currentDeleteId = id;
    DOM.deleteItemName.textContent = prompt.nombrePrompt || 'Sin nombre';
    DOM.deleteItemCat.textContent  = `Categoría: ${prompt.categoria || '—'}`;

    this.openModal(DOM.deleteModal);
    setTimeout(() => DOM.deleteConfirmBtn.focus(), 100);
  },

  closeDelete() {
    this.closeModal(DOM.deleteModal);
    State.currentDeleteId = null;
  },

  // ── DETAIL MODAL ─────────────────────────────────────────────
  openDetail(id) {
    const prompt = State.prompts.find(p => p.id === id);
    if (!prompt) return;

    State.currentDetailId = id;
    DOM.detailModalTitle.textContent    = prompt.nombrePrompt || '—';
    DOM.detailModalCategory.textContent = `Categoría: ${prompt.categoria || '—'}`;
    DOM.detailPromptText.textContent    = prompt.prompt    || '—';
    DOM.detailEjemplosText.textContent  = prompt.ejemplos  || '—';
    DOM.detailFechaText.textContent     = (prompt.fecha || '').split(' ')[0] || '—';

    DOM.detailEjemplosSection.style.display =
      (prompt.ejemplos || '').trim() ? '' : 'none';
    DOM.detailFechaSection.style.display =
      (prompt.fecha || '').trim() ? '' : 'none';

    this.openModal(DOM.detailModal);
  },

  closeDetail() {
    this.closeModal(DOM.detailModal);
    State.currentDetailId = null;
  },

  // ── HELPERS ──────────────────────────────────────────────────
  openModal(overlay) {
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  },

  closeModal(overlay) {
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  },

  closeAll() {
    [DOM.formModal, DOM.deleteModal, DOM.detailModal].forEach(m => {
      m.classList.remove('active');
    });
    document.body.style.overflow = '';
  },
};

// ══════════════════════════════════════════════════════════════
//  SORT CONTROLLER
// ══════════════════════════════════════════════════════════════
const SortController = {
  init() {
    document.querySelectorAll('thead th[data-col]').forEach(th => {
      th.addEventListener('click', () => {
        const col = th.dataset.col;

        if (State.sortCol === col) {
          State.sortDir = State.sortDir === 'asc' ? 'desc' : 'asc';
        } else {
          State.sortCol = col;
          State.sortDir = 'asc';
        }

        // Actualizar clases visuales
        document.querySelectorAll('thead th[data-col]').forEach(t => {
          t.classList.remove('sorted', 'desc');
          t.setAttribute('aria-sort', 'none');
        });

        th.classList.add('sorted');
        if (State.sortDir === 'desc') th.classList.add('desc');
        th.setAttribute('aria-sort', State.sortDir === 'asc' ? 'ascending' : 'descending');

        FilterController.apply();
      });
    });
  },
};

// ══════════════════════════════════════════════════════════════
//  EVENT LISTENERS
// ══════════════════════════════════════════════════════════════
function initEventListeners() {

  // Toolbar
  DOM.newPromptBtn.addEventListener('click', () => ModalController.openCreate());
  DOM.searchInput.addEventListener('input', () => FilterController.apply());
  DOM.categoryFilter.addEventListener('change', () => FilterController.apply());

  // Char counter del prompt
  DOM.fieldPrompt.addEventListener('input', () => {
    DOM.promptCharCount.textContent = DOM.fieldPrompt.value.length;
  });

  // ── FORM SUBMIT ────────────────────────────────────────────
  DOM.promptForm.addEventListener('submit', async e => {
    e.preventDefault();

    if (!State.apiUrl) {
      Toast.show('error', 'Sin conexión', 'Configurá la URL del Apps Script primero.');
      return;
    }

    const data = {
      categoria    : DOM.fieldCategoria.value.trim(),
      nombrePrompt : DOM.fieldNombrePrompt.value.trim(),
      prompt       : DOM.fieldPrompt.value.trim(),
      ejemplos     : DOM.fieldEjemplos.value.trim(),
    };

    if (!data.categoria) {
      DOM.fieldCategoria.focus();
      Toast.show('error', 'Campo requerido', 'Ingresá una categoría.');
      return;
    }
    if (!data.nombrePrompt) {
      DOM.fieldNombrePrompt.focus();
      Toast.show('error', 'Campo requerido', 'Ingresá el nombre del prompt.');
      return;
    }
    if (!data.prompt) {
      DOM.fieldPrompt.focus();
      Toast.show('error', 'Campo requerido', 'El contenido del prompt no puede estar vacío.');
      return;
    }

    const btn = DOM.formSubmitBtn;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner" style="width:16px;height:16px;border-width:2px;display:inline-block;vertical-align:middle;margin-right:8px"></span> Guardando...';

    try {
      if (State.currentEditId) {
        await DataController.update(State.currentEditId, data);
      } else {
        await DataController.create(data);
      }
      ModalController.closeForm();
    } catch (err) {
      console.error('[Form submit]', err);
      Toast.show('error', 'Error al guardar', err.message);
    } finally {
      btn.disabled = false;
      const isEdit = !!State.currentEditId;
      btn.innerHTML = `<span>${isEdit ? '💾' : '✨'}</span> <span>${isEdit ? 'Guardar Cambios' : 'Crear Prompt'}</span>`;
    }
  });

  // ── FORM MODAL CLOSE ───────────────────────────────────────
  DOM.formModalClose.addEventListener('click', () => ModalController.closeForm());
  DOM.formCancelBtn.addEventListener('click', () => ModalController.closeForm());
  DOM.formModal.addEventListener('click', e => {
    if (e.target === DOM.formModal) ModalController.closeForm();
  });

  // ── DELETE CONFIRM ─────────────────────────────────────────
  DOM.deleteConfirmBtn.addEventListener('click', async () => {
    if (!State.currentDeleteId) return;

    DOM.deleteConfirmBtn.disabled = true;
    DOM.deleteConfirmBtn.textContent = 'Eliminando...';

    try {
      await DataController.delete(State.currentDeleteId);
      ModalController.closeDelete();
    } catch (err) {
      console.error('[Delete confirm]', err);
      Toast.show('error', 'Error al eliminar', err.message);
    } finally {
      DOM.deleteConfirmBtn.disabled = false;
      DOM.deleteConfirmBtn.innerHTML = '🗑️ Sí, eliminar';
    }
  });

  DOM.deleteModalClose.addEventListener('click', () => ModalController.closeDelete());
  DOM.deleteCancelBtn.addEventListener('click', () => ModalController.closeDelete());
  DOM.deleteModal.addEventListener('click', e => {
    if (e.target === DOM.deleteModal) ModalController.closeDelete();
  });

  // ── DETAIL MODAL ───────────────────────────────────────────
  DOM.detailModalClose.addEventListener('click', () => ModalController.closeDetail());
  DOM.detailCloseBtn.addEventListener('click', () => ModalController.closeDetail());
  DOM.detailModal.addEventListener('click', e => {
    if (e.target === DOM.detailModal) ModalController.closeDetail();
  });

  DOM.detailEditBtn.addEventListener('click', () => {
    const id = State.currentDetailId;
    ModalController.closeDetail();
    setTimeout(() => ModalController.openEdit(id), 200);
  });

  // ── TABLE DELEGATION ───────────────────────────────────────
  DOM.promptsTbody.addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    const id     = btn.dataset.id;
    const action = btn.dataset.action;

    if (action === 'edit')   ModalController.openEdit(id);
    if (action === 'delete') ModalController.openDelete(id);
    if (action === 'detail') ModalController.openDetail(id);
  });

  // ── KEYBOARD (ESC para cerrar modales) ─────────────────────
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (DOM.formModal.classList.contains('active'))   ModalController.closeForm();
    if (DOM.deleteModal.classList.contains('active')) ModalController.closeDelete();
    if (DOM.detailModal.classList.contains('active')) ModalController.closeDetail();
  });
}

// ══════════════════════════════════════════════════════════════
//  BOOT
// ══════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  ThemeManager.init();
  ConfigManager.init();
  SortController.init();
  initEventListeners();

  // Cargar datos si ya hay URL configurada
  if (State.apiUrl) {
    DataController.loadAll();
  } else {
    // Mostrar empty state sin URL
    DOM.promptsTbody.innerHTML = `
      <tr><td colspan="6">
        <div class="empty-state">
          <span class="empty-icon">🔗</span>
          <div class="empty-title">Configurá tu conexión primero</div>
          <div class="empty-description">
            Pegá la URL del Web App de Google Apps Script en el banner de arriba para empezar a ver y gestionar tus prompts.
          </div>
        </div>
      </td></tr>
    `;
  }
});

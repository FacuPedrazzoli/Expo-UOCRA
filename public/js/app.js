/**
 * Expo Formación — Controlador principal del frontend (unificado)
 *
 * Fuente de verdad para charlas: /api/inscripcion/charlas (BD)
 * Fuente de verdad para empresas/muestras/competiciones: data.json (estático)
 */

import notifications from './utils/notifications.js';

// ── Estado global ──────────────────────────────────────────────────────────
const state = {
    charlas:              [],
    charlasSeleccionadas: new Set(),
    empresas:             {},
    muestras:             [],
    competiciones:        {},
    cargando:             false,
};

// ── Utilidades ─────────────────────────────────────────────────────────────
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

function log(...args) {
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
        console.log('[App]', ...args);
    }
}

// ── Datos estáticos (empresas, muestras, competiciones) ────────────────────
async function cargarDatosEstaticos() {
    try {
        const res = await fetch('/js/data.json', { cache: 'default' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        state.empresas      = data.empresas      || {};
        state.muestras      = data.muestras      || [];
        state.competiciones  = data.competiciones  || {};
        log('Datos estáticos cargados');
    } catch (err) {
        console.warn('No se pudo cargar data.json:', err.message);
    }
}

// ── Charlas desde la API (BD) ──────────────────────────────────────────────
async function cargarCharlas() {
    try {
        const res = await fetch('/api/inscripcion/charlas');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        state.charlas = await res.json();
        log(`${state.charlas.length} charlas cargadas`);
        return state.charlas;
    } catch (err) {
        console.error('Error al cargar charlas:', err.message);
        state.charlas = [];
        return [];
    }
}

// ── Secciones ──────────────────────────────────────────────────────────────
const secciones = {
    activa: 'inicio',
    cargadas: new Set(['inicio']),

    async ir(id) {
        if (this.activa === id) return;

        $(`#${this.activa}`)?.classList.remove('activa');
        const el = $(`#${id}`);
        if (!el) return;

        el.classList.add('activa');
        this.activa = id;

        // Cerrar menú móvil
        $('#main-nav')?.classList.remove('active');
        $('#toggle-menu')?.setAttribute('aria-expanded', 'false');

        window.scrollTo({ top: 0, behavior: 'smooth' });

        if (!this.cargadas.has(id)) {
            await this.cargarSeccion(id);
            this.cargadas.add(id);
        } else {
            if (id === 'charlas')      renderTablaCharlas();
            if (id === 'inscripcion')  renderCheckboxesCharlas();
        }
    },

    async cargarSeccion(id) {
        switch (id) {
            case 'charlas':
                await cargarCharlas();
                renderTablaCharlas();
                break;
            case 'inscripcion':
                await Promise.all([cargarCharlas(), cargarComoTeEnteraste()]);
                renderCheckboxesCharlas();
                break;
            case 'empresas':
                renderEmpresas('todas');
                break;
            case 'muestras':
                renderMuestras();
                break;
            case 'competiciones':
                renderCompeticiones('todas');
                break;
        }
    },
};

// ── Tabla de charlas (sección "Charlas") ───────────────────────────────────
function renderTablaCharlas() {
    const container = $('#charlas-tabla-container') || $('#charlas .table-responsive');
    if (!container) return;

    if (!state.charlas.length) {
        container.innerHTML = '<p class="text-center text-muted">No hay charlas disponibles.</p>';
        return;
    }

    const tbody = document.createDocumentFragment();
    state.charlas.forEach(c => {
        const tr = document.createElement('tr');
        const pct = c.capacidad_maxima > 0
            ? Math.round((c.participantes / c.capacidad_maxima) * 100) : 0;

        let badgeClass = 'badge-disponible';
        let badgeText  = `${c.cupo_disponible} disponibles`;
        if (c.cupo_disponible <= 0) {
            badgeClass = 'badge-completo';
            badgeText  = 'Cupo completo';
        } else if (pct >= 75) {
            badgeClass = 'badge-poco';
            badgeText  = `${c.cupo_disponible} lugares`;
        }

        tr.innerHTML = `
            <td>${c.horario}</td>
            <td><strong>${c.titulo}</strong></td>
            <td>${c.empresa}</td>
            <td>${c.ubicacion}</td>
            <td><span class="charla-badge-tabla ${badgeClass}">${badgeText}</span></td>
        `;
        tbody.appendChild(tr);
    });

    const table = document.createElement('table');
    table.className = 'charlas-table';
    table.innerHTML = `<thead><tr>
        <th>Horario</th><th>Charla</th><th>Empresa</th><th>Ubicación</th><th>Cupos</th>
    </tr></thead>`;
    const tbodyEl = document.createElement('tbody');
    tbodyEl.appendChild(tbody);
    table.appendChild(tbodyEl);

    container.innerHTML = '';
    container.appendChild(table);
}

// ── Checkboxes de charlas (formulario de inscripción) ──────────────────────
function renderCheckboxesCharlas() {
    const container = $('#charlas-container');
    if (!container) return;

    if (!state.charlas.length) {
        container.innerHTML = '<p>No se pudieron cargar las charlas.</p>';
        return;
    }

    const disponibles = state.charlas.filter(c => c.disponible && c.id !== 'N/A');
    const completas   = state.charlas.filter(c => !c.disponible && c.id !== 'N/A');

    const frag = document.createDocumentFragment();
    disponibles.forEach(c => frag.appendChild(crearCheckboxCharla(c, false)));

    if (completas.length > 0 && disponibles.length > 0) {
        const sep = document.createElement('div');
        sep.className = 'charlas-separador';
        sep.textContent = 'Charlas sin cupo';
        frag.appendChild(sep);
    }
    completas.forEach(c => frag.appendChild(crearCheckboxCharla(c, true)));

    container.innerHTML = '';
    container.appendChild(frag);
}

function crearCheckboxCharla(charla, completa) {
    const cupoDisp = charla.cupo_disponible || 0;
    let cupoClass = 'charla-cupo-ok';
    let cupoText  = `${cupoDisp} lugar${cupoDisp !== 1 ? 'es' : ''} disponible${cupoDisp !== 1 ? 's' : ''}`;
    if (completa) { cupoClass = 'charla-cupo-lleno'; cupoText = 'Sin cupo'; }

    const wrapper = document.createElement('div');
    if (completa) wrapper.className = 'charla-item-completa';

    const label = document.createElement('label');
    label.className = 'checkbox-label' + (completa ? ' charla-completa' : '');

    const cb = document.createElement('input');
    cb.type = 'checkbox'; cb.name = 'charlas'; cb.value = charla.id;
    cb.disabled = completa; cb.id = `charla-${charla.id}`;

    if (!completa) {
        cb.addEventListener('change', () => {
            if (cb.checked) {
                state.charlasSeleccionadas.add(charla.id);
                const noCharla = $('#no-charla');
                if (noCharla) noCharla.checked = false;
            } else {
                state.charlasSeleccionadas.delete(charla.id);
            }
            actualizarBadges();
        });
    }

    const checkmark = document.createElement('span');
    checkmark.className = 'checkmark';

    const info = document.createElement('div');
    info.className = 'charla-info';
    info.innerHTML = `
        <div class="charla-titulo">${charla.titulo}</div>
        <div class="charla-detalles">${charla.horario} — ${charla.empresa} — ${charla.ubicacion}</div>
        ${completa
            ? '<span class="charla-estado-completa">Cupo completo</span>'
            : `<span class="charla-cupo ${cupoClass}">${cupoText}</span>`}
    `;

    label.appendChild(cb); label.appendChild(checkmark); label.appendChild(info);
    wrapper.appendChild(label);
    return wrapper;
}

// ── Badges de charlas seleccionadas ────────────────────────────────────────
function actualizarBadges() {
    const badgesEl = $('#charlas-badges');
    const containerEl = $('#charlas-seleccionadas');
    if (!badgesEl || !containerEl) return;

    const marcados = $$('input[name="charlas"]:checked').map(cb => cb.value);
    state.charlasSeleccionadas.clear();
    marcados.forEach(v => state.charlasSeleccionadas.add(v));

    if (state.charlasSeleccionadas.size === 0) {
        badgesEl.innerHTML = '<div class="charlas-badges-empty">Ninguna charla seleccionada</div>';
        containerEl.classList.remove('has-selections');
        return;
    }

    containerEl.classList.add('has-selections');
    const frag = document.createDocumentFragment();

    for (const id of state.charlasSeleccionadas) {
        const badge = document.createElement('div');
        badge.className = 'charla-badge';
        let titulo = id === 'no-charla' ? 'No asistir a charlas'
            : (state.charlas.find(c => c.id === id)?.titulo || id);

        badge.innerHTML = `
            <span class="charla-badge-titulo">${titulo}</span>
            <button class="charla-badge-remove" data-id="${id}" aria-label="Quitar ${titulo}">×</button>
        `;
        badge.querySelector('.charla-badge-remove').addEventListener('click', () => {
            const cb = $(`input[name="charlas"][value="${id}"]`);
            if (cb) { cb.checked = false; cb.dispatchEvent(new Event('change')); }
            state.charlasSeleccionadas.delete(id);
            actualizarBadges();
        });
        frag.appendChild(badge);
    }

    badgesEl.innerHTML = '';
    badgesEl.appendChild(frag);
}

// ── Como te enteraste ─────────────────────────────────────────────────────
async function cargarComoTeEnteraste() {
    const sel = $('#como-te-enteraste');
    if (!sel) return;
    if (sel.options.length > 1) return;

    try {
        const res = await fetch('/api/inscripcion/como-te-enteraste');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const opciones = await res.json();

        const frag = document.createDocumentFragment();
        opciones.forEach(op => {
            const opt = document.createElement('option');
            opt.value = op.id; opt.textContent = op.descripcion;
            frag.appendChild(opt);
        });
        sel.appendChild(frag);
    } catch {
        const fallback = [
            { id: 'RS01', d: 'Redes Sociales' }, { id: 'AM02', d: 'Amigo/Familiar' },
            { id: 'EM03', d: 'Email' }, { id: 'WEB4', d: 'Sitio Web' },
            { id: 'AL04', d: 'Alumno/a de UOCRA' }, { id: 'OT05', d: 'Otro' },
        ];
        fallback.forEach(({ id, d }) => {
            const opt = document.createElement('option');
            opt.value = id; opt.textContent = d;
            sel.appendChild(opt);
        });
    }
}

// ── Formulario de inscripción ─────────────────────────────────────────────
function setupFormulario() {
    const form = $('#inscripcionForm');
    if (!form) return;

    const noCharla = $('#no-charla');
    noCharla?.addEventListener('change', () => {
        if (noCharla.checked) {
            $$('input[name="charlas"]:not(#no-charla)').forEach(cb => { cb.checked = false; });
            state.charlasSeleccionadas.clear();
            state.charlasSeleccionadas.add('no-charla');
        } else {
            state.charlasSeleccionadas.delete('no-charla');
        }
        actualizarBadges();
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await enviarInscripcion();
    });
}

async function enviarInscripcion() {
    if (state.cargando) return;

    const nombre    = $('#nombre')?.value.trim()       || '';
    const apellido  = $('#apellido')?.value.trim()     || '';
    const dni       = $('#dni')?.value.trim()           || '';
    const email     = $('#email')?.value.trim()         || '';
    const comoTeEnt = $('#como-te-enteraste')?.value    || '';
    const charlasMarcadas = $$('input[name="charlas"]:checked').map(cb => cb.value);

    if (!nombre || !apellido || !dni || !email || !comoTeEnt) {
        notifications.warning('Por favor completá todos los campos obligatorios.', { title: 'Campos incompletos' });
        return;
    }
    if (!/^\d{6,10}$/.test(dni)) {
        notifications.warning('El DNI debe contener entre 6 y 10 dígitos.', { title: 'DNI inválido' });
        return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        notifications.warning('Ingresá un email válido.', { title: 'Email inválido' });
        return;
    }
    if (charlasMarcadas.length === 0) {
        notifications.warning('Seleccioná al menos una charla o marcá "No deseo asistir a ninguna charla".', { title: 'Selección de charlas' });
        return;
    }

    setSubmitLoading(true);
    state.cargando = true;

    try {
        const res = await fetchWithRetry('/api/inscripcion', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ nombre, apellido, dni, email, como_te_enteraste: comoTeEnt, charlas: charlasMarcadas }),
        });

        const data = await res.json();

        if (!res.ok) {
            notifications.error(data.mensaje || 'Error al procesar la inscripción.', {
                title: data.error || 'Error', showConfirmButton: true, backdrop: true,
            });
            return;
        }

        const numCharlas = data.charlasInscritas?.length || 0;
        notifications.success(
            numCharlas > 1
                ? `¡Te inscribiste a ${numCharlas} charlas exitosamente!`
                : '¡Tu inscripción fue registrada correctamente!',
            { title: '¡Listo!', showConfirmButton: true, backdrop: true, callback: () => secciones.ir('inicio') }
        );

        limpiarFormulario();
        secciones.cargadas.delete('charlas');
        secciones.cargadas.delete('inscripcion');
        await cargarCharlas();

    } catch (err) {
        notifications.error('No se pudo conectar con el servidor. Verificá tu conexión e intentá nuevamente.', {
            title: 'Error de conexión', showConfirmButton: true, backdrop: true,
        });
        console.error('Error en inscripción:', err);
    } finally {
        setSubmitLoading(false);
        state.cargando = false;
    }
}

function setSubmitLoading(loading) {
    const btn    = $('#btn-formulario');
    const textEl = btn?.querySelector('.btn-text');
    const loadEl = btn?.querySelector('.btn-loading');
    if (!btn) return;
    btn.disabled = loading;
    if (textEl) textEl.style.display = loading ? 'none' : '';
    if (loadEl) loadEl.style.display = loading ? ''     : 'none';
}

function limpiarFormulario() {
    $('#inscripcionForm')?.reset();
    state.charlasSeleccionadas.clear();
    actualizarBadges();
    renderCheckboxesCharlas();
}

// ── fetch con reintentos ──────────────────────────────────────────────────
async function fetchWithRetry(url, opts, retries = 2, timeout = 30000) {
    let lastErr;
    for (let i = 0; i <= retries; i++) {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), timeout);
        try {
            const res = await fetch(url, { ...opts, signal: ctrl.signal });
            clearTimeout(timer);
            return res;
        } catch (err) {
            clearTimeout(timer);
            lastErr = err;
            if (i < retries) await new Promise(r => setTimeout(r, 1000 * (i + 1)));
        }
    }
    throw lastErr;
}

// ── Empresas ──────────────────────────────────────────────────────────────
function renderEmpresas(categoria = 'todas') {
    $$('#empresas .btn-categoria[data-categoria]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.categoria === categoria);
    });

    const container = $('#empresas-lista');
    if (!container) return;

    let lista = [];
    if (categoria === 'todas') {
        Object.values(state.empresas).forEach(arr => {
            if (Array.isArray(arr)) lista.push(...arr);
        });
    } else {
        lista = state.empresas[categoria] || [];
    }

    if (!lista.length) {
        container.innerHTML = '<p style="grid-column:1/-1">No hay empresas en esta categoría.</p>';
        return;
    }

    const frag = document.createDocumentFragment();
    lista.forEach(emp => frag.appendChild(crearTarjetaEmpresa(emp)));
    container.innerHTML = '';
    container.appendChild(frag);
}

function crearTarjetaEmpresa(emp) {
    const card = document.createElement('div');
    card.className = 'empresa-card';

    card.innerHTML = `
        ${emp.logo ? `<img src="${emp.logo}" alt="Logo ${emp.nombre}" class="empresa-logo" loading="lazy" onerror="this.style.display='none'" />` : ''}
        <p><strong>${emp.nombre}</strong></p>
        <p>${emp.descripcion || ''}</p>
        ${emp.url ? `<a href="${emp.url}" target="_blank" rel="noopener" class="btn-visitar" onclick="event.stopPropagation()">Visitar sitio web</a>` : ''}
    `;

    if (emp.url) {
        card.style.cursor = 'pointer';
        card.addEventListener('click', (e) => {
            if (!e.target.classList.contains('btn-visitar')) window.open(emp.url, '_blank', 'noopener');
        });
    }
    return card;
}

// ── Muestras ──────────────────────────────────────────────────────────────
function renderMuestras() {
    const container = $('#stands-container');
    if (!container) return;

    if (!state.muestras.length) {
        container.innerHTML = '<p>No hay muestras disponibles.</p>';
        return;
    }

    const frag = document.createDocumentFragment();
    state.muestras.forEach(s => {
        const el = document.createElement('div');
        el.className = 'stand-item';
        el.innerHTML = `
            <div class="stand-number">${s.numero}</div>
            <div class="stand-info"><h4>${s.muestra}</h4><p>${s.ubicacion}</p></div>
        `;
        frag.appendChild(el);
    });
    container.innerHTML = '';
    container.appendChild(frag);
}

// ── Competiciones ─────────────────────────────────────────────────────────
function renderCompeticiones(categoria = 'todas') {
    $$('#competiciones .btn-categoria').forEach(btn => {
        const cat = btn.dataset.competicion || btn.dataset.categoria;
        btn.classList.toggle('active', cat === categoria);
    });

    const container = $('#competiciones-lista');
    if (!container) return;

    let todas = [];
    if (categoria === 'todas') {
        Object.values(state.competiciones).forEach(arr => {
            if (Array.isArray(arr)) todas.push(...arr);
        });
    } else {
        todas = state.competiciones[categoria] || [];
    }

    if (!todas.length) {
        container.innerHTML = '<p>No hay competiciones disponibles.</p>';
        return;
    }

    const frag = document.createDocumentFragment();
    todas.forEach(c => frag.appendChild(crearTarjetaCompeticion(c)));
    container.innerHTML = '';
    container.appendChild(frag);
}

function crearTarjetaCompeticion(c) {
    const card = document.createElement('div');
    card.className = 'competicion-card';
    card.innerHTML = `
        ${c.imagen ? `<div class="competicion-imagen"><img src="${c.imagen}" alt="${c.titulo}" loading="lazy" onerror="this.parentElement.style.display='none'" /></div>` : ''}
        <div class="competicion-info">
            <h3>${c.titulo}</h3>
            <p class="competicion-descripcion">${c.descripcion || ''}</p>
            <div class="competicion-detalles">
                <p><i class="fas fa-clock"></i> <strong>Horario:</strong> ${c.horario}</p>
                <p><i class="fas fa-map-marker-alt"></i> <strong>Ubicación:</strong> ${c.ubicacion}</p>
            </div>
        </div>
    `;
    return card;
}

// ── Event listeners ──────────────────────────────────────────────────────
function setupEventListeners() {
    // Navegación por data-seccion
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-seccion]');
        if (!btn) return;
        e.preventDefault();
        secciones.ir(btn.dataset.seccion);
    });

    // Toggle menú móvil
    $('#toggle-menu')?.addEventListener('click', () => {
        const nav    = $('#main-nav');
        const toggle = $('#toggle-menu');
        const isOpen = nav.classList.toggle('active');
        toggle.setAttribute('aria-expanded', String(isOpen));
    });

    // Filtro de empresas
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('#empresas .btn-categoria[data-categoria]');
        if (!btn) return;
        renderEmpresas(btn.dataset.categoria);
    });

    // Filtro de competiciones
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('#competiciones .btn-categoria');
        if (!btn) return;
        const cat = btn.dataset.competicion || btn.dataset.categoria;
        if (cat) renderCompeticiones(cat);
    });

    // Botón "Inscribirme" del inicio
    $('#btn-inscribirme')?.addEventListener('click', () => {
        secciones.ir('inscripcion');
    });
}

// ── Bootstrap ──────────────────────────────────────────────────────────────
async function init() {
    log('Inicializando app...');

    setupEventListeners();
    setupFormulario();

    // Cargar datos estáticos en segundo plano
    cargarDatosEstaticos();

    log('App lista');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
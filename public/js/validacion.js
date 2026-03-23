/**
 * Panel de Validación — Expo Formación UOCRA
 * Optimizado para evento masivo con escáner QR
 */

(function () {
  'use strict';

  const API_BASE = '/api/validacion';
  const RESET_DELAY_EXITO = 4000;
  const RESET_DELAY_ERROR = 3000;

  let isValidating = false;
  let counterValidados = 0;

  const $ = id => document.getElementById(id);
  const input = $('dni-input');
  const btnValidar = $('btn-validar');
  const loading = $('loading');
  const resultadoExito = $('resultado-exito');
  const resultadoError = $('resultado-error');
  const errorServidor = $('error-servidor');

  function mostrarLoading() {
    loading.hidden = false;
    resultadoExito.hidden = true;
    resultadoError.hidden = true;
    errorServidor.hidden = true;
  }

  function mostrarExito(data) {
    loading.hidden = true;
    resultadoError.hidden = true;
    errorServidor.hidden = true;
    resultadoExito.hidden = false;

    $('nombre-resultado').textContent = `${data.nombre} ${data.apellido}`;
    
    const charlasContainer = $('charlas-resultado');
    if (data.charlas && data.charlas.length > 0) {
      charlasContainer.innerHTML = data.charlas.map(c => 
        `<span class="charla-chip">${c.titulo} • ${c.horario}</span>`
      ).join('');
    } else {
      charlasContainer.innerHTML = '<span class="charla-chip">Sin charlas</span>';
    }

    const yaValidadoMsg = $('ya-validado-msg');
    yaValidadoMsg.hidden = !data.ya_validado;

    if (!data.ya_validado) {
      counterValidados++;
      actualizarContador();
    }
  }

  function mostrarError() {
    loading.hidden = true;
    resultadoExito.hidden = true;
    errorServidor.hidden = true;
    resultadoError.hidden = false;
  }

  function mostrarErrorServidor(msg) {
    loading.hidden = true;
    resultadoExito.hidden = true;
    resultadoError.hidden = true;
    errorServidor.hidden = false;
    $('error-mensaje').textContent = msg || 'Error de conexión';
  }

  function resetForm() {
    loading.hidden = true;
    resultadoExito.hidden = true;
    resultadoError.hidden = true;
    errorServidor.hidden = true;
    if (input) input.value = '';
    devolverFoco();
  }

  function devolverFoco() {
    if (input) {
      input.focus();
      input.select();
    }
  }

  function actualizarContador() {
    const counter = $('contador-validados');
    if (counter) {
      counter.textContent = counterValidados;
    }
  }

  async function cargarContadorInicial() {
    try {
      const res = await fetch('/api/stats');
      if (res.ok) {
        const data = await res.json();
        if (data.resumen && data.resumen.validados !== undefined) {
          counterValidados = data.resumen.validados;
          actualizarContador();
        }
      }
    } catch (e) {
      console.warn('No se pudo cargar contador inicial');
    }
  }

  async function validarDNI(dni) {
    if (!dni || dni.length < 6) return;
    if (isValidating) return;

    isValidating = true;
    mostrarLoading();
    devolverFoco();

    try {
      const res = await fetch(`${API_BASE}/validar-qr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qr_data: dni })
      });

      const data = await res.json();

      if (res.ok && data.ok) {
        mostrarExito(data);
        setTimeout(resetForm, RESET_DELAY_EXITO);
      } else {
        mostrarError();
        setTimeout(resetForm, RESET_DELAY_ERROR);
      }
    } catch (err) {
      console.error('Error de red:', err);
      mostrarErrorServidor('Error de conexión');
      setTimeout(resetForm, 2000);
    } finally {
      isValidating = false;
    }
  }

  function init() {
    cargarContadorInicial();
    devolverFoco();

    if (btnValidar) {
      btnValidar.addEventListener('click', () => {
        const value = input?.value?.trim() || '';
        if (value) validarDNI(value);
      });
    }

    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const value = input.value.trim();
          if (value) validarDNI(value);
        }
      });

      input.addEventListener('input', () => {
        if (resultadoExito.hidden === false || resultadoError.hidden === false) {
          resetForm();
        }
      });
    }

    document.addEventListener('click', (e) => {
      if (e.target === document.body || 
          (e.target.tagName !== 'INPUT' && e.target.tagName !== 'BUTTON')) {
        setTimeout(devolverFoco, 10);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
/**
 * Lógica de la sección oculta de validación de inscriptos
 * Ruta: /admin-validacion
 * 
 * Endpoints consumidos:
 *   GET  /api/validacion/buscar?dni=XX  → busca inscripto por DNI
 *   PATCH /api/validacion/validar       → marca inscripto como validado
 */

(function () {
  'use strict';

  // Referencias DOM
  const dniInput = document.getElementById('dni-input');
  const btnBuscar = document.getElementById('btn-buscar');
  const inputError = document.getElementById('input-error');
  const loading = document.getElementById('loading');
  const resultado = document.getElementById('resultado');
  const nombreCompleto = document.getElementById('nombre-completo');
  const badgeValidado = document.getElementById('badge-validado');
  const fechaValidacion = document.getElementById('fecha-validacion');
  const btnValidar = document.getElementById('btn-validar');
  const confirmacion = document.getElementById('confirmacion');
  const confirmacionTexto = document.getElementById('confirmacion-texto');
  const noEncontrado = document.getElementById('no-encontrado');
  const errorServidor = document.getElementById('error-servidor');
  const errorMensaje = document.getElementById('error-mensaje');

  // Estado actual del DNI buscado
  let dniActual = '';
  let resetTimer = null;
  const VALIDAR_BUTTON_HTML = '<i class="fas fa-clipboard-check"></i> VALIDAR';

  // Ocultar todas las secciones de resultado
  function resetResultados() {
    resultado.hidden = true;
    noEncontrado.hidden = true;
    errorServidor.hidden = true;
    loading.hidden = true;
    badgeValidado.hidden = true;
    btnValidar.hidden = true;
    confirmacion.hidden = true;
    inputError.hidden = true;
    dniInput.classList.remove('input-error-border');
    nombreCompleto.textContent = '';
    fechaValidacion.textContent = '';
    confirmacionTexto.textContent = '';
    errorMensaje.textContent = 'Error al comunicarse con el servidor.';
    btnValidar.disabled = false;
    btnValidar.innerHTML = VALIDAR_BUTTON_HTML;
  }

  function limpiarResetPendiente() {
    if (resetTimer) {
      clearTimeout(resetTimer);
      resetTimer = null;
    }
  }

  function prepararSiguienteValidacion() {
    limpiarResetPendiente();
    dniActual = '';
    dniInput.value = '';
    resetResultados();
    dniInput.focus();
  }

  function programarSiguienteValidacion() {
    limpiarResetPendiente();
    resetTimer = setTimeout(() => {
      prepararSiguienteValidacion();
    }, 5000);
  }

  // Formatear fecha/hora para mostrar
  function formatearFecha(isoString) {
    if (!isoString) return '';
    const fecha = new Date(isoString);
    return fecha.toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Buscar inscripto por DNI
  async function buscarPorDNI() {
    const dni = dniInput.value.trim();

    limpiarResetPendiente();

    // Validación de campo vacío
    if (!dni) {
      inputError.hidden = false;
      dniInput.classList.add('input-error-border');
      dniInput.focus();
      return;
    }

    resetResultados();
    dniActual = dni;

    // Mostrar loading
    loading.hidden = false;
    btnBuscar.disabled = true;

    try {
      const response = await fetch(`/api/validacion/buscar?dni=${encodeURIComponent(dni)}`);
      const data = await response.json();

      loading.hidden = true;
      btnBuscar.disabled = false;

      if (response.ok && data.encontrado) {
        // Inscripto encontrado
        nombreCompleto.textContent = `${data.nombre} ${data.apellido}`;
        resultado.hidden = false;

        if (data.validado) {
          // Ya validado previamente
          badgeValidado.hidden = false;
          fechaValidacion.textContent = data.validado_en
            ? `— ${formatearFecha(data.validado_en)}`
            : '';
        } else {
          // Pendiente de validación
          btnValidar.hidden = false;
        }
      } else if (response.status === 404) {
        // No encontrado
        noEncontrado.hidden = false;
      } else {
        // Error del servidor
        errorMensaje.textContent = data.error || 'Error al comunicarse con el servidor.';
        errorServidor.hidden = false;
      }
    } catch (err) {
      loading.hidden = true;
      btnBuscar.disabled = false;
      errorMensaje.textContent = 'No se pudo conectar con el servidor.';
      errorServidor.hidden = false;
    }
  }

  // Validar inscripción
  async function validarInscripcion() {
    if (!dniActual) return;

    btnValidar.disabled = true;
    btnValidar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Validando...';

    try {
      const response = await fetch('/api/validacion/validar', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dni: dniActual })
      });

      const data = await response.json();

      if (response.ok && data.ok) {
        // Éxito: ocultar botón, mostrar confirmación
        btnValidar.hidden = true;

        confirmacionTexto.textContent = data.ya_validado
          ? `${data.nombre} ${data.apellido} — Ya estaba validado.`
          : `${data.nombre} ${data.apellido} — Inscripción validada correctamente.`;
        confirmacion.hidden = false;

        // Mostrar badge con fecha
        badgeValidado.hidden = false;
        fechaValidacion.textContent = data.validado_en
          ? `— ${formatearFecha(data.validado_en)}`
          : '';

        programarSiguienteValidacion();
      } else {
        // Error
        btnValidar.disabled = false;
        btnValidar.innerHTML = VALIDAR_BUTTON_HTML;
        errorMensaje.textContent = data.error || 'Error al validar la inscripción.';
        errorServidor.hidden = false;
      }
    } catch (err) {
      btnValidar.disabled = false;
      btnValidar.innerHTML = VALIDAR_BUTTON_HTML;
      errorMensaje.textContent = 'No se pudo conectar con el servidor.';
      errorServidor.hidden = false;
    }
  }

  // Event listeners
  btnBuscar.addEventListener('click', buscarPorDNI);

  dniInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      buscarPorDNI();
    }
  });

  // Limpiar error al escribir
  dniInput.addEventListener('input', function () {
    limpiarResetPendiente();
    dniInput.value = dniInput.value.replace(/\D+/g, '');

    if (inputError && !inputError.hidden) {
      inputError.hidden = true;
      dniInput.classList.remove('input-error-border');
    }
  });

  btnValidar.addEventListener('click', validarInscripcion);
})();

/**
 * Sistema de notificaciones personalizado en formato popup
 * Muestra notificaciones como modales centrados en la pantalla
 */

// Importar sistema de logs si está disponible
let logger;
try {
  import('./logger-init.js').then(module => {
    logger = module.default;
  }).catch(() => {
    logger = console;
  });
} catch (error) {
  logger = console;
}

// Configuración por defecto
const defaultConfig = {
  duration: 5000,       // Duración de las notificaciones en ms
  maxNotifications: 1,  // Solo permitimos un popup a la vez
  showCloseButton: true,
  showConfirmButton: true,
  confirmButtonText: 'Aceptar',
  backdrop: true       // Mostrar fondo oscurecido
};

// Estado interno del módulo
const state = {
  activeNotification: null,
  queue: [],
  config: {...defaultConfig},
  overlay: null
};

/**
 * Muestra una notificación como popup
 * @param {string} message - Mensaje principal
 * @param {string} type - Tipo: 'success', 'error', 'warning', 'info'
 * @param {object} options - Opciones adicionales
 */
function showNotification(message, type = 'info', options = {}) {
  const {
    title = getTitleByType(type),
    duration = state.config.duration,
    icon = getIconByType(type),
    callback = null,
    showCloseButton = state.config.showCloseButton,
    showConfirmButton = state.config.showConfirmButton,
    confirmButtonText = state.config.confirmButtonText,
    backdrop = state.config.backdrop
  } = options;
  
  // Crear nueva notificación
  const notificationData = {
    type,
    title,
    message,
    duration,
    icon,
    callback,
    showCloseButton,
    showConfirmButton,
    confirmButtonText
  };

  // Si hay una notificación activa, colocar en cola
  if (state.activeNotification) {
    state.queue.push(notificationData);
    return;
  }
  
  // Crear y mostrar la notificación
  createAndShowNotification(notificationData, backdrop);
}

/**
 * Crea y muestra una notificación popup
 */
function createAndShowNotification(data, showBackdrop) {
  // Crear el contenedor si no existe
  const container = getNotificationContainer();
  
  // Crear elemento de notificación
  const notification = document.createElement('div');
  notification.className = `notification ${data.type}`;
  
  // Estructura del popup
  notification.innerHTML = `
    <div class="notification-header">
      <div class="notification-icon">
        <i class="${data.icon}"></i>
      </div>
      <div class="notification-title">${data.title}</div>
      ${data.showCloseButton ? '<div class="notification-close" aria-label="Cerrar"><i class="fas fa-times"></i></div>' : ''}
    </div>
    <div class="notification-content">${data.message}</div>
    ${data.showConfirmButton ? 
      `<div class="notification-footer">
        <button class="notification-button">${data.confirmButtonText}</button>
      </div>` : ''}
    <div class="notification-progress"></div>
  `;
  
  // Añadir al DOM
  container.appendChild(notification);

  // Crear o activar overlay (fondo oscurecido) si se requiere
  if (showBackdrop) {
    showOverlay();
  }
  
  // Guardar referencia a la notificación activa
  state.activeNotification = {
    element: notification,
    data: data
  };
  
  // Aplicar animación para mostrar (en el siguiente ciclo del event loop)
  setTimeout(() => {
    notification.classList.add('show');
    
    // Configurar cierre al hacer clic en el botón de cerrar
    if (data.showCloseButton) {
      const closeButton = notification.querySelector('.notification-close');
      if (closeButton) {
        closeButton.addEventListener('click', () => closeNotification());
      }
    }
    
    // Configurar cierre al hacer clic en el botón de confirmar
    if (data.showConfirmButton) {
      const confirmButton = notification.querySelector('.notification-button');
      if (confirmButton) {
        confirmButton.addEventListener('click', () => {
          closeNotification();
          if (typeof data.callback === 'function') {
            data.callback();
          }
        });
      }
    }
    
    // Configurar cierre automático después de la duración especificada (si es mayor a 0)
    if (data.duration > 0) {
      // Animación de la barra de progreso
      const progressBar = notification.querySelector('.notification-progress::before');
      if (progressBar) {
        progressBar.style.transition = `width ${data.duration}ms linear`;
        setTimeout(() => { progressBar.style.width = '0%'; }, 50);
      }
      
      // Cierre automático
      setTimeout(() => {
        closeNotification();
      }, data.duration);
    }
  }, 10);
  
  // Devolver una función para cerrar la notificación manualmente
  return () => closeNotification();
}

/**
 * Cierra la notificación actual
 */
function closeNotification(processQueue = true) {
  if (!state.activeNotification) return;
  
  const { element, data } = state.activeNotification;
  
  // Quitar clase show para animar el cierre
  element.classList.remove('show');
  
  // Quitar el overlay
  hideOverlay();
  
  // Eliminar del DOM después de la animación
  setTimeout(() => {
    if (element.parentNode) {
      element.parentNode.removeChild(element);
    }
    
    // Limpiar la referencia
    state.activeNotification = null;
    
    // Ejecutar el callback si existe y no se ha ejecutado por botón
    if (processQueue && typeof data.callback === 'function') {
      data.callback();
    }
    
    // Procesar la siguiente notificación en cola si existe
    if (processQueue && state.queue.length > 0) {
      const nextNotification = state.queue.shift();
      createAndShowNotification(nextNotification, state.config.backdrop);
    }
  }, 300); // Tiempo para la animación de cierre
}

/**
 * Gestiona el overlay para el fondo oscurecido
 */
function showOverlay() {
  // Crear overlay si no existe
  if (!state.overlay) {
    const overlay = document.createElement('div');
    overlay.className = 'notification-overlay';
    document.body.appendChild(overlay);
    state.overlay = overlay;
  }
  
  // Activar el overlay
  setTimeout(() => {
    state.overlay.classList.add('active');
  }, 10);
}

/**
 * Oculta el overlay
 */
function hideOverlay() {
  if (state.overlay) {
    state.overlay.classList.remove('active');
  }
}

/**
 * Obtiene el contenedor de notificaciones
 * @returns {HTMLElement} Contenedor
 */
function getNotificationContainer() {
  let container = document.getElementById('notification-container');
  
  if (!container) {
    container = document.createElement('div');
    container.id = 'notification-container';
    container.className = 'notification-container';
    document.body.appendChild(container);
  }
  
  return container;
}

/**
 * Obtiene un título basado en el tipo de notificación
 * @param {string} type - Tipo de notificación
 * @returns {string} Título correspondiente
 */
function getTitleByType(type) {
  const titles = {
    success: '¡Éxito!',
    error: 'Error',
    warning: 'Advertencia',
    info: 'Información'
  };
  
  return titles[type] || titles.info;
}

/**
 * Obtiene un ícono basado en el tipo de notificación
 * @param {string} type - Tipo de notificación
 * @returns {string} Clase CSS del ícono
 */
function getIconByType(type) {
  const icons = {
    success: 'fas fa-check-circle',
    error: 'fas fa-exclamation-circle',
    warning: 'fas fa-exclamation-triangle',
    info: 'fas fa-info-circle'
  };
  
  return icons[type] || icons.info;
}

/**
 * Configura el módulo de notificaciones
 * @param {object} config - Configuración
 */
function configure(config = {}) {
  state.config = { ...state.config, ...config };
}

/**
 * Muestra una notificación de éxito
 * @param {string} message - Mensaje a mostrar
 * @param {object} options - Opciones adicionales
 */
function success(message, options = {}) {
  return showNotification(message, 'success', options);
}

/**
 * Muestra una notificación de error
 * @param {string} message - Mensaje a mostrar
 * @param {object} options - Opciones adicionales
 */
function error(message, options = {}) {
  return showNotification(message, 'error', options);
}

/**
 * Muestra una notificación de advertencia
 * @param {string} message - Mensaje a mostrar
 * @param {object} options - Opciones adicionales
 */
function warning(message, options = {}) {
  return showNotification(message, 'warning', options);
}

/**
 * Muestra una notificación informativa
 * @param {string} message - Mensaje a mostrar
 * @param {object} options - Opciones adicionales
 */
function info(message, options = {}) {
  return showNotification(message, 'info', options);
}

/**
 * Cierra todas las notificaciones activas
 */
function closeAll() {
  if (state.activeNotification) {
    closeNotification(false);
  }
  // Limpiar la cola
  state.queue = [];
}

// Exportación de la API pública
export default {
  show: showNotification,
  success,
  error,
  warning,
  info,
  closeAll,
  configure
};
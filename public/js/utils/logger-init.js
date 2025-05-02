import Logger from './logger.js';
import { EventBus } from '../main.js';


// Factory para crear instancias de logger configuradas

export function createLogger(options = {}) {
  // Configuración por defecto
  const defaultOptions = {
    appName: 'Expo Formación',
    enableConsole: true,
    enableRemoteLogging: process.env.NODE_ENV === 'production', // Solo en producción por defecto
    logLevel: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    ...options
  };

  const logger = new Logger(defaultOptions);
  
  // Si está disponible el EventBus global, usar ese
  if (window.AppEventBus) {
    logger.eventBus = window.AppEventBus;
  } else if (EventBus) {
    logger.eventBus = EventBus;
  }
  
  return logger;
}


// Logger global por defecto

const defaultLogger = createLogger();

// Opcionalmente activar captura de errores no manejados
defaultLogger.captureGlobalErrors();

// Registra eventos especiales en la aplicación
const setupAppEventLogging = () => {
  if (!defaultLogger.eventBus) return;
  
  // Log eventos de navegación
  defaultLogger.eventBus.on('seccion:cambio', (seccion) => {
    defaultLogger.info(`Navegación a sección: ${seccion}`);
  });
  
  // Log eventos de inscripción
  defaultLogger.eventBus.on('inscripcion:exitosa', (resultado) => {
    defaultLogger.info('Inscripción exitosa', { id: resultado.id, charla: resultado.idCharla });
  });
  
  // Log errores de inscripción
  defaultLogger.eventBus.on('inscripcion:error', (error) => {
    defaultLogger.error('Error en inscripción', { 
      message: error.message, 
      stack: error.stack 
    });
  });
  
  // Log carga de charlas
  defaultLogger.eventBus.on('charlas:cargadas', (charlas) => {
    defaultLogger.debug(`Cargadas ${charlas.length} charlas`);
  });
  
  defaultLogger.eventBus.on('charlas:error', (error) => {
    defaultLogger.error('Error al cargar charlas', { 
      message: error.message 
    });
  });
};

// Configurar eventos cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  // Si el EventBus no está disponible inmediatamente, esperamos un poco
  if (!defaultLogger.eventBus) {
    setTimeout(() => {
      if (window.AppEventBus) {
        defaultLogger.eventBus = window.AppEventBus;
        setupAppEventLogging();
        defaultLogger.info('Logger configurado con EventBus global');
      }
    }, 500);
  } else {
    setupAppEventLogging();
    defaultLogger.info('Logger configurado con EventBus inmediato');
  }
});

// Exponer el logger globalmente para debugging
window.appLogger = defaultLogger;

// Exportar el logger por defecto
export default defaultLogger;
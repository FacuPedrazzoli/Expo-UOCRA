/**
 * Sistema de logs centralizado para el frontend
 * Permite registrar eventos y errores en consola y, opcionalmente, enviarlos al servidor
 */
export default class Logger {
  constructor(options = {}) {
    // Configuración por defecto
    this.options = {
      appName: 'Expo Formación',
      enableConsole: true,
      enableRemoteLogging: false,
      remoteLogEndpoint: '/api/logs', 
      logLevel: 'info', // 'debug', 'info', 'warn', 'error'
      ...options
    };

    // Mapa de niveles de logs
    this.levels = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };
    
    // Para enviar eventos al EventBus si está disponible
    this.eventBus = window.AppEventBus || null;
  }

  /**
   * Determina si un mensaje debe ser registrado según el nivel configurado
   * @param {string} level - Nivel del mensaje
   * @returns {boolean} - true si debe registrarse
   */
  shouldLog(level) {
    return this.levels[level] >= this.levels[this.options.logLevel];
  }

  /**
   * Formatea el mensaje con timestamp y otros datos
   * @param {string} level - Nivel del mensaje
   * @param {string} message - Mensaje a formatear
   * @returns {string} - Mensaje formateado
   */
  formatMessage(level, message) {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${this.options.appName}] [${level.toUpperCase()}]: ${message}`;
  }

  /**
   * Envía un log al servidor
   * @param {string} level - Nivel del mensaje
   * @param {string} message - Mensaje a enviar
   * @param {Object} data - Datos adicionales
   */
  async sendRemoteLog(level, message, data = {}) {
    if (!this.options.enableRemoteLogging) return;

    try {
      const response = await fetch(this.options.remoteLogEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          level,
          message,
          timestamp: new Date().toISOString(),
          data,
          userAgent: navigator.userAgent,
          url: window.location.href
        }),
        // No necesitamos esperar la respuesta
        keepalive: true
      });
      
      return response.ok;
    } catch (error) {
      // Evitamos un bucle infinito de logs
      if (this.options.enableConsole) {
        console.error('Error al enviar log remoto:', error);
      }
      return false;
    }
  }

  /**
   * Envía evento al sistema de eventos
   * @param {string} level - Nivel del mensaje
   * @param {string} message - Mensaje del evento
   * @param {Object} data - Datos adicionales
   */
  emitEvent(level, message, data = {}) {
    if (!this.eventBus) return;
    
    this.eventBus.emit('log:' + level, {
      message,
      data,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Registra un mensaje a nivel debug
   * @param {string} message - Mensaje a registrar
   * @param {Object} data - Datos adicionales
   */
  debug(message, data = {}) {
    if (!this.shouldLog('debug')) return;
    
    const formattedMessage = this.formatMessage('debug', message);
    
    if (this.options.enableConsole) {
      console.debug(formattedMessage, data);
    }
    
    this.emitEvent('debug', message, data);
  }

  /**
   * Registra un mensaje a nivel info
   * @param {string} message - Mensaje a registrar
   * @param {Object} data - Datos adicionales
   */
  info(message, data = {}) {
    if (!this.shouldLog('info')) return;
    
    const formattedMessage = this.formatMessage('info', message);
    
    if (this.options.enableConsole) {
      console.info(formattedMessage, data);
    }
    
    this.emitEvent('info', message, data);
  }

  /**
   * Registra un mensaje a nivel advertencia
   * @param {string} message - Mensaje a registrar
   * @param {Object} data - Datos adicionales
   */
  warn(message, data = {}) {
    if (!this.shouldLog('warn')) return;
    
    const formattedMessage = this.formatMessage('warn', message);
    
    if (this.options.enableConsole) {
      console.warn(formattedMessage, data);
    }
    
    this.emitEvent('warn', message, data);
  }

  /**
   * Registra un mensaje a nivel error
   * @param {string} message - Mensaje a registrar
   * @param {Object} data - Datos adicionales
   */
  error(message, data = {}) {
    if (!this.shouldLog('error')) return;
    
    const formattedMessage = this.formatMessage('error', message);
    
    if (this.options.enableConsole) {
      console.error(formattedMessage, data);
    }
    
    this.emitEvent('error', message, data);
    
    // Los errores siempre se envían al servidor si está habilitado
    this.sendRemoteLog('error', message, data);
  }

  /**
   * Registra un error de excepción
   * @param {Error} error - Objeto de error
   * @param {string} context - Contexto donde ocurrió el error
   */
  exception(error, context = '') {
    const message = context ? `${context}: ${error.message}` : error.message;
    
    this.error(message, {
      stack: error.stack,
      name: error.name
    });
  }
  
  /**
   * Registra una acción del usuario
   * @param {string} action - Acción realizada
   * @param {Object} details - Detalles de la acción
   */
  userAction(action, details = {}) {
    this.info(`Acción de usuario: ${action}`, details);
  }

  /**
   * Registra una petición HTTP
   * @param {string} method - Método HTTP
   * @param {string} url - URL de la petición
   * @param {number} statusCode - Código de estado
   * @param {number} duration - Duración en ms
   */
  httpRequest(method, url, statusCode, duration) {
    const level = statusCode >= 400 ? (statusCode >= 500 ? 'error' : 'warn') : 'info';
    const message = `${method} ${url} ${statusCode} ${duration}ms`;
    
    this[level](message, { statusCode, duration });
  }
  
  
  //  Captura errores globales no manejados 

  captureGlobalErrors() {
    window.addEventListener('error', (event) => {
      this.exception(event.error || new Error(event.message), 'Error global no capturado');
      // No prevenimos el comportamiento normal
    });
    
    window.addEventListener('unhandledrejection', (event) => {
      const error = event.reason instanceof Error ? 
        event.reason : new Error(String(event.reason));
      this.exception(error, 'Promesa rechazada no manejada');
    });
    
    console.log('Logger: Captura de errores globales activada');
  }
}
// Módulo para gestión de inscripciones
import { utilidades } from './main.js';
import logger from './utils/logger-init.js';
import notifications from './utils/notifications.js';

// Crear el controlador con namespace propio para evitar conflictos
const InscripcionesController = {
  // Estado interno
  procesando: false,
  
  /**
   * Procesar una nueva inscripción
   * @param {Event} evento - Evento del formulario
   * @param {Function} actualizarCharlas - Callback para actualizar lista de charlas
   */
  async procesarInscripcion(evento, actualizarCharlas) {
    evento.preventDefault();
    
    // Evitar múltiples envíos
    if (this.procesando) return;
    this.procesando = true;
    
    try {
      logger.debug('Iniciando proceso de inscripción');
      
      // Recopilar los datos del formulario
      const formData = this.recopilarDatosFormulario();
      if (!formData) {
        this.procesando = false;
        return;
      }
      
      // Notificar generación de inscripción
      if (window.EventBus) {
        window.EventBus.emit('inscripcion:generada', {
          nombre: formData.nombre,
          apellido: formData.apellido,
          dni: formData.dni,
          charla: formData.charla
        });
      }
      
      // Mostrar indicador de carga
      this.actualizarEstadoBoton(true, 'Enviando...');
      
      // Llamamos directamente al fetch para procesar la respuesta en un solo lugar
      const response = await fetch('/api/inscripcion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      // Registrar la petición
      logger.httpRequest('POST', '/api/inscripcion', response.status, 0);
      
      if (!response.ok) {
        // Si la respuesta no es exitosa, manejamos el error aquí
        const errorData = await response.json();
        const errorMsg = errorData.mensaje || errorData.error || 'Error en la inscripción';
        
        logger.error('Error en la respuesta del servidor', { 
          status: response.status,
          error: errorMsg 
        });

        // Mostrar mensaje específico según el tipo de error
        let tituloError = 'Error de inscripción';
        let mensajeUsuario = errorMsg;
        
        if (errorMsg.toLowerCase().includes('dni')) {
          tituloError = 'DNI ya registrado';
          mensajeUsuario = 'Este DNI ya está registrado en el sistema.';
        } else if (errorMsg.toLowerCase().includes('email')) {
          tituloError = 'Email ya registrado';
          mensajeUsuario = 'Este email ya está registrado en el sistema.';
        } else if (errorMsg.toLowerCase().includes('charla')) {
          tituloError = 'Problema con la charla';
          mensajeUsuario = 'La charla seleccionada no está disponible o ha alcanzado su capacidad máxima.';
        }
        
        notifications.error(mensajeUsuario, {
          duration: 8000,
          title: tituloError,
          showConfirmButton: true,
          confirmButtonText: 'Entendido',
          backdrop: true
        });
        
        throw new Error('HANDLED_' + errorMsg); // Prefijo para identificar errores ya manejados
      }
      
      // Si llegamos aquí, la respuesta fue exitosa
      const responseData = await response.json();
      logger.info('Inscripción procesada correctamente por el servidor', { 
        id: responseData.id,
        idCharla: responseData.idCharla 
      });
      
      // Procesar respuesta exitosa
      logger.info('Inscripción completada exitosamente', { idCharla: responseData.idCharla });
      notifications.success('¡Inscripción exitosa! Tu registro ha sido confirmado.', {
        title: '¡Enhorabuena!',
        duration: 6000,
        showConfirmButton: true,
        confirmButtonText: 'Aceptar',
        backdrop: true,
        callback: () => {
          // Volver a página de inicio cuando el usuario cierra la notificación
          utilidades.obtenerElemento('#inicio')?.scrollIntoView({ behavior: 'smooth' });
        }
      });
      
      this.limpiarFormulario();
      
      // Actualizar charlas si es necesario
      if (responseData.idCharla && typeof actualizarCharlas === 'function') {
        logger.debug('Actualizando lista de charlas');
        actualizarCharlas();
      }
      
      // Volver a página de inicio
      utilidades.obtenerElemento('#inicio')?.scrollIntoView({ behavior: 'smooth' });
      
    } catch (error) {
      // Solo registramos el error pero NO mostramos notificación
      // si ya fue manejado (para evitar duplicación)
      if (!error.message.startsWith('HANDLED_')) {
        logger.error('Error al procesar la inscripción', { 
          message: error.message, 
          stack: error.stack 
        });
        console.error('Error:', error);
        
        // Error de conexión u otro error no manejado previamente
        notifications.error('No se pudo procesar la inscripción. Comprueba tu conexión e inténtalo nuevamente.', {
          title: 'Error de conexión',
          duration: 8000,
          showConfirmButton: true,
          confirmButtonText: 'Entendido',
          backdrop: true
        });
      }
    } finally {
      // Restaurar estado del botón
      this.actualizarEstadoBoton(false, 'Inscribirme');
      this.procesando = false;
      logger.debug('Proceso de inscripción finalizado');
    }
  },
  
  /**
   * Recopila y valida los datos del formulario
   * @returns {Object|null} Datos validados o null si hay errores
   */
  recopilarDatosFormulario() {
    // Datos básicos
    const charlaSelect = utilidades.obtenerElemento("#charla");
    const charlaId = charlaSelect?.value;
    
    // Validar charla seleccionada
    if (!charlaId) {
      logger.warn('No se seleccionó ninguna charla');
      notifications.warning("Por favor selecciona una charla de la lista");
      return null;
    }
    
    // Datos personales
    const nombre = utilidades.obtenerElemento("#nombre")?.value?.trim() || "";
    const apellido = utilidades.obtenerElemento("#apellido")?.value?.trim() || "";
    const dni = utilidades.obtenerElemento("#dni")?.value?.trim() || "";
    const email = utilidades.obtenerElemento("#email")?.value?.trim() || "";
    const como_te_enteraste = utilidades.obtenerElemento("#como-te-enteraste")?.value || "";
    
    // Validar campos obligatorios
    if (!nombre || !apellido || !dni || !email || !como_te_enteraste) {
      logger.warn('Campos obligatorios incompletos', { 
        nombre: !!nombre, 
        apellido: !!apellido, 
        dni: !!dni, 
        email: !!email, 
        como_te_enteraste: !!como_te_enteraste 
      });
      notifications.warning("Por favor completa todos los campos obligatorios");
      return null;
    }
    
    // Validar email
    if (!this.validarEmail(email)) {
      logger.warn('Email inválido', { email });
      notifications.warning("Por favor ingresa un email válido");
      return null;
    }
    
    // Validar DNI (solo números)
    if (!this.validarDNI(dni)) {
      logger.warn('DNI inválido', { dni });
      notifications.warning("El DNI debe contener solo números");
      return null;
    }
    
    // Retornar objeto con datos validados
    logger.debug('Datos de formulario recopilados correctamente');
    return {
      id: utilidades.generarUUID(),
      nombre,
      apellido,
      dni,
      email,
      como_te_enteraste,
      charla: charlaId,
      fecha: new Date().toISOString()
    };
  },
  
  /**
   * Actualiza el estado del botón de envío
   * @param {boolean} deshabilitado - Estado de deshabilitación
   * @param {string} texto - Texto a mostrar
   */
  actualizarEstadoBoton(deshabilitado, texto) {
    const btnSubmit = utilidades.obtenerElemento("#btn-formulario");
    if (btnSubmit) {
      btnSubmit.disabled = deshabilitado;
      btnSubmit.textContent = texto;
      logger.debug(`Estado del botón actualizado: ${deshabilitado ? 'deshabilitado' : 'habilitado'}, texto: ${texto}`);
    }
  },
  
  /**
   * Limpia el formulario tras un envío exitoso
   */
  limpiarFormulario() {
    const form = utilidades.obtenerElemento("#inscripcionForm");
    if (form) {
      form.reset();
      logger.debug('Formulario reiniciado');
    }
  },
  
  /**
   * Valida el formato de un email
   * @param {string} email - Email a validar
   * @returns {boolean} Resultado de la validación
   */
  validarEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },
  
  /**
   * Valida que el DNI contenga solo números
   * @param {string} dni - DNI a validar
   * @returns {boolean} Resultado de la validación
   */
  validarDNI(dni) {
    return /^\d+$/.test(dni);
  },
  
  /**
   * Carga las opciones para el selector "cómo te enteraste"
   */
  async cargarOpcionesComoTeEnteraste() {
    try {
      logger.info('Cargando opciones para el selector "cómo te enteraste"');
      
      // Intentar obtener opciones del HTML o añadir predeterminadas
      const select = utilidades.obtenerElemento("#como-te-enteraste");
      if (!select) {
        logger.warn('No se encontró el selector "#como-te-enteraste"');
        return;
      }
      
      // Si ya tiene opciones, respetarlas
      const opcionesExistentes = select.querySelectorAll('option:not([value=""])');
      if (opcionesExistentes.length > 0) {
        logger.info(`Usando ${opcionesExistentes.length} opciones existentes en el HTML para 'cómo te enteraste'`);
        return;
      }
      
      logger.info('Añadiendo opciones predeterminadas para "cómo te enteraste"');
      
      // Opciones predeterminadas
      const opcionesPredeterminadas = [
        { id: 'RS01', descripcion: 'Redes Sociales' },
        { id: 'AM02', descripcion: 'Amigo/Familiar' },
        { id: 'EM03', descripcion: 'Email' },
        { id: 'WEB4', descripcion: 'Sitio Web' },
        { id: 'OT05', descripcion: 'Otro' }
      ];
      
      // Añadir opciones al select
      opcionesPredeterminadas.forEach(opcion => {
        const option = document.createElement('option');
        option.value = opcion.id;
        option.textContent = opcion.descripcion;
        select.appendChild(option);
      });
      
      logger.debug('Opciones predeterminadas añadidas correctamente');
    } catch (error) {
      logger.error('Error al configurar opciones de "cómo te enteraste"', {
        error: error.message,
        stack: error.stack
      });
      console.error("Error al configurar opciones de 'cómo te enteraste':", error);
    }
  },
  
  /**
   * Carga las charlas disponibles desde el servidor
   */
  async cargarCharlas() {
    logger.info('Cargando charlas disponibles');
    
    // Utilizar el controlador de charlas global si está disponible
    if (window.controladorCharlas?.inicializar) {
      logger.debug('Usando controlador de charlas global para cargar charlas');
      const charlas = await window.controladorCharlas.inicializar();
      logger.info(`Cargadas ${charlas?.length || 0} charlas correctamente`);
      return charlas;
    }
    
    logger.warn("Controlador de charlas no disponible, usando fallback");
    return [];
  },
  
  /**
   * Inicializa el controlador de inscripciones
   */
  async inicializar() {
    try {
      logger.info('Inicializando controlador de inscripciones');
      
      // Configurar opciones del formulario
      await this.cargarOpcionesComoTeEnteraste();
      
      if (typeof this.cargarCharlas === 'function') {
        await this.cargarCharlas();
      }
      
      logger.info("Controlador de inscripciones inicializado correctamente");
    } catch (error) {
      logger.error("Error al inicializar controlador de inscripciones", {
        error: error.message,
        stack: error.stack
      });
      console.error("Error al inicializar controlador:", error);
    }
  }
};

// Exportar para uso como módulo
export const controladorInscripciones = InscripcionesController;

// Auto-inicialización cuando se carga el documento
document.addEventListener('DOMContentLoaded', () => {
  logger.debug('Evento DOMContentLoaded recibido en inscriptos.js');
  
  setTimeout(() => {
    logger.debug('Intentando inicializar controlador de inscripciones');
    
    // Integrar con controlador global de manera segura
    if (window.controladorInscripciones) {
      logger.debug('Controlador global de inscripciones encontrado, extendiendo funcionalidad');
      
      // Preservar métodos existentes
      Object.entries(InscripcionesController).forEach(([key, value]) => {
        if (typeof value === 'function') {
          // Solo sobreescribir métodos
          window.controladorInscripciones[key] = value.bind(InscripcionesController);
        }
      });
    } else {
      logger.debug('Creando nuevo controlador global de inscripciones');
      // Crear nuevo controlador global
      window.controladorInscripciones = InscripcionesController;
    }
    
    // Inicializar
    if (window.controladorInscripciones.inicializar) {
      window.controladorInscripciones.inicializar();
    }
  }, 100); // Pequeño retraso para asegurar que main.js ya se ejecutó
});
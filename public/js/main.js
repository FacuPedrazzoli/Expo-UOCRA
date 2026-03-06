// Sistema centralizado para gestionar los datos y controladores de la aplicación
let DATOS = { charlas: [], empresas: {}, muestras: [], competiciones: {} };

// Importar sistema de notificaciones
import notifications from "./utils/notifications.js";

// Sistema de eventos para la comunicación entre módulos
const EventBus = {
  events: {},
  on(eventName, fn) {
    this.events[eventName] = this.events[eventName] || [];
    this.events[eventName].push(fn);
    return this;
  },
  off(eventName, fn) {
    if (this.events[eventName]) {
      if (fn) {
        this.events[eventName] = this.events[eventName].filter((f) => f !== fn);
      } else {
        delete this.events[eventName];
      }
    }
    return this;
  },
  emit(eventName, data) {
    if (this.events[eventName]) {
      this.events[eventName].forEach((fn) => fn(data));
    }
    return this;
  },
};

// Utilidades - Funciones auxiliares comunes
export const utilidades = {
  obtenerElemento: (selector) => document.querySelector(selector),
  obtenerElementos: (selector) => document.querySelectorAll(selector),
  generarUUID: () =>
    ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
      (
        c ^
        (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))
      ).toString(16),
    ),
  // Estado en memoria (sin persistencia en localStorage por seguridad y portabilidad)
  _cache: new Map(),
  guardarDatos: (clave, datos) => {
    utilidades._cache.set(clave, datos);
  },
  recuperarDatos: (clave, valorPredeterminado = []) => {
    return utilidades._cache.has(clave)
      ? utilidades._cache.get(clave)
      : valorPredeterminado;
  },
  // Cargar datos desde JSON con manejo de errores
  async cargarDatosJSON() {
    try {
      const response = await fetch("../js/data.json");
      if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
      const datos = await response.json();
      console.log("Datos cargados desde data.json");
      return datos;
    } catch (error) {
      console.error("Error al cargar data.json:", error);
      return {
        charlas: [
          {
            id: "default1",
            titulo: "Charla Predeterminada",
            horario: "10:00",
            empresa: "UOCRA",
            ubicacion: "Aula 1",
          },
        ],
        empresas: {
          construccion: [
            {
              nombre: "UOCRA",
              descripcion:
                "Fundación para la educación de los trabajadores constructores",
            },
          ],
        },
        muestras: [
          {
            numero: "1",
            muestra: "Muestra Predeterminada",
            ubicacion: "Entrada Principal",
          },
        ],
      };
    }
  },
  // Acceso directo al sistema de notificaciones
  notifications,
};

// Controlador de secciones - Gestiona la visualización de las diferentes secciones
export const controladorSecciones = {
  mostrarSeccion(id) {
    utilidades
      .obtenerElementos(".section")
      .forEach((section) => section.classList.remove("activa"));

    const seccion = utilidades.obtenerElemento(`#${id}`);
    if (!seccion) {
      console.error(`Sección no encontrada: #${id}`);
      return;
    }

    seccion.classList.add("activa");

    // Cerrar menú móvil si está abierto
    const menuMovil = utilidades.obtenerElemento("#main-nav");
    if (menuMovil?.classList.contains("active"))
      menuMovil.classList.remove("active");

    // Notificar cambio
    EventBus.emit("seccion:cambio", id);
  },

  mostrarFormulario() {
    this.mostrarSeccion("inscripcion");
    const formContainer = utilidades.obtenerElemento(".form-container");
    if (formContainer) formContainer.scrollIntoView({ behavior: "smooth" });
  },

  alternarMenu() {
    const menuPrincipal = utilidades.obtenerElemento("#main-nav");
    if (menuPrincipal) menuPrincipal.classList.toggle("active");
  },
};

// Controlador de charlas - Gestiona las charlas disponibles
export const controladorCharlas = {
  ultimasCharlas: null,
  cargando: false,

  async inicializar() {
    if (this.cargando) return;
    this.cargando = true;

    try {
      // Obtener charlas del servidor
      const response = await fetch("/api/inscripcion/charlas");

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const charlas = await response.json();

      // Si no hay charlas, usar las predefinidas
      if (!charlas || charlas.length === 0) {
        const charlasConIDs = DATOS.charlas.map((charla) => ({
          ...charla,
          id: charla.id || utilidades.generarUUID(),
        }));

        this.ultimasCharlas = charlasConIDs;
        this.actualizarInterfazCharlas(charlasConIDs);
        EventBus.emit("charlas:cargadas", charlasConIDs);
        return charlasConIDs;
      }

      this.ultimasCharlas = charlas;
      this.actualizarInterfazCharlas(charlas);
      EventBus.emit("charlas:cargadas", charlas);
      return charlas;
    } catch (error) {
      console.error("Error al cargar charlas:", error);

      const charlasLocales = DATOS.charlas.map((charla) => ({
        ...charla,
        id: charla.id || utilidades.generarUUID(),
      }));

      this.ultimasCharlas = charlasLocales;
      this.actualizarInterfazCharlas(charlasLocales);
      EventBus.emit("charlas:error", error);
      return charlasLocales;
    } finally {
      this.cargando = false;
    }
  },

  actualizarInterfazCharlas(charlas) {
    if (!charlas) return;
    this.actualizarTablaCharlas(charlas);
    this.actualizarSelectoresCharlas(charlas);
  },

  actualizarTablaCharlas(charlas) {
    const cuerpoTabla = utilidades.obtenerElemento("#charlas-lista");
    if (!cuerpoTabla) return;

    cuerpoTabla.innerHTML = "";

    charlas.forEach((charla) => {
      const fila = document.createElement("tr");

      ["horario", "titulo", "empresa", "ubicacion"].forEach((campo) => {
        const celda = document.createElement("td");
        celda.textContent = charla[campo] || "";
        fila.appendChild(celda);
      });

      cuerpoTabla.appendChild(fila);
    });
  },

  actualizarSelectoresCharlas(charlas) {
    const selectores = utilidades.obtenerElementos('select[id="charla"]');
    if (!selectores.length) return;

    selectores.forEach((selector) => {
      const valorActual = selector.value;
      selector.innerHTML = "";

      // Opción por defecto
      const opcionPredeterminada = document.createElement("option");
      opcionPredeterminada.value = "";
      opcionPredeterminada.textContent = "Selecciona una charla";
      opcionPredeterminada.selected = true;
      opcionPredeterminada.disabled = true;
      selector.appendChild(opcionPredeterminada);

      // Opciones de charlas
      charlas.forEach((charla) => {
        const opcion = document.createElement("option");
        opcion.value = charla.id || "";
        opcion.textContent = `${charla.horario} - ${charla.titulo}`;
        selector.appendChild(opcion);
      });

      if (valorActual) selector.value = valorActual;
    });
  },
};

// Controlador de empresas - Gestiona la visualización de empresas por categoría
export const controladorEmpresas = {
  mostrarEmpresasPorCategoria(categoria = "todas") {
    // Actualizar botón activo
    utilidades
      .obtenerElementos(".btn-categoria")
      .forEach((boton) => boton.classList.remove("active"));

    const botonActivo = utilidades.obtenerElemento(
      `.btn-categoria[data-categoria="${categoria}"]`,
    );
    if (botonActivo) botonActivo.classList.add("active");

    const contenedor = utilidades.obtenerElemento("#empresas-lista");
    if (!contenedor) return;

    contenedor.innerHTML = "";

    try {
      if (!DATOS || !DATOS.empresas) {
        contenedor.innerHTML = "<p>No hay datos de empresas disponibles</p>";
        return;
      }

      if (categoria === "todas") {
        // Mostrar todas las empresas
        Object.values(DATOS.empresas).forEach((empresasCategoria) => {
          if (Array.isArray(empresasCategoria)) {
            empresasCategoria.forEach((empresa) =>
              contenedor.appendChild(this.crearTarjetaEmpresa(empresa)),
            );
          }
        });
      } else {
        // Mostrar por categoría específica
        const empresas = DATOS.empresas[categoria] || [];
        if (empresas.length === 0) {
          contenedor.innerHTML = `<p>No hay empresas en la categoría: ${categoria}</p>`;
        } else {
          empresas.forEach((empresa) =>
            contenedor.appendChild(this.crearTarjetaEmpresa(empresa)),
          );
        }
      }

      EventBus.emit("empresas:mostradas", categoria);
    } catch (error) {
      console.error("Error al mostrar empresas:", error);
      contenedor.innerHTML = "<p>Error al cargar las empresas</p>";
      EventBus.emit("empresas:error", error);
    }
  },

  crearTarjetaEmpresa(empresa) {
    const tarjeta = document.createElement("div");
    tarjeta.className = "empresa-card";

    tarjeta.innerHTML = `
      <img src="${empresa.logo || "img/placeholder-logo.png"}" alt="Logo de ${empresa.nombre}" class="empresa-logo" loading="lazy" onerror="this.src='img/placeholder-logo.png'" />
      <p><strong>${empresa.nombre}</strong></p>
      <p>${empresa.descripcion || ""}</p>
      ${empresa.url ? `<a href="${empresa.url}" target="_blank" class="btn-visitar">Visitar sitio web</a>` : ""}
    `;

    // Hacer la tarjeta clickeable si hay URL
    if (empresa.url) {
      tarjeta.style.cursor = "pointer";
      tarjeta.addEventListener("click", (e) => {
        if (!e.target.classList.contains("btn-visitar")) {
          window.open(empresa.url, "_blank");
        }
      });
    }

    return tarjeta;
  },
};

// Controlador de muestras/stands
export const controladorMuestras = {
  inicializar() {
    this.actualizarMuestras();
  },

  actualizarMuestras() {
    const contenedorStands = utilidades.obtenerElemento("#stands-container");
    if (!contenedorStands) return;

    contenedorStands.innerHTML = "";

    try {
      if (!DATOS?.muestras?.length) {
        contenedorStands.innerHTML = "<p>No hay muestras disponibles</p>";
        return;
      }

      DATOS.muestras.forEach((stand) => {
        contenedorStands.appendChild(this.crearElementoStand(stand));
      });

      EventBus.emit("muestras:actualizadas", DATOS.muestras);
    } catch (error) {
      console.error("Error al mostrar muestras:", error);
      contenedorStands.innerHTML = "<p>Error al cargar las muestras</p>";
      EventBus.emit("muestras:error", error);
    }
  },

  crearElementoStand(stand) {
    const standItem = document.createElement("div");
    standItem.className = "stand-item";
    standItem.innerHTML = `
      <div class="stand-number">${stand.numero}</div>
      <div class="stand-info">
        <h4>${stand.muestra}</h4>
        <p>${stand.ubicacion}</p>
      </div>
    `;
    return standItem;
  },
};

// Controlador de competiciones
export const controladorCompeticiones = {
  competicionesActuales: null,

  inicializar() {
    if (!DATOS?.competiciones) {
      console.error("No hay datos de competiciones disponibles");
      return;
    }

    this.filtrarCompeticiones("todas");
  },

  filtrarCompeticiones(categoria = "todas") {
    // Actualizar botón activo
    utilidades.obtenerElementos(".btn-categoria").forEach((boton) => {
      if (boton.getAttribute("onclick")?.includes("filtrarCompeticiones")) {
        boton.classList.remove("active");
      }
    });

    const botonActivo = utilidades.obtenerElemento(
      `.btn-categoria[onclick*="filtrarCompeticiones('${categoria}')"]`,
    );
    if (botonActivo) botonActivo.classList.add("active");

    const contenedor = utilidades.obtenerElemento("#competiciones-lista");
    if (!contenedor) return;

    contenedor.innerHTML = "";

    try {
      let competicionesAMostrar = [];

      if (categoria === "todas") {
        // Mostrar todas las competiciones
        Object.values(DATOS.competiciones).forEach((categoriasComp) => {
          if (Array.isArray(categoriasComp)) {
            competicionesAMostrar = [
              ...competicionesAMostrar,
              ...categoriasComp,
            ];
          }
        });
      } else {
        // Mostrar por categoría específica
        competicionesAMostrar = DATOS.competiciones[categoria] || [];
      }

      if (competicionesAMostrar.length === 0) {
        contenedor.innerHTML = `<p class="no-competiciones">No hay competiciones en la categoría: ${categoria}</p>`;
        return;
      }

      competicionesAMostrar.forEach((competicion) => {
        contenedor.appendChild(this.crearTarjetaCompeticion(competicion));
      });

      this.competicionesActuales = competicionesAMostrar;
      EventBus.emit("competiciones:mostradas", categoria);
    } catch (error) {
      console.error("Error al mostrar competiciones:", error);
      contenedor.innerHTML = "<p>Error al cargar las competiciones</p>";
      EventBus.emit("competiciones:error", error);
    }
  },

  crearTarjetaCompeticion(competicion) {
    const tarjeta = document.createElement("div");
    tarjeta.className = "competicion-card";

    tarjeta.innerHTML = `
      <div class="competicion-imagen">
        <img src="${competicion.imagen || "img/placeholder-competicion.png"}" 
             alt="${competicion.titulo}" 
             loading="lazy"
             onerror="this.src='../img/logo_expo.png'">
      </div>
      <div class="competicion-info">
        <h3>${competicion.titulo}</h3>
        <p class="competicion-descripcion">${competicion.descripcion || "Sin descripción disponible"}</p>
        <div class="competicion-detalles">
          <p><i class="fas fa-clock"></i> <strong>Horario:</strong> ${competicion.horario}</p>
          <p><i class="fas fa-map-marker-alt"></i> <strong>Ubicación:</strong> ${competicion.ubicacion}</p>
        </div>
      </div>
    `;

    return tarjeta;
  },
};

// Controlador de inscripciones - Gestiona las inscripciones a charlas
export const controladorInscripciones = {
  async cargarOpcionesComoTeEnteraste() {
    try {
      const response = await fetch("/api/inscripcion/como-te-enteraste");

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const opciones = await response.json();
      const selector = utilidades.obtenerElemento("#como-te-enteraste");
      if (!selector) return;

      // Conservar la opción seleccionada actual
      const valorActual = selector.value;
      selector.innerHTML = "";

      // Opción predeterminada
      const opcionPredeterminada = document.createElement("option");
      opcionPredeterminada.value = "";
      opcionPredeterminada.textContent = "¿Cómo te enteraste de este evento?";
      opcionPredeterminada.selected = true;
      opcionPredeterminada.disabled = true;
      selector.appendChild(opcionPredeterminada);

      // Agregar opciones
      opciones.forEach((opcion) => {
        const elemento = document.createElement("option");
        elemento.value = opcion.id || opcion.descripcion;
        elemento.textContent = opcion.descripcion;
        selector.appendChild(elemento);
      });

      if (valorActual) selector.value = valorActual;

      EventBus.emit("opciones:cargadas", opciones);
      return opciones;
    } catch (error) {
      console.error("Error al cargar opciones de cómo te enteraste:", error);

      // Opciones predeterminadas en caso de error
      const opcionesPredeterminadas = [
        { id: "RS01", descripcion: "Redes Sociales" },
        { id: "AM02", descripcion: "Amigo/Familiar" },
        { id: "EM03", descripcion: "Email" },
        { id: "WEB4", descripcion: "Sitio Web" },
        { id: "OT05", descripcion: "Otro" },
      ];

      // Actualizar el selector con opciones predeterminadas
      const selector = utilidades.obtenerElemento("#como-te-enteraste");
      if (!selector) return opcionesPredeterminadas;

      const valorActual = selector.value;
      selector.innerHTML = "";

      const opcionPredeterminada = document.createElement("option");
      opcionPredeterminada.value = "";
      opcionPredeterminada.textContent = "¿Cómo te enteraste de este evento?";
      opcionPredeterminada.selected = true;
      opcionPredeterminada.disabled = true;
      selector.appendChild(opcionPredeterminada);

      opcionesPredeterminadas.forEach((opcion) => {
        const elemento = document.createElement("option");
        elemento.value = opcion.id;
        elemento.textContent = opcion.descripcion;
        selector.appendChild(elemento);
      });

      if (valorActual) selector.value = valorActual;

      EventBus.emit("opciones:error", error);
      return opcionesPredeterminadas;
    }
  },

  async procesarInscripcion(evento, callback) {
    evento.preventDefault();

    const formulario = utilidades.obtenerElemento("#inscripcionForm");
    if (!formulario) {
      console.error("No se encontró el formulario de inscripción");
      return;
    }

    try {
      const btnSubmit = utilidades.obtenerElemento("#btn-formulario");
      if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.textContent = "Enviando...";
      }

      // Recopilar los datos del formulario
      const nombre = utilidades.obtenerElemento("#nombre").value.trim();
      const apellido = utilidades.obtenerElemento("#apellido").value.trim();
      const dni = utilidades.obtenerElemento("#dni").value.trim();
      const email = utilidades.obtenerElemento("#email").value.trim();
      const como_te_enteraste =
        utilidades.obtenerElemento("#como-te-enteraste").value;
      const charlaId = utilidades.obtenerElemento("#charla").value;

      // Validar datos mínimos
      if (
        !nombre ||
        !apellido ||
        !email ||
        !dni ||
        !como_te_enteraste ||
        !charlaId
      ) {
        notifications.warning(
          "Por favor, completa todos los campos obligatorios",
          {
            title: "Campos incompletos",
            showConfirmButton: true,
            confirmButtonText: "Entendido",
            backdrop: true,
          },
        );

        if (btnSubmit) {
          btnSubmit.disabled = false;
          btnSubmit.textContent = "Enviar";
        }
        return;
      }

      // Validaciones simples
      if (!email.includes("@") || !email.includes(".")) {
        notifications.warning("Por favor ingresa un email válido", {
          title: "Email inválido",
          showConfirmButton: true,
          confirmButtonText: "Entendido",
          backdrop: true,
        });

        if (btnSubmit) {
          btnSubmit.disabled = false;
          btnSubmit.textContent = "Enviar";
        }
        return;
      }

      if (!/^\d+$/.test(dni)) {
        notifications.warning("El DNI debe contener solo números", {
          title: "DNI inválido",
          showConfirmButton: true,
          confirmButtonText: "Entendido",
          backdrop: true,
        });

        if (btnSubmit) {
          btnSubmit.disabled = false;
          btnSubmit.textContent = "Enviar";
        }
        return;
      }

      // Datos para enviar
      const datosInscripcion = {
        id: utilidades.generarUUID(),
        nombre,
        apellido,
        dni,
        email,
        como_te_enteraste,
        charla: charlaId,
        fecha: new Date().toISOString(),
      };

      // Enviar al servidor
      const response = await fetch("/api/inscripcion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datosInscripcion),
      });

      if (!response.ok) {
        const errorData = await response.json();
        // Obtener el mensaje de error específico del servidor
        const mensajeError =
          errorData.mensaje || errorData.error || "Error en la inscripción";
        console.error("Error del servidor:", errorData);

        // Determinar el tipo de error para mostrar un mensaje apropiado
        let tituloError = "Error de inscripción";
        let mensajeUsuario = mensajeError;

        // Personalizar el mensaje según el tipo de error
        if (mensajeError.toLowerCase().includes("dni")) {
          tituloError = "DNI ya registrado";
          mensajeUsuario = "Este DNI ya está registrado en el sistema.";
        } else if (mensajeError.toLowerCase().includes("email")) {
          tituloError = "Email ya registrado";
          mensajeUsuario = "Este email ya está registrado en el sistema.";
        } else if (mensajeError.toLowerCase().includes("charla")) {
          tituloError = "Problema con la charla";
          mensajeUsuario =
            "La charla seleccionada no está disponible o ha alcanzado su capacidad máxima.";
        }

        notifications.error(mensajeUsuario, {
          title: tituloError,
          showConfirmButton: true,
          confirmButtonText: "Entendido",
          backdrop: true,
        });

        if (btnSubmit) {
          btnSubmit.disabled = false;
          btnSubmit.textContent = "Enviar";
        }

        // Importante: retornamos aquí para evitar mostrar el segundo error
        return;
      }

      const resultado = await response.json();

      // Éxito
      notifications.success(
        "¡Inscripción exitosa! Te esperamos en el evento.",
        {
          title: "¡Enhorabuena!",
          duration: 6000,
          showConfirmButton: true,
          confirmButtonText: "Aceptar",
          backdrop: true,
          callback: () => {
            // Volver a página de inicio cuando el usuario cierra la notificación
            utilidades
              .obtenerElemento("#inicio")
              ?.scrollIntoView({ behavior: "smooth" });
          },
        },
      );

      formulario.reset();

      if (typeof callback === "function") callback();

      EventBus.emit("inscripcion:exitosa", resultado);
    } catch (error) {
      // Registrar el error completo en la consola para los desarrolladores
      console.error("Error al procesar la inscripción:", error);

      // Solo mostrar error de conexión si no se ha mostrado ya un error específico
      if (error.name === "TypeError") {
        notifications.error(
          "No se pudo procesar la inscripción. Comprueba tu conexión e inténtalo más tarde.",
          {
            title: "Error de conexión",
            duration: 8000,
            showConfirmButton: true,
            confirmButtonText: "Entendido",
            backdrop: true,
          },
        );
      }

      EventBus.emit("inscripcion:error", error);
    } finally {
      const btnSubmit = utilidades.obtenerElemento("#btn-formulario");
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.textContent = "Enviar";
      }
    }
  },
};

// Inicialización de la aplicación
let appInicializada = false;

async function inicializarApp() {
  if (appInicializada) return;

  try {
    // Cargar datos desde data.json
    DATOS = await utilidades.cargarDatosJSON();

    // Exponer controladores globalmente
    window.controladorEmpresas = controladorEmpresas;
    window.controladorMuestras = controladorMuestras;
    window.controladorCharlas = controladorCharlas;
    window.controladorSecciones = controladorSecciones;
    window.controladorInscripciones = controladorInscripciones;
    window.controladorCompeticiones = controladorCompeticiones;
    window.AppEventBus = EventBus;

    // Hacer accesible el sistema de notificaciones globalmente
    window.notifications = notifications;

    // Inicializar controladores
    await controladorCharlas.inicializar();
    controladorMuestras.inicializar();
    controladorCompeticiones.inicializar();
    await controladorInscripciones.cargarOpcionesComoTeEnteraste();

    // Definir funciones globales si no existen
    if (!window.mostrarSeccion)
      window.mostrarSeccion = (id) => controladorSecciones.mostrarSeccion(id);
    if (!window.mostrarFormulario)
      window.mostrarFormulario = () => controladorSecciones.mostrarFormulario();
    if (!window.alternarMenu)
      window.alternarMenu = () => controladorSecciones.alternarMenu();
    if (!window.mostrarEmpresas)
      window.mostrarEmpresas = (categoria) =>
        controladorEmpresas.mostrarEmpresasPorCategoria(categoria);
    if (!window.filtrarCompeticiones)
      window.filtrarCompeticiones = (categoria) =>
        controladorCompeticiones.filtrarCompeticiones(categoria);

    // Marcar como inicializada y notificar
    appInicializada = true;
    EventBus.emit("app:inicializada", true);
    console.log("Aplicación inicializada correctamente");
  } catch (error) {
    console.error("Error al inicializar la aplicación:", error);
    EventBus.emit("app:error", error);
  }
}

// Inicializar cuando se carga el documento
document.addEventListener("DOMContentLoaded", inicializarApp);

// Exportar EventBus
export { EventBus };

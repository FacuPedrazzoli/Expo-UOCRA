# Proyecto Expo Formación

## Descripción General

Este repositorio contiene una aplicación web para la gestión de la "Expo Formación", un evento centrado en el sector de la construcción que reúne charlas, empresas y muestras para los interesados. La aplicación permite la visualización de información del evento y la inscripción de participantes a las charlas disponibles.

## Estructura del Proyecto

```
proyectoexpo/
├── .env                    # Variables de entorno para configuración
├── public/                 # Archivos públicos accesibles desde el navegador
│   ├── css/                # Hojas de estilo
│   ├── html/               # Archivos HTML
│   ├── img/                # Imágenes y recursos visuales
│   └── js/                 # Scripts del cliente
│       ├── app.js          # Funcionalidades básicas de la UI
│       ├── data.json       # Datos estáticos para el cliente
│       ├── inscriptos.js   # Controlador de inscripciones
│       └── main.js         # Sistema principal de controladores
├── sql/                    # Scripts SQL para la base de datos
│   └── script_azu_ver1.sql # Definición de tablas y datos iniciales
└── src/                    # Código fuente del servidor
    ├── index.ts            # Punto de entrada de la aplicación
    ├── model/              # Definición de modelos de datos
    │   └── inscripcion.ts  # Modelo de inscripción
    ├── routes/             # Rutas/endpoints de la API
    │   ├── inscriptos.ts   # API para gestión de inscripciones
    │   ├── mesa-de-entrada.ts
    │   └── querys.ts
    └── tools/              # Utilidades y herramientas
        └── insertar-inscriptos.js # Generador de datos de prueba
```

## Características Principales

- **Visualización de charlas:** Muestra la programación de charlas con horarios, ubicaciones y empresas.
- **Catálogo de empresas:** Exhibe información sobre empresas participantes organizadas por categorías.
- **Sistema de inscripción:** Formulario para inscribirse a las charlas disponibles.
- **Mapa de muestras:** Visualización de stands y ubicaciones de las muestras del evento.
- **Panel administrativo:** Área para validar inscripciones de participantes.
- **Diseño responsive:** Adaptado a dispositivos móviles y de escritorio.

## Tecnologías Utilizadas

- **Frontend:**
  - HTML5, CSS3, JavaScript
  - Diseño modular con controladores específicos
  - Sistema de eventos para comunicación entre módulos

- **Backend:**
  - Node.js con TypeScript
  - Express para el servidor API
  - MySQL para la base de datos

- **Herramientas:**
  - Jest para pruebas unitarias
  - dotenv para gestión de variables de entorno

## Base de Datos

La aplicación utiliza MySQL con las siguientes tablas principales:
- `inscriptos`: Almacena información de los participantes inscritos
- `charlas`: Contiene las charlas programadas para el evento
- `como_te_enteraste_tbl`: Opciones para el campo "Cómo te enteraste"
- `inscripciones_charlas`: Relación entre inscriptos y charlas
- `colaboradores`: Datos de colaboradores/presentadores

## Configuración y Ejecución

### Requisitos Previos
- Node.js (v14 o superior)
- MySQL Server (v5.7 o superior)
- npm o yarn

### Instalación

1. Clonar el repositorio:
```bash
git clone <url-del-repositorio>
cd proyectoexpo
```

2. Instalar dependencias:
```bash
npm install
```

3. Configurar el archivo `.env`:
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=inscripciones
DB_PORT=3306
PORT=3000
```

4. Inicializar la base de datos:
```bash
mysql -u root < sql/script_azu_ver1.sql
```

### Ejecución

- Iniciar el servidor:
```bash
npm start
```

- Generar datos de prueba:
```bash
npm run start -- inscriptos 50
```

- Insertar charlas desde data.json:
```bash
npm run start -- charlas
```

## API Endpoints

- `POST /api/inscripcion`: Registra una nueva inscripción
- `GET /api/inscripcion/charlas`: Obtiene todas las charlas disponibles
- `GET /api/inscripcion/como-te-enteraste`: Obtiene opciones para "cómo te enteraste"

## Flujo de Usuario

1. El usuario accede a la página principal donde visualiza información general del evento
2. Puede explorar las charlas programadas, empresas participantes y muestras abiertas
3. Para inscribirse, el usuario completa un formulario con:
   - Datos personales (nombre, apellido, DNI, email)
   - Selección de charla
   - Cómo se enteró del evento
4. Tras la inscripción exitosa, recibe confirmación y puede volver a la página principal

## Contribución

Para contribuir al proyecto:
1. Crea un fork del repositorio
2. Crea una rama para tu funcionalidad (`git checkout -b feature/nueva-funcionalidad`)
3. Realiza tus cambios y commits (`git commit -am 'Añade nueva funcionalidad'`)
4. Envía los cambios a tu fork (`git push origin feature/nueva-funcionalidad`)
5. Crea un Pull Request

## Licencia

Este proyecto es propiedad de UOCRA Formación y está destinado para uso interno en la gestión de eventos.

## Autores

- Equipo de desarrollo de UOCRA Formación

---

*© 2025 Expo Formación*
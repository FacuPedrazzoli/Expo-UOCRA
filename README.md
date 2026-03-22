# Proyecto Expo Formación

## Descripción General

Este repositorio contiene una aplicación web para la gestión de la "Expo Formación", un evento centrado en el sector de la construcción que reúne charlas, empresas y muestras para los interesados. La aplicación permite la visualización de información del evento y la inscripción de participantes a las charlas disponibles.

## Estructura del Proyecto

```
expo-uocra/
├── .env                    # Variables de entorno para configuración
├── public/                 # Archivos públicos accesibles desde el navegador
│   ├── css/                # Hojas de estilo
│   ├── html/               # Archivos HTML
│   ├── img/                # Imágenes y recursos visuales
│   └── js/                 # Scripts del cliente
│       ├── app.js          # Funcionalidades principales de la UI
│       ├── enhancements.js # Mejoras visuales (sticky nav, counters)
│       ├── validacion.js   # Script del panel de validación
│       ├── data.json       # Datos estáticos de empresas
│       └── utils/          # Utilidades del cliente
├── src/                    # Código fuente del servidor
│   ├── app.ts             # Factory de configuración Express
│   ├── index.ts           # Punto de entrada para Vercel
│   ├── server.ts          # Servidor standalone
│   ├── vercel.ts          # Configuración Vercel/Serverless
│   ├── config/            # Configuración
│   │   └── env.ts         # Variables de entorno
│   ├── database/          # Conexión a base de datos
│   │   └── database.ts    # Pool de PostgreSQL
│   ├── model/             # Definición de modelos de datos
│   │   └── inscripcion.ts # Modelo(TypeScript) de inscripción
│   ├── routes/            # Rutas/endpoints de la API
│   │   ├── inscriptos.ts  # API para gestión de inscripciones
│   │   └── validacion.ts  # API para validación de inscriptos
│   └── utils/             # Utilidades del servidor
│       ├── logger.ts      # Sistema de logs
│       ├── middleware.ts  # Middlewares (rate limit, CORS, etc.)
│       └── sanitize.ts    # Sanitización de inputs
└── sql/                    # Scripts SQL para la base de datos
```

## Características Principales

- **Visualización de charlas:** Muestra la programación de charlas con horarios, ubicaciones y empresas.
- **Catálogo de empresas:** Exhibe información sobre empresas participantes organizadas por categorías.
- **Sistema de inscripción:** Formulario para inscribirse a las charlas disponibles.
- **Mapa de muestras:** Visualización de stands y ubicaciones de las muestras del evento.
- **Panel administrativo:** Área para validar inscripciones de participantes.
- **Diseño responsive:** Adaptado a dispositivos móviles y de escritorio.
- **Optimizado para serverless:** Compatible con Vercel y entornos serverless.

## Tecnologías Utilizadas

- **Frontend:**
  - HTML5, CSS3, JavaScript (ES Modules)
  - Diseño modular con scripts separados
  - Intersection Observer para animaciones

- **Backend:**
  - Node.js con TypeScript
  - Express para el servidor API
  - PostgreSQL (Supabase) para la base de datos
  - Compatibilidad con serverless (Vercel)

- **Herramientas:**
  - dotenv para gestión de variables de entorno
  - TypeScript para tipado estático
  - express-rate-limit para protección de rutas

## Base de Datos

La aplicación utiliza PostgreSQL (Supabase) con las siguientes tablas principales:
- `inscriptos`: Almacena información de los participantes inscritos
- `charlas`: Contiene las charlas programadas para el evento
- `como_te_enteraste`: Opciones para el campo "Cómo te enteraste"
- `inscriptos_charlas`: Relación muchos a muchos entre inscriptos y charlas
- `inscriptos_ingresos`: Historial de ingresos/validaciones
- `usuarios`: Usuarios del sistema de validación
- `empresas`: Empresas participantes del evento
- `muestras`: Stands y ubicaciones de muestras
- `competiciones`: Competiciones del evento

## Configuración y Ejecución

### Requisitos Previos
- Node.js (v18 o superior)
- PostgreSQL (o cuenta de Supabase)
- npm

### Instalación

1. Clonar el repositorio:
```bash
git clone <url-del-repositorio>
cd expo-uocra
```

2. Instalar dependencias:
```bash
npm install
```

3. Configurar el archivo `.env`:
```
DATABASE_URL=postgresql://user:password@host:5432/dbname
NODE_ENV=development
PORT=3000
```

4. Compilar TypeScript:
```bash
npm run build
```

### Ejecución

- Iniciar el servidor en desarrollo:
```bash
npm run dev
```

- Iniciar el servidor en producción:
```bash
npm start
```

- Verificar compilación TypeScript:
```bash
npm run build
```

## API Endpoints

### Inscripción
- `POST /api/inscripcion`: Registra una nueva inscripción
- `GET /api/inscripcion/charlas`: Obtiene todas las charlas disponibles
- `GET /api/inscripcion/como-te-enteraste`: Obtiene opciones para "cómo te enteraste"
- `POST /api/inscripcion/logs`: Envía logs del cliente

### Validación
- `GET /api/validacion/buscar?dni=XXX`: Busca inscripto por DNI
- `PATCH /api/validacion/validar`: Marca al inscripto como validado

### Utility
- `GET /health`: Health check del servidor

## URL de Producción

- **Sitio principal:** https://expoformacionuocra.org/
- **Panel de validación:** https://expoformacionuocra.org/admin-validacion

## Flujo de Usuario

1. El usuario accede a la página principal donde visualiza información general del evento
2. Puede explorar las charlas programadas, empresas participantes y muestras abiertas
3. Para inscribirse, el usuario completa un formulario con:
   - Datos personales (nombre, apellido, DNI, email)
   - Selección de charlas (puede seleccionar múltiples)
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

*© 2026 Expo Formación*
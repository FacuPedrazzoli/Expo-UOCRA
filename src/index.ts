import 'dotenv/config'
import express from "express";
import path from "path";
import cors from "cors";
import inscriptosRouter from "./routes/inscriptos";
import { execSync } from 'child_process';
import logger, { logError } from './utils/logger';

// Get command line arguments
const comando = process.argv[2] || 'servidor';
const parametros = process.argv.slice(3);

// Main entry point with switch structure
switch (comando) {
  case 'servidor':
    logger.info('Iniciando el servidor HTTP...');
    // Direct server initialization
    const app = express();
    const PORT = process.env.PORT || 3000;

    // Middleware configuration - Eliminar log de peticiones HTTP
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(cors());

    // Static and API routes
    app.use(express.static(path.join(__dirname, "../public")));
    app.use("/api/inscripcion", inscriptosRouter);

    app.get("/", (req, res) => {
      res.sendFile(path.join(__dirname, "../public/html/index.html"));
    });

    // Start the server
    app.listen(PORT, () => {
      logger.info(`Servidor HTTP iniciado en http://localhost:${PORT}`);
    }).on('error', (error) => {
      logError('Error starting server', error);
      process.exit(1);
    });
    break;

  case 'charlas':
    logger.info('Insertando charlas en la base de datos...');
    const forceReplace = parametros.includes('--force') ? ' --force' : '';
    const scriptPathCharlas = path.join(__dirname, 'tools', 'insertar-charlas.js');
    try {
      execSync(`node ${scriptPathCharlas}${forceReplace}`, { stdio: 'inherit' });
    } catch (error) {
      logError('Error al insertar charlas', error);
      process.exit(1);
    }
    break;

  case 'inscriptos':
    const cantidad = parametros.length > 0 && !parametros[0].startsWith('--') ? parametros[0] : '50';
    logger.info(`Generando ${cantidad} inscriptos de prueba...`);
    const scriptPathInscriptos = path.join(__dirname, 'tools', 'insertar-inscriptos.js');
    try {
      execSync(`node ${scriptPathInscriptos} ${cantidad}`, { stdio: 'inherit' });
    } catch (error) {
      logError('Error al generar inscriptos de prueba', error);
      process.exit(1);
    }
    break;

  default:
    logger.info(`
Uso: npm run start [comando] [parámetros]

Comandos disponibles:

servidor               - Inicia el servidor HTTP (valor predeterminado)
charlas [--force]      - Inserta charlas desde data.json en la base de datos
                        (--force: reemplaza charlas existentes sin preguntar)
inscriptos [cantidad]  - Genera la cantidad especificada de inscriptos aleatorios
                        (default: 50)`);
}
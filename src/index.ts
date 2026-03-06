import 'dotenv/config'
import path from "path";
import { execSync } from 'child_process';
import logger, { logError } from './utils/logger';
import startServer from './server';

// Get command line arguments
const comando = process.argv[2] || 'servidor';
const parametros = process.argv.slice(3);

// Main entry point with switch structure
switch (comando) {
  case 'servidor':
    logger.info('Iniciando el servidor HTTP...');
    startServer();
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
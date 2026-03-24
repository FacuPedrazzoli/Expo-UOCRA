import path from 'path';
import express from 'express';
import { createApp } from './app';

const app = createApp(true);

const isVercel = !!process.env.VERCEL;
const publicPath = isVercel 
  ? path.join(process.cwd(), 'public')
  : path.join(__dirname, '../../public');

console.log('[Vercel] isVercel:', isVercel);
console.log('[Vercel] process.cwd():', process.cwd());
console.log('[Vercel] publicPath:', publicPath);

app.use('/css', express.static(path.join(publicPath, 'css')));
app.use('/js', express.static(path.join(publicPath, 'js')));
app.use('/img', express.static(path.join(publicPath, 'img')));

app.get('/', (_req, res) => {
  const indexPath = path.join(publicPath, 'html', 'index.html');
  console.log('[Vercel] Serving index from:', indexPath);
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error('[Vercel] Error serving index:', err);
      res.status(500).json({ error: 'Ruta no encontrada', details: err.message });
    }
  });
});

app.get('/admin-validacion', (_req, res) => {
  const validacionPath = path.join(publicPath, 'html', 'validacion.html');
  console.log('[Vercel] Serving validacion from:', validacionPath);
  res.sendFile(validacionPath, (err) => {
    if (err) {
      console.error('[Vercel] Error serving validacion:', err);
      res.status(500).json({ error: 'Ruta no encontrada' });
    }
  });
});

app.get('/estadisticas', (_req, res) => {
  const estadisticasPath = path.join(publicPath, 'html', 'estadisticas.html');
  console.log('[Vercel] Serving estadisticas from:', estadisticasPath);
  res.sendFile(estadisticasPath, (err) => {
    if (err) {
      console.error('[Vercel] Error serving estadisticas:', err);
      res.status(500).json({ error: 'Ruta no encontrada' });
    }
  });
});

app.get('*', (_req, res) => {
  const indexPath = path.join(publicPath, 'html', 'index.html');
  console.log('[Vercel] Catch-all, serving:', indexPath);
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error('[Vercel] Error in catch-all:', err);
      res.status(500).json({ error: 'Ruta no encontrada', details: err.message });
    }
  });
});

export default app;
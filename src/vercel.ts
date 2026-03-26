import path from 'path';
import express from 'express';
import { createApp } from './app';

const app = createApp(true);

// Usar __dirname siempre — funciona tanto en Vercel como en local
// En build/, __dirname es /var/task/src (Vercel) o /ruta/proyecto/build/src (local)
// public/ siempre está un nivel arriba del directorio compilado
const publicPath = path.join(__dirname, '..', 'public');

// 1. Archivos estáticos — deben ir ANTES de cualquier catch-all
app.use('/css', express.static(path.join(publicPath, 'css'), {
  maxAge: '7d',
  etag: true,
}));
app.use('/js', express.static(path.join(publicPath, 'js'), {
  maxAge: '7d',
  etag: true,
}));
app.use('/img', express.static(path.join(publicPath, 'img'), {
  maxAge: '7d',
  etag: true,
}));

// 2. Rutas HTML específicas
app.get('/', (_req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(path.join(publicPath, 'html', 'index.html'));
});

app.get('/admin-validacion', (_req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(path.join(publicPath, 'html', 'validacion.html'));
});

app.get('/estadisticas', (_req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(path.join(publicPath, 'html', 'estadisticas.html'));
});

// 3. SPA fallback — cualquier ruta no resuelta sirve index.html
//    Excluir rutas /api/ para que no interfiera con el errorHandler de Express
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return next();
  }
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(path.join(publicPath, 'html', 'index.html'));
});

export default app;

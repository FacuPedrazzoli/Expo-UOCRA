import path from 'path';
import express from 'express';
import { createApp } from './app';

const app = createApp(true);

// En Vercel el filesystem tiene los archivos en una ubicación
// relativa al bundle. Servir public/ como fallback por si las
// rutas estáticas de vercel.json no resuelven.
const publicPath = path.join(__dirname, '..', 'public');

app.use('/css', express.static(path.join(publicPath, 'css')));
app.use('/js', express.static(path.join(publicPath, 'js')));
app.use('/img', express.static(path.join(publicPath, 'img')));

app.get('/', (_req, res) => {
  res.sendFile(path.join(publicPath, 'html', 'index.html'));
});

app.get('/admin-validacion', (_req, res) => {
  res.sendFile(path.join(publicPath, 'html', 'validacion.html'));
});

app.get('/estadisticas', (_req, res) => {
  res.sendFile(path.join(publicPath, 'html', 'estadisticas.html'));
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(publicPath, 'html', 'index.html'));
});

export default app;
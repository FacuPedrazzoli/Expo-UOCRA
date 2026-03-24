import path from 'path';
import express from 'express';
import { createApp } from './app';

const app = createApp(true);

const isVercel = !!process.env.VERCEL;
const baseDir = isVercel 
  ? path.join(process.cwd())  // /var/task or project root
  : path.join(__dirname, '..');

const publicPath = path.join(baseDir, 'public');

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

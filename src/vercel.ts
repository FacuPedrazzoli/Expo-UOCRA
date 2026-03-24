import path from 'path';
import express from 'express';
import { createApp } from './app';

const app = createApp(true);

const publicPath = process.env.VERCEL 
  ? path.join(process.cwd(), 'public')
  : path.join(__dirname, '../../public');

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

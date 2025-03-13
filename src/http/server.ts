import express from 'express'
const path = require('path');

export default () => {
    console.log('Levantando servidor HTTP')
    let app = express()

    app.use(express.json());
    app.use(express.static(
        path.join(__dirname, '../../public')));

    app.get('/inscripcion', (req, res) => {
        res.sendFile(path.join(__dirname, '../../public/html/inscripciones.html'));
    });
    
    app.post('/api/inscripcion', (req, res) => {
        const { nombre, apellido, dni, email, enteraste, charlas } = req.body;
        console.log('Datos recibidos:', req.body);
        res.json({ message: 'Inscripción recibida', data: req.body });
    });

    app.listen(3000, () => {
        console.log('escuchando puerto 3000')
    })
}
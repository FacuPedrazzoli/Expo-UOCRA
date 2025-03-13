document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('inscriptionForm');

    form.addEventListener('submit', function(event) {
        event.preventDefault();

        const nombre = document.getElementById('nombre').value;
        const apellido = document.getElementById('apellido').value;
        const dni = document.getElementById('dni').value;
        const email = document.getElementById('email').value;
        const enteraste = document.getElementById('enteraste').value;
        const charlas = document.getElementById('charlas').value;

        const data = {
            nombre,
            apellido,
            dni,
            email,
            enteraste,
            charlas
        };

        console.log('Datos del formulario:', data); // Log en la consola del navegador

        fetch('/api/inscripcion', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
        .then(response => response.json())
        .then(data => {
            console.log('Success:', data);
        })
        .catch((error) => {
            console.error('Error:', error);
        });
    });
});
document.getElementById('generarGrafico').addEventListener('click', () => {
    let cortes = "10 20 50 120 111 160 15 20 35 45 85 85 85 15 14 13 200 290 180 154 69 25 288"

    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({cortes : cortes}),
    };
    fetch('/api/calculos/cortes', options)
    .then(data => {
        if (!data.ok) {
            alert('not ok')
            throw Error(data.status);
        }
            return data.json();
        })
        .then(z => {
            console.log(z);   
        })
        .catch(e => {
            alert(e)
        });
})
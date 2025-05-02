/*Query para saber cuantos inscriptos tiene una charla*/

SELECT
    charlas.horario, charlas.titulo, charlas.empresa, charlas.ubicacion,
    COUNT(inscriptos_charlas.inscriptos_id) AS total
FROM
    charlas
LEFT JOIN
    inscriptos_charlas ON charlas.id = inscriptos_charlas.charlas_id
GROUP BY
    charlas.id, charlas.titulo
ORDER BY total DESC



/*Query para saber quienes están inscriptos a las charlas*/

SELECT
    charlas.horario, charlas.titulo, charlas.empresa, charlas.ubicacion,
    inscriptos_charlas.inscriptos_id
FROM
    charlas
LEFT JOIN
    inscriptos_charlas ON charlas.id = inscriptos_charlas.charlas_id



/*Query como para saber como se entero del evento  */

SELECT 
    cte.id AS como_te_enteraste_id,
    cte.descripcion,
    COUNT(i.id) AS total_inscriptos
FROM 
    como_te_enteraste cte
LEFT JOIN 
    inscriptos i ON cte.id = i.como_te_enteraste_fk
GROUP BY 
    cte.id, cte.descripcion
ORDER BY 
    total_inscriptos DESC;

/*Query como para saber nombre de la charla y colaboradores */

SELECT 
    ch.id AS charla_id,
    ch.titulo,
    ch.empresa,
    ch.horario,
    ch.ubicacion,
    col.id AS colaborador_id,
    col.nombre AS colaborador_nombre,
    col.apellido AS colaborador_apellido,
    col.entidad,
    col.responsabilidad
FROM 
    charlas ch
LEFT JOIN 
    colaboradores col ON ch.id = col.colabora_en_charla
ORDER BY 
    ch.id, col.apellido, col.nombre;



/*Query como para saber charlas ordenadas por horarios */

SELECT 
    id 
AS 
    charlas_id,
    horario
FROM 
    charlas 
ORDER BY 
    horario asc; 



/*Query como para saber charlas ordenadas alfabeticamente */ 

SELECT 
    id 
AS 
    charlas_id,
    titulo
FROM 
    charlas 
ORDER BY 
    titulo asc; 



/*Query para saber inscriptos ordenado alfabeticamente*/

SELECT 
    id,
    nombre,
    apellido,
    dni,
    email,
    fecha_registro
FROM 
    inscriptos
ORDER BY 
    apellido ASC;



/*Query para saber la cantidad total de inscriptos */

    SELECT 
    COUNT(*) AS total_inscriptos
FROM 
    inscriptos;

/* query para cuanta gente hay en cada charla */ 

SELECT como_te_enteraste_fk 
FROM 
	inscriptos 
where inscriptos.como_te_enteraste_fk = 1111
order by apellido asc

/* query para ver si esta o no*/ 

SELECT 
    nombre,
    apellido,
    dni,
    1 AS esta_inscripto
FROM inscriptos
WHERE dni = '12345678'
UNION
SELECT 
    NULL, NULL, '12345678', 0
WHERE NOT EXISTS (
    SELECT 1 FROM inscriptos WHERE dni = '12345678'
);

/*
Query para conocer a todos los inscriptos que estan en cada una de las charlas
Ordenado por apellido y nombre del inscripto
*/

SELECT 
    inscriptos.id AS inscripto_id,
    inscriptos.apellido AS inscripto_apellido,
    inscriptos.nombre AS inscripto_nombre,
    charlas.id AS charla_id,
    charlas.titulo AS charla_nombre
FROM 
    inscriptos
JOIN 
    inscriptos_charlas ON inscriptos.id = inscriptos_charlas.inscriptos_id
JOIN 
    charlas ON charlas.id = inscriptos_charlas.charlas_id
ORDER BY 
    inscriptos.apellido, inscriptos.nombre, charlas.titulo;

/*
Query para conocer a todos los inscriptos que estan en cada una de las charlas
Ordenado charla y luego recien apellido, nombre
*/

SELECT
    charlas.id AS charla_id,
    charlas.titulo AS charla_nombre,
    inscriptos.id AS inscripto_id,
    inscriptos.apellido AS inscripto_apellido,
    inscriptos.nombre AS inscripto_nombre
FROM
    inscriptos
JOIN
    inscriptos_charlas ON inscriptos.id = inscriptos_charlas.inscriptos_id
JOIN
    charlas ON charlas.id = inscriptos_charlas.charlas_id
ORDER BY
    charlas.titulo, inscriptos.apellido, inscriptos.nombre;




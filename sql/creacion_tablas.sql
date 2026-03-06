/*
Credenciales de acceso: ver archivo .env (NO commitear credenciales en el código fuente)
*/


DROP TABLE IF EXISTS inscriptos_ingresos;
DROP TABLE IF EXISTS inscriptos_charlas;
DROP TABLE IF EXISTS inscriptos;
DROP TABLE IF EXISTS colaboradores;
DROP TABLE IF EXISTS charlas;
DROP TABLE IF EXISTS como_te_enteraste;
DROP TABLE IF EXISTS usuarios;



CREATE TABLE como_te_enteraste (
    id VARCHAR (4) PRIMARY KEY,
    descripcion VARCHAR (150) NOT NULL
);

CREATE TABLE inscriptos (
    id VARCHAR(36) PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    apellido VARCHAR(50) NOT NULL,
    dni VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    como_te_enteraste_fk VARCHAR (4) NOT NULL,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT FOREIGN KEY (como_te_enteraste_fk) REFERENCES como_te_enteraste(id) ON DELETE CASCADE
);

CREATE TABLE charlas (
    id VARCHAR(3) PRIMARY KEY,
    horario VARCHAR (5) NOT NULL,
    titulo VARCHAR(100) NOT NULL,
    empresa VARCHAR (100) NOT NULL,
    ubicacion VARCHAR (100) NOT NULL
);

CREATE TABLE inscriptos_charlas (
    inscriptos_id VARCHAR(36) NOT NULL,
    charlas_id VARCHAR(3),
    PRIMARY KEY (inscriptos_id, charlas_id),
    CONSTRAINT FOREIGN KEY (inscriptos_id) REFERENCES inscriptos(id) ON DELETE CASCADE,
    CONSTRAINT FOREIGN KEY (charlas_id) REFERENCES charlas(id) ON DELETE CASCADE
);

CREATE TABLE colaboradores (
    id VARCHAR(36),
    nombre VARCHAR(50) NOT NULL,
    apellido VARCHAR(50) NOT NULL,
    entidad VARCHAR (50) NOT NULL,
    responsabilidad VARCHAR (50) NOT NULL,
    colabora_en_charla VARCHAR (3),
    PRIMARY KEY (id),
    CONSTRAINT FOREIGN KEY (colabora_en_charla) REFERENCES charlas(id) ON DELETE CASCADE
)

;


CREATE TABLE usuarios (
  id VARCHAR(36) NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  apellido VARCHAR(255) NOT NULL,
  nom_usuario VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  salt VARCHAR(255) NOT NULL,
  PRIMARY KEY (id)
)

;

CREATE TABLE inscriptos_ingresos (
    inscriptos_id VARCHAR(36) NOT NULL,
    fecha_ingreso DATETIME,
    usuario_habilitante VARCHAR(36) NOT NULL,
    CONSTRAINT FOREIGN KEY (inscriptos_id) REFERENCES inscriptos(id) ON DELETE CASCADE,
    CONSTRAINT FOREIGN KEY (usuario_habilitante) REFERENCES usuarios(id) ON DELETE CASCADE
);




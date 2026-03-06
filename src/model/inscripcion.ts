export default interface Inscripcion {
    id: string;
    nombre: string;
    apellido: string;
    dni: string;
    email: string;
    como_te_enteraste_fk: string;
    fecha_registro?: Date;
    validado?: boolean;
    validado_en?: Date | null;
}

/*
La tabla en la base de datos es:

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
*/
-- Migración para Supabase (PostgreSQL)
-- Expo UOCRA - Sistema de inscripciones

-- Tabla: como_te_enteraste
CREATE TABLE IF NOT EXISTS como_te_enteraste (
    id VARCHAR(4) PRIMARY KEY,
    descripcion VARCHAR(150) NOT NULL
);

-- Tabla: charlas
CREATE TABLE IF NOT EXISTS charlas (
    id VARCHAR(3) PRIMARY KEY,
    horario VARCHAR(5) NOT NULL,
    titulo VARCHAR(100) NOT NULL,
    empresa VARCHAR(100) NOT NULL,
    ubicacion VARCHAR(100) NOT NULL
);

-- Tabla: inscriptos
CREATE TABLE IF NOT EXISTS inscriptos (
    id VARCHAR(36) PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    apellido VARCHAR(50) NOT NULL,
    dni VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    como_te_enteraste_fk VARCHAR(4) NOT NULL,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_como_te_enteraste FOREIGN KEY (como_te_enteraste_fk) REFERENCES como_te_enteraste(id) ON DELETE CASCADE
);

-- Tabla: inscriptos_charlas
CREATE TABLE IF NOT EXISTS inscriptos_charlas (
    inscriptos_id VARCHAR(36) NOT NULL,
    charlas_id VARCHAR(3),
    PRIMARY KEY (inscriptos_id, charlas_id),
    CONSTRAINT fk_inscriptos FOREIGN KEY (inscriptos_id) REFERENCES inscriptos(id) ON DELETE CASCADE,
    CONSTRAINT fk_charlas FOREIGN KEY (charlas_id) REFERENCES charlas(id) ON DELETE CASCADE
);

-- Tabla: usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    id VARCHAR(36) NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    apellido VARCHAR(255) NOT NULL,
    nom_usuario VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    salt VARCHAR(255) NOT NULL,
    PRIMARY KEY (id)
);

-- Tabla: inscriptos_ingresos
CREATE TABLE IF NOT EXISTS inscriptos_ingresos (
    inscriptos_id VARCHAR(36) NOT NULL,
    fecha_ingreso TIMESTAMP,
    usuario_habilitante VARCHAR(36) NOT NULL,
    CONSTRAINT fk_inscriptos_ingreso FOREIGN KEY (inscriptos_id) REFERENCES inscriptos(id) ON DELETE CASCADE,
    CONSTRAINT fk_usuario_habilitante FOREIGN KEY (usuario_habilitante) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- Tabla: colaboradores
CREATE TABLE IF NOT EXISTS colaboradores (
    id VARCHAR(36) PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    apellido VARCHAR(50) NOT NULL,
    entidad VARCHAR(50) NOT NULL,
    responsabilidad VARCHAR(50) NOT NULL,
    colabora_en_charla VARCHAR(3),
    CONSTRAINT fk_colabora_charla FOREIGN KEY (colabora_en_charla) REFERENCES charlas(id) ON DELETE CASCADE
);

-- Insertar datos iniciales: como_te_enteraste
INSERT INTO como_te_enteraste (id, descripcion) VALUES 
    ('1', 'Por un compañero/trabajador'),
    ('2', 'Por las redes sociales de UOCRA'),
    ('3', 'Por un correo electrónico'),
    ('4', 'Por un cartel o folleto'),
    ('5', 'Por la página web de UOCRA'),
    ('6', 'Otro')
ON CONFLICT (id) DO NOTHING;

-- Insertar datos de ejemplo: charlas
INSERT INTO charlas (id, horario, titulo, empresa, ubicacion) VALUES 
    ('A', '09:00', 'Charla Inaugural', 'UOCRA', 'Salón Principal'),
    ('B', '10:00', 'Seguridad en Construcción', 'OSHA Argentina', 'Aula 1'),
    ('C', '11:00', 'Normativas Laborales', 'Ministerio de Trabajo', 'Aula 2'),
    ('D', '12:00', 'Técnicas de Albañilería', 'Camarco', 'Aula 1'),
    ('E', '14:00', 'Electricidad Básica', 'Federación de Electricistas', 'Aula 2'),
    ('F', '15:00', 'Primeros Auxilios', 'Cruz Roja', 'Salón Principal'),
    ('G', '16:00', 'Uso de Equipos de Protección', 'UOCRA', 'Aula 1')
ON CONFLICT (id) DO NOTHING;

-- Insertar usuario sistema para validación
INSERT INTO usuarios (id, nombre, apellido, nom_usuario, password, salt) VALUES 
    ('00000000-0000-0000-0000-000000000001', 'Sistema', 'Validación', 'sistema_validacion', 'NO_LOGIN', 'SYSTEM_VALIDATION_SALT')
ON CONFLICT (id) DO NOTHING;

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_inscriptos_dni ON inscriptos(dni);
CREATE INDEX IF NOT EXISTS idx_inscriptos_email ON inscriptos(email);
CREATE INDEX IF NOT EXISTS idx_inscriptos_charlas_inscripto ON inscriptos_charlas(inscriptos_id);
CREATE INDEX IF NOT EXISTS idx_inscriptos_charlas_charla ON inscriptos_charlas(charlas_id);
CREATE INDEX IF NOT EXISTS idx_inscriptos_ingresos_inscripto ON inscriptos_ingresos(inscriptos_id);
CREATE INDEX IF NOT EXISTS idx_charlas_horario ON charlas(horario);

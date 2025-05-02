INSERT INTO como_te_enteraste (id, descripcion) VALUES
('RDS1', 'Redes sociales'),
('AMG1', 'Un amigo me contó'),
('INT1', 'Buscando en internet'),
('PRF1', 'Me lo recomendó un profesor'),
('FLY1', 'Vi un folleto')

;

INSERT INTO inscriptos (id, nombre, apellido, dni, email, como_te_enteraste_fk) VALUES
('a1b2c3d4-e5f6-7890-abcd-ef1234560001', 'Lucía', 'Gómez', '30345678', 'lucia.gomez@example.com', 'RDS1'),
('b2c3d4e5-f6a7-8901-bcde-fa2345670002', 'Martín', 'Pérez', '28456789', 'martin.perez@example.com', 'AMG1'),
('c3d4e5f6-a7b8-9012-cdef-ab3456780003', 'Sofía', 'López', '31234567', 'sofia.lopez@example.com', 'INT1'),
('d4e5f6a7-b8c9-0123-def0-bc4567890004', 'Diego', 'Martínez', '29876543', 'diego.martinez@example.com', 'PRF1'),
('e5f6a7b8-c9d0-1234-ef01-cd5678900005', 'Valentina', 'Rodríguez', '32345678', 'valentina.rodriguez@example.com', 'RDS1'),
('f6a7b8c9-d0e1-2345-f012-de6789010006', 'Julián', 'Fernández', '30123456', 'julian.fernandez@example.com', 'FLY1'),
('a7b8c9d0-e1f2-3456-0123-ef7890120007', 'Camila', 'Sánchez', '27456789', 'camila.sanchez@example.com', 'AMG1'),
('b8c9d0e1-f2a3-4567-1234-fa8901230008', 'Tomás', 'García', '29345678', 'tomas.garcia@example.com', 'INT1'),
('c9d0e1f2-a3b4-5678-2345-ab9012340009', 'Florencia', 'Ruiz', '31345678', 'flor.ruiz@example.com', 'RDS1'),
('d0e1f2a3-b4c5-6789-3456-bc0123450010', 'Lucas', 'Molina', '28876543', 'lucas.molina@example.com', 'PRF1')

  ;



INSERT INTO charlas (id, horario, titulo, empresa, ubicacion) VALUES
('A11', '13:00', 'Programaci�n', 'ProfeAndy', 'Auditorio entrepiso'),
('A12', '14:00', 'Durlock', 'Durazno', 'Auditorio entrepiso'),
('A13', '15:00', 'Dise�o', 'MArta Minujin', 'Auditorio entrepiso'),
('A14', '16:00', 'Arte', 'Picasso', 'Auditorio entrepiso'),
('A15', '17:00', 'Musica', 'Queen', 'Auditorio entrepiso'),
('A16', '18:00', 'cpmputacion', 'Hp', 'Auditorio entrepiso')  
  
;


INSERT INTO colaboradores (id, nombre, apellido, entidad, responsabilidad, colabora_en_charla) VALUES
('e794b2a6-9332-4ced-9f8f-f7aaa193cffd', 'David', 'Quispe', 'Universidad X', 'Alpaudidor', 'A12'),
('0fc8af3f-926e-4f7a-8e62-9f2bbb9a98e8', 'Facundo', 'Pedrazzoli', 'Universidad Y', 'Ayudante', 'A14'),
('0fc8af3f-926e-4f7a-8e62-9f244b9a98e8', 'jorge', 'Martines', 'Universidad Z', 'Limpieza', 'A13'),
('0fc8af3f-926e-4f7a-8e62-9f2dba1098e8', 'Oscar', 'Alvarez', 'Gracioso', 'Moderador', 'A13')

;
INSERT INTO inscriptos_charlas (inscriptos_id, charlas_id) VALUES
-- Lucía Gómez
('a1b2c3d4-e5f6-7890-abcd-ef1234560001', 'A11'),
('a1b2c3d4-e5f6-7890-abcd-ef1234560001', 'A13'),

-- Martín Pérez
('b2c3d4e5-f6a7-8901-bcde-fa2345670002', 'A12'),
('b2c3d4e5-f6a7-8901-bcde-fa2345670002', 'A14'),

-- Sofía López
('c3d4e5f6-a7b8-9012-cdef-ab3456780003', 'A11'),

-- Diego Martínez
('d4e5f6a7-b8c9-0123-def0-bc4567890004', 'A13'),
('d4e5f6a7-b8c9-0123-def0-bc4567890004', 'A16'),

-- Valentina Rodríguez
('e5f6a7b8-c9d0-1234-ef01-cd5678900005', 'A12'),
('e5f6a7b8-c9d0-1234-ef01-cd5678900005', 'A16'),

-- Julián Fernández
('f6a7b8c9-d0e1-2345-f012-de6789010006', 'A14'),

-- Camila Sánchez
('a7b8c9d0-e1f2-3456-0123-ef7890120007', 'A11'),
('a7b8c9d0-e1f2-3456-0123-ef7890120007', 'A12'),
('a7b8c9d0-e1f2-3456-0123-ef7890120007', 'A13'),

-- Tomás García
('b8c9d0e1-f2a3-4567-1234-fa8901230008', 'A15'),

-- Florencia Ruiz
('c9d0e1f2-a3b4-5678-2345-ab9012340009', 'A12'),
('c9d0e1f2-a3b4-5678-2345-ab9012340009', 'A14'),

-- Lucas Molina
('d0e1f2a3-b4c5-6789-3456-bc0123450010', 'A11'),
('d0e1f2a3-b4c5-6789-3456-bc0123450010', 'A13')
  
;



INSERT INTO usuarios (id, nombre, apellido, nom_usuario, password, salt) VALUES
('d7636668-1409-11f0-b33a-960eb8c1f991', 'Andy', 'Vazquez', 'root', 'NO_INICIALIZADA', '1c3099b2-140c-11f0-b33a-960eb8c1f991__37b00dc8-140c-11f0-b33a-960eb8c1f991')


;


INSERT INTO inscriptos_ingresos (inscriptos_id, fecha_ingreso, usuario_habilitante)
SELECT id, NOW(), 'd7636668-1409-11f0-b33a-960eb8c1f991'
FROM inscriptos
WHERE dni = '28456789';


INSERT INTO inscriptos_ingresos (inscriptos_id, fecha_ingreso, usuario_habilitante)
SELECT id, NOW(), 'd7636668-1409-11f0-b33a-960eb8c1f991'
FROM inscriptos
WHERE dni = '12345678';


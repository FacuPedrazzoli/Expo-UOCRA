-- Inserción de datos iniciales para las tablas

-- Datos para la tabla como_te_enteraste
INSERT INTO como_te_enteraste (id, descripcion) VALUES 
('RS01', 'Redes Sociales'),
('AM02', 'Amigo/Familiar'),
('EM03', 'Email'),
('WEB4', 'Sitio Web'),
('OT05', 'Otro');

-- Datos para la tabla charlas (estos son ejemplos basados en data.json)
INSERT INTO charlas (id, horario, titulo, empresa, ubicacion) VALUES
('C01', '14:30', 'Dun Dun', 'Dun Dun', 'Aula 1.1'),
('C02', '15:00', 'Realidad Virtual', 'RV Uocra', 'Aula 1.1'),
('C03', '14:00', 'Eficiencia energética en edificios', 'EcoBuilding', 'Auditorio Principal'),
('C04', '15:30', 'Normativas actuales en instalaciones eléctricas', 'Schneider Electric', 'Aula 3 - 305'),
('C05', '17:00', 'Diseño de estructuras antisísmicas', 'Ingeniería Estructural SA', 'Aula 2 - 204'),
('C06', '10:00', 'Innovaciones en sistemas de construcción en seco', 'Durlock', 'Auditorio Principal'),
('C07', '11:45', 'Soluciones sostenibles en almacenamiento de agua', 'Rotoplas', 'Aula 2 - 204'),
('C08', '13:30', 'El futuro de las instalaciones eléctricas seguras', 'Conextube', 'Aula 3 - 305'),
('C09', '16:00', 'Impresión 3D aplicada a la construcción', '3D insumos', 'Laboratorio de Tecnología - Piso 1'),
('C10', '14:00', 'Prevención de accidentes en obra', 'Fundación UOCRA', 'Aula 4 - 401');

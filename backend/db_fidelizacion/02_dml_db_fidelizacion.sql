-- DML — Fidelización (Punta Diamante) [db_fidelizacion]. Solo datos: catálogos, recompensas y ubicaciones.
-- Correr DESPUÉS de 01_ddl_db_fidelizacion.sql.
USE db_fidelizacion;

-- ============================================================
--  DATOS INICIALES — CATÁLOGOS
-- ============================================================
INSERT INTO estados (estado) VALUES ('activo'), ('inactivo'), ('suspendido');

INSERT INTO roles (rol, descripcion) VALUES
  ('admin',         'Acceso total al sistema'),
  ('recepcionista', 'Registra huéspedes, consumos y consultas'),
  ('empleado',      'Consulta de puntos de los huéspedes');

INSERT INTO tipos_documento (nombre) VALUES ('DUI'), ('Pasaporte');

INSERT INTO tipos_beneficio (nombre, descripcion) VALUES
  ('Descuento porcentual', 'Descuento expresado en %'),
  ('Descuento fijo',       'Descuento de monto fijo'),
  ('Producto gratis',      'Producto de cortesía'),
  ('Cupón de bienvenida',  'Beneficio para clientes nuevos'),
  ('Cumpleaños',           'Beneficio por fecha de cumpleaños');

INSERT INTO configuracion (clave, valor, descripcion) VALUES
  -- Reglas FIJAS del sistema (NO en esta tabla): ganar $1 = 1 punto; cada punto vale $0.05;
  -- catálogo de canje (tabla recompensas); operador = 1.5 puntos por persona. Fijas por código.
  ('bienvenida_puntos',      '20',  'Puntos extra en la primera compra (bienvenida)'),
  ('bienvenida_descuento',   '2',   'Descuento en $ en la primera compra (bienvenida)'),
  -- Interruptores para activar/desactivar cada regla (1 = activo, 0 = inactivo).
  -- La bienvenida nace APAGADA; el admin la activa cuando quiera.
  ('canje_activo',           '1',   'Permite canjear puntos por descuento'),
  ('bienvenida_activo',      '0',   'Activa el beneficio de bienvenida (primera compra)');

-- ============================================================
--  DATOS INICIALES — PLANTILLAS DE CORREO (texto editable desde el panel)
-- ============================================================
INSERT INTO plantillas_correo (clave, nombre, descripcion, obligatorio, activo, asunto, titulo, intro, cuerpo, boton, variables) VALUES
  ('otp', 'Código de acceso', 'Se envía cuando el cliente pide entrar al portal o la app con su documento.', 1, 1,
   'Tu código de acceso · Punta Diamantes', 'Tu código de acceso', 'Úsalo para entrar a tu portal de puntos.',
   'Vence en {minutos} minutos. No lo compartas con nadie.', NULL, '{codigo}, {minutos}'),
  ('cerca_canje', 'Casi llegas a tu canje', 'Automático: cuando el cliente alcanza el 80% de su próxima recompensa.', 0, 1,
   '¡Casi llegas a "{recompensa}"! · Punta Diamantes', '¡Casi llegas, {nombre}!', 'Solo te faltan {faltan} puntos para tu próximo canje.',
   'Con tu próxima visita al hotel puedes completar tus puntos y reclamar {recompensa} en recepción.', 'Ver mis puntos en el portal',
   '{nombre}, {puntos}, {recompensa}, {recompensaPuntos}, {faltan}, {porcentaje}'),
  ('reactivacion', 'Reactivación (te extrañamos)', 'Automático: cliente con puntos y sin comprar en el último mes.', 0, 1,
   'Te echamos de menos, {nombre} · Punta Diamantes', 'Hace tiempo que no te vemos, {nombre}', 'Tus puntos siguen aquí, esperándote.',
   'Recuerda que en cada consumo en el hotel ganas puntos automáticamente. ¡Te esperamos pronto en Punta Diamantes!', 'Ver mi saldo en el portal',
   '{nombre}, {puntos}'),
  ('bienvenida', 'Bienvenida (cliente nuevo)', 'Se envía cuando registras un cliente nuevo que tiene correo.', 0, 1,
   '¡Bienvenido al programa de puntos! · Punta Diamantes', '¡Bienvenido, {nombre}!', 'Ya eres parte del programa de puntos de Punta Diamantes.',
   'Desde ahora, cada consumo en el hotel te da puntos que puedes canjear por recompensas. ¡Nos vemos pronto!', 'Conocer mis puntos',
   '{nombre}'),
  ('comprobante', 'Comprobante de consumo', 'Se envía al cliente al registrar su consumo (si tiene correo).', 0, 1,
   'Tu comprobante de consumo · Punta Diamantes', '¡Gracias por tu visita, {nombre}!', 'Este es el detalle de tu consumo y tus puntos.',
   'Tu saldo actual es de {saldo} puntos. ¡Te esperamos pronto!', 'Ver mis puntos',
   '{nombre}, {monto}, {descuento}, {total}, {puntosOtorgados}, {puntosCanjeados}, {saldo}, {recompensa}'),
  ('promo_nueva', 'Promoción nueva', 'Se envía a todos los clientes con correo cuando creas una promoción.', 0, 1,
   '¡Nueva promoción en Punta Diamantes! · {promo}', '¡Nueva promoción, {nombre}!', 'Tenemos algo nuevo para ti en Punta Diamantes.',
   'Aprovecha {promo} en tu próxima visita. ¡Te esperamos!', 'Ver mis puntos',
   '{nombre}, {promo}, {beneficio}, {vigencia}'),
  ('promo_por_finalizar', 'Promoción por finalizar', 'Automático: aviso a los clientes antes de que termine una promoción. Los días de antelación se configuran aquí abajo.', 0, 1,
   '¡Últimos días para {promo}! · Punta Diamantes', '¡No te quedes sin {promo}, {nombre}!', 'Esta promoción está por terminar.',
   'Te quedan pocos días para aprovechar {promo}. ¡Visítanos antes de que termine!', 'Ver mis puntos',
   '{nombre}, {promo}, {beneficio}, {vigencia}, {dias}');

-- Días de antelación del aviso "por finalizar" (editable desde el panel).
UPDATE plantillas_correo SET dias = 2 WHERE clave = 'promo_por_finalizar';

-- Correos al OPERADOR turístico. Igual que los del cliente, pero el operador NO entra al portal:
-- por eso van SIN botón (boton = NULL). El comprobante sirve tanto para visitas como para canjes.
INSERT INTO plantillas_correo (clave, nombre, descripcion, obligatorio, activo, asunto, titulo, intro, cuerpo, boton, variables) VALUES
  ('bienvenida_operador', 'Bienvenida (operador nuevo)', 'Se envía cuando registras un operador turístico nuevo que tiene correo.', 0, 1,
   '¡Bienvenido al programa de puntos! · Punta Diamantes', '¡Bienvenido, {nombre}!', 'Ya eres parte del programa de puntos para operadores turísticos de Punta Diamantes.',
   'Por cada visita con tu grupo al hotel acumulas puntos que puedes canjear por recompensas en recepción. ¡Nos vemos pronto!', NULL,
   '{nombre}'),
  ('comprobante_operador', 'Comprobante de operador', 'Se envía al operador al registrar una visita o un canje (si tiene correo).', 0, 1,
   'Tu comprobante · Punta Diamantes', '¡Gracias, {nombre}!', 'Este es el detalle de tu registro y tus puntos.',
   'Tu saldo actual es de {saldo} puntos. ¡Gracias por traer a tu grupo a Punta Diamantes!', NULL,
   '{nombre}, {personas}, {puntosGanados}, {puntosCanjeados}, {recompensa}, {saldo}, {minimo}'),
  ('cerca_canje_operador', 'Casi llegas (operador)', 'Automático: cuando el operador alcanza el 80% de su próxima recompensa.', 0, 1,
   '¡Casi llegas a "{recompensa}"! · Punta Diamantes', '¡Casi llegas, {nombre}!', 'Solo te faltan {faltan} puntos para tu próximo canje.',
   'En tu próxima visita con tu grupo puedes completar tus puntos y reclamar {recompensa} en recepción.', NULL,
   '{nombre}, {puntos}, {recompensa}, {recompensaPuntos}, {faltan}, {porcentaje}'),
  ('resumen_operador', 'Resumen mensual (operador)', 'Automático: cada mes, el saldo del operador y las recompensas que ya puede canjear (no entra al portal).', 0, 1,
   'Tus puntos este mes · Punta Diamantes', 'Tus puntos, {nombre}', 'Este es tu saldo y lo que ya puedes canjear en recepción.',
   'Recuerda que en cada visita con tu grupo ganas puntos. ¡Te esperamos pronto en Punta Diamantes!', NULL,
   '{nombre}, {puntos}');

-- ============================================================
--  DATOS INICIALES — CATÁLOGO DE RECOMPENSAS (canje)
-- ============================================================
INSERT INTO recompensas (nombre, tipo, puntos) VALUES
  ('Pasanoche (Dom a Jue)',                 'Estándar', 700),
  ('Pasadía (Dom a Jue)',                   'Estándar', 800),
  ('Estadía 24h · 2 personas (Dom a Jue)',  'Estándar', 1000),
  ('Pasanoche (Vie o Sáb)',                 'Estándar', 800),
  ('Pasadía (Vie o Sáb)',                   'Estándar', 800),
  ('Estadía 24h · 2 personas (Vie o Sáb)',  'Estándar', 1200);

-- ============================================================
--  DATOS INICIALES — UBICACIONES (14 deptos, 44 municipios, 262 distritos)
-- ============================================================
INSERT INTO departamentos (id_departamento, nombre) VALUES
(1,'Ahuachapán'),(2,'Santa Ana'),(3,'Sonsonate'),(4,'Chalatenango'),
(5,'La Libertad'),(6,'San Salvador'),(7,'Cuscatlán'),(8,'La Paz'),
(9,'Cabañas'),(10,'San Vicente'),(11,'Usulután'),(12,'San Miguel'),
(13,'Morazán'),(14,'La Unión');

INSERT INTO municipios (id_municipio, nombre, id_departamento) VALUES
(1,'Ahuachapán Norte',1),(2,'Ahuachapán Centro',1),(3,'Ahuachapán Sur',1),
(4,'Santa Ana Norte',2),(5,'Santa Ana Centro',2),(6,'Santa Ana Este',2),(7,'Santa Ana Oeste',2),
(8,'Sonsonate Norte',3),(9,'Sonsonate Centro',3),(10,'Sonsonate Este',3),(11,'Sonsonate Oeste',3),
(12,'Chalatenango Norte',4),(13,'Chalatenango Centro',4),(14,'Chalatenango Sur',4),
(15,'La Libertad Norte',5),(16,'La Libertad Centro',5),(17,'La Libertad Oeste',5),
(18,'La Libertad Este',5),(19,'La Libertad Costa',5),(20,'La Libertad Sur',5),
(21,'San Salvador Norte',6),(22,'San Salvador Oeste',6),(23,'San Salvador Este',6),
(24,'San Salvador Centro',6),(25,'San Salvador Sur',6),
(26,'Cuscatlán Norte',7),(27,'Cuscatlán Sur',7),
(28,'La Paz Oeste',8),(29,'La Paz Centro',8),(30,'La Paz Este',8),
(31,'Cabañas Este',9),(32,'Cabañas Oeste',9),
(33,'San Vicente Norte',10),(34,'San Vicente Sur',10),
(35,'Usulután Norte',11),(36,'Usulután Este',11),(37,'Usulután Oeste',11),
(38,'San Miguel Norte',12),(39,'San Miguel Centro',12),(40,'San Miguel Oeste',12),
(41,'Morazán Norte',13),(42,'Morazán Sur',13),
(43,'La Unión Norte',14),(44,'La Unión Sur',14);

INSERT INTO distritos (nombre, id_municipio) VALUES
-- Ahuachapán Norte (1)
('Atiquizaya',1),('El Refugio',1),('San Lorenzo',1),('Turín',1),
-- Ahuachapán Centro (2)
('Ahuachapán',2),('Apaneca',2),('Concepción de Ataco',2),('Tacuba',2),
-- Ahuachapán Sur (3)
('Guaymango',3),('Jujutla',3),('San Francisco Menéndez',3),('San Pedro Puxtla',3),
-- Santa Ana Norte (4)
('Masahuat',4),('Metapán',4),('Santa Rosa Guachipilín',4),('Texistepeque',4),
-- Santa Ana Centro (5)
('Santa Ana',5),
-- Santa Ana Este (6)
('Coatepeque',6),('El Congo',6),
-- Santa Ana Oeste (7)
('Candelaria de la Frontera',7),('Chalchuapa',7),('El Porvenir',7),
('San Antonio Pajonal',7),('San Sebastián Salitrillo',7),('Santiago de la Frontera',7),
-- Sonsonate Norte (8)
('Juayúa',8),('Nahuizalco',8),('Salcoatitán',8),('Santa Catarina Masahuat',8),
-- Sonsonate Centro (9)
('Nahulingo',9),('San Antonio del Monte',9),('Santo Domingo de Guzmán',9),('Sonsonate',9),('Sonzacate',9),
-- Sonsonate Este (10)
('Armenia',10),('Caluco',10),('Cuisnahuat',10),('Santa Isabel Ishuatán',10),('Izalco',10),('San Julián',10),
-- Sonsonate Oeste (11)
('Acajutla',11),
-- Chalatenango Norte (12)
('Citalá',12),('San Ignacio',12),('La Palma',12),
-- Chalatenango Centro (13)
('Agua Caliente',13),('Dulce Nombre de María',13),('El Paraíso',13),('La Reina',13),
('Nueva Concepción',13),('San Fernando',13),('San Francisco Morazán',13),('San Rafael',13),
('Santa Rita',13),('Tejutla',13),
-- Chalatenango Sur (14)
('Arcatao',14),('Azacualpa',14),('Comalapa',14),('Concepción Quezaltepeque',14),
('Chalatenango',14),('El Carrizal',14),('La Laguna',14),('Las Vueltas',14),
('Nombre de Jesús',14),('Nueva Trinidad',14),('Ojos de Agua',14),('Potonico',14),
('San Antonio de la Cruz',14),('San Antonio Los Ranchos',14),('San Isidro Labrador',14),
('San Francisco Lempa',14),('San José Cancasque',14),('San José Las Flores',14),
('San Luis del Carmen',14),('San Miguel de Mercedes',14),
-- La Libertad Norte (15)
('Quezaltepeque',15),('San Matías',15),('San Pablo Tacachico',15),
-- La Libertad Centro (16)
('Ciudad Arce',16),('San Juan Opico',16),
-- La Libertad Oeste (17)
('Colón',17),('Jayaque',17),('Sacacoyo',17),('Talnique',17),('Tepecoyo',17),
-- La Libertad Este (18)
('Antiguo Cuscatlán',18),('Huizúcar',18),('Nuevo Cuscatlán',18),('San José Villanueva',18),('Zaragoza',18),
-- La Libertad Costa (19)
('Chiltiupán',19),('Jicalapa',19),('La Libertad',19),('Tamanique',19),('Teotepeque',19),
-- La Libertad Sur (20)
('Comasagua',20),('Santa Tecla',20),
-- San Salvador Norte (21)
('Aguilares',21),('El Paisnal',21),('Guazapa',21),
-- San Salvador Oeste (22)
('Apopa',22),('Nejapa',22),
-- San Salvador Este (23)
('Ilopango',23),('San Martín',23),('Soyapango',23),('Tonacatepeque',23),
-- San Salvador Centro (24)
('Ayutuxtepeque',24),('Cuscatancingo',24),('Mejicanos',24),('San Salvador',24),('Delgado',24),
-- San Salvador Sur (25)
('Panchimalco',25),('Rosario de Mora',25),('San Marcos',25),('Santiago Texacuangos',25),('Santo Tomás',25),
-- Cuscatlán Norte (26)
('Oratorio de Concepción',26),('San Bartolomé Perulapía',26),('San José Guayabal',26),
('San Pedro Perulapán',26),('Suchitoto',26),
-- Cuscatlán Sur (27)
('Candelaria',27),('Cojutepeque',27),('El Carmen',27),('El Rosario',27),('Monte San Juan',27),
('San Cristóbal',27),('San Rafael Cedros',27),('San Ramón',27),('Santa Cruz Analquito',27),
('Santa Cruz Michapa',27),('Tenancingo',27),
-- La Paz Oeste (28)
('Cuyultitán',28),('Olocuilta',28),('San Francisco Chinameca',28),('San Juan Talpa',28),
('San Luis Talpa',28),('San Pedro Masahuat',28),('Tapalhuaca',28),
-- La Paz Centro (29)
('El Rosario',29),('Jerusalén',29),('Mercedes La Ceiba',29),('Paraíso de Osorio',29),
('San Antonio Masahuat',29),('San Emigdio',29),('San Juan Tepezontes',29),('San Miguel Tepezontes',29),
('San Pedro Nonualco',29),('Santa María Ostuma',29),('Santiago Nonualco',29),('San Luis La Herradura',29),
-- La Paz Este (30)
('San Juan Nonualco',30),('San Rafael Obrajuelo',30),('Zacatecoluca',30),
-- Cabañas Este (31)
('Dolores',31),('Guacotecti',31),('San Isidro',31),('Sensuntepeque',31),('Victoria',31),
-- Cabañas Oeste (32)
('Cinquera',32),('Ilobasco',32),('Jutiapa',32),('Tejutepeque',32),
-- San Vicente Norte (33)
('Apastepeque',33),('San Esteban Catarina',33),('San Ildefonso',33),('San Lorenzo',33),
('San Sebastián',33),('Santa Clara',33),('Santo Domingo',33),
-- San Vicente Sur (34)
('Guadalupe',34),('San Cayetano Istepeque',34),('San Vicente',34),('Tecoluca',34),('Tepetitán',34),('Verapaz',34),
-- Usulután Norte (35)
('Alegría',35),('Berlín',35),('El Triunfo',35),('Estanzuelas',35),('Jucuapa',35),
('Mercedes Umaña',35),('Nueva Granada',35),('San Buenaventura',35),('Santiago de María',35),
-- Usulután Este (36)
('California',36),('Concepción Batres',36),('Ereguayquín',36),('Jucuarán',36),('Ozatlán',36),
('Usulután',36),('San Dionisio',36),('Santa Elena',36),('Santa María',36),('Tecapán',36),
-- Usulután Oeste (37)
('Jiquilisco',37),('Puerto El Triunfo',37),('San Agustín',37),('San Francisco Javier',37),
-- San Miguel Norte (38)
('Carolina',38),('Ciudad Barrios',38),('Chapeltique',38),('Nuevo Edén de San Juan',38),
('San Antonio del Mosco',38),('San Gerardo',38),('San Luis de La Reina',38),('Sesori',38),
-- San Miguel Centro (39)
('Comacarán',39),('Moncagua',39),('Chirilagua',39),('Quelepa',39),('San Miguel',39),('Uluazapa',39),
-- San Miguel Oeste (40)
('Chinameca',40),('El Tránsito',40),('Lolotique',40),('Nueva Guadalupe',40),('San Jorge',40),('San Rafael Oriente',40),
-- Morazán Norte (41)
('Arambala',41),('Cacaopera',41),('Corinto',41),('El Rosario',41),('Joateca',41),('Jocoaitique',41),
('Meanguera',41),('Perquín',41),('San Fernando',41),('San Isidro',41),('Torola',41),
-- Morazán Sur (42)
('Chilanga',42),('Delicias de Concepción',42),('El Divisadero',42),('Gualococti',42),('Guatajiagua',42),
('Jocoro',42),('Lolotiquillo',42),('Osicala',42),('San Carlos',42),('San Francisco Gotera',42),
('San Simón',42),('Sensembra',42),('Sociedad',42),('Yamabal',42),('Yoloaiquín',42),
-- La Unión Norte (43)
('Anamorós',43),('Bolívar',43),('Concepción de Oriente',43),('El Sauce',43),('Lislique',43),
('Nueva Esparta',43),('Pasaquina',43),('Polorós',43),('San José La Fuente',43),('Santa Rosa de Lima',43),
-- La Unión Sur (44)
('Conchagua',44),('El Carmen',44),('Intipucá',44),('La Unión',44),('Meanguera del Golfo',44),
('San Alejo',44),('Yayantique',44),('Yucuaiquín',44);

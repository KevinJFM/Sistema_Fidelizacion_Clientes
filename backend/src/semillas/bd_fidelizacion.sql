-- ============================================================
--  BASE DE DATOS COMPLETA — Sistema de Fidelización (Punta Diamante)
--  Incluye: catálogos, ubicaciones (depto/municipio/distrito),
--  usuarios y clientes con ubicación, fidelización y auditoría.
--
--  Acceso del cliente al portal/app: por CÓDIGO (OTP) enviado al correo.
-- ============================================================
CREATE DATABASE IF NOT EXISTS db_fidelizacion
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE db_fidelizacion;

-- Limpieza (orden inverso por las llaves foráneas) — re-ejecutable
DROP TABLE IF EXISTS bitacora;
DROP TABLE IF EXISTS alertas_enviadas;
DROP TABLE IF EXISTS refresh_tokens;
DROP TABLE IF EXISTS movimientos_puntos;
DROP TABLE IF EXISTS transacciones;
DROP TABLE IF EXISTS transacciones_operador;
DROP TABLE IF EXISTS operadores_turisticos;
DROP TABLE IF EXISTS beneficios_emitidos;
DROP TABLE IF EXISTS recompensas;
DROP TABLE IF EXISTS promociones;
DROP TABLE IF EXISTS configuracion;
DROP TABLE IF EXISTS clientes;
DROP TABLE IF EXISTS usuarios;
DROP TABLE IF EXISTS distritos;
DROP TABLE IF EXISTS municipios;
DROP TABLE IF EXISTS departamentos;
DROP TABLE IF EXISTS tipos_beneficio;
DROP TABLE IF EXISTS tipos_documento;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS estados;

-- ============================================================
--  CATÁLOGOS
-- ============================================================
CREATE TABLE estados (
  id_estado  INT NOT NULL AUTO_INCREMENT,
  estado     VARCHAR(50) NOT NULL UNIQUE,
  PRIMARY KEY (id_estado)
);

CREATE TABLE roles (
  id_rol       INT NOT NULL AUTO_INCREMENT,
  rol          VARCHAR(50)  NOT NULL UNIQUE,
  descripcion  VARCHAR(150) NULL,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_rol)
);

CREATE TABLE tipos_documento (
  id_tipo_documento INT NOT NULL AUTO_INCREMENT,
  nombre            VARCHAR(40) NOT NULL UNIQUE,
  PRIMARY KEY (id_tipo_documento)
);

CREATE TABLE tipos_beneficio (
  id_tipo_beneficio INT NOT NULL AUTO_INCREMENT,
  nombre            VARCHAR(60) NOT NULL UNIQUE,
  descripcion       VARCHAR(150) NULL,
  PRIMARY KEY (id_tipo_beneficio)
);

-- ============================================================
--  UBICACIONES (Departamentos > Municipios > Distritos)
-- ============================================================
CREATE TABLE departamentos (
  id_departamento INT NOT NULL AUTO_INCREMENT,
  nombre          VARCHAR(100) NOT NULL,
  pais            VARCHAR(100) NOT NULL DEFAULT 'El Salvador',
  PRIMARY KEY (id_departamento)
);

CREATE TABLE municipios (
  id_municipio    INT NOT NULL AUTO_INCREMENT,
  nombre          VARCHAR(100) NOT NULL,
  id_departamento INT NOT NULL,
  PRIMARY KEY (id_municipio),
  CONSTRAINT fk_municipios_departamento FOREIGN KEY (id_departamento) REFERENCES departamentos(id_departamento),
  INDEX idx_municipios_departamento (id_departamento)
);

CREATE TABLE distritos (
  id_distrito  INT NOT NULL AUTO_INCREMENT,
  nombre       VARCHAR(120) NOT NULL,
  id_municipio INT NOT NULL,
  PRIMARY KEY (id_distrito),
  CONSTRAINT fk_distritos_municipio FOREIGN KEY (id_municipio) REFERENCES municipios(id_municipio),
  INDEX idx_distritos_municipio (id_municipio)
);

-- ============================================================
--  USUARIOS DEL SISTEMA (inician sesión)
-- ============================================================
CREATE TABLE usuarios (
  id_usuario        INT NOT NULL AUTO_INCREMENT,
  nombre            VARCHAR(100) NOT NULL,
  apellido          VARCHAR(100) NOT NULL,
  email             VARCHAR(150) NOT NULL UNIQUE,
  contrasena_hash   VARCHAR(255) NOT NULL,
  telefono          VARCHAR(20)  NOT NULL,
  fecha_nacimiento  DATE         NULL,
  id_departamento   INT          NULL,
  id_distrito       INT          NULL,
  id_rol            INT          NOT NULL,
  id_estado         INT          NOT NULL,
  created_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_usuario),
  CONSTRAINT fk_usuarios_rol          FOREIGN KEY (id_rol)          REFERENCES roles(id_rol),
  CONSTRAINT fk_usuarios_estado       FOREIGN KEY (id_estado)       REFERENCES estados(id_estado),
  CONSTRAINT fk_usuarios_departamento FOREIGN KEY (id_departamento) REFERENCES departamentos(id_departamento),
  CONSTRAINT fk_usuarios_distrito     FOREIGN KEY (id_distrito)     REFERENCES distritos(id_distrito),
  INDEX idx_usuarios_email (email)
);

-- ============================================================
--  CLIENTES DE FIDELIZACIÓN (NO inician sesión al panel)
--  Consultan sus puntos en el portal/app con un código (OTP) por correo.
-- ============================================================
CREATE TABLE clientes (
  id_cliente        INT NOT NULL AUTO_INCREMENT,
  id_tipo_documento INT NOT NULL,
  numero_documento  VARCHAR(30)  NOT NULL,
  nombres           VARCHAR(100) NOT NULL,
  apellidos         VARCHAR(100) NOT NULL,
  telefono          VARCHAR(20)  NULL,
  correo            VARCHAR(150) NULL,
  fecha_nacimiento  DATE         NULL,
  id_departamento   INT          NULL,
  id_distrito       INT          NULL,
  puntos_acumulados INT          NOT NULL DEFAULT 0,
  otp_hash          VARCHAR(255) NULL,
  otp_expira        DATETIME     NULL,
  otp_intentos      INT          NOT NULL DEFAULT 0,
  push_token        VARCHAR(255) NULL,
  sesion_app        VARCHAR(64)  NULL,
  sesion_portal     VARCHAR(64)  NULL,
  id_estado         INT          NOT NULL,
  created_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_cliente),
  CONSTRAINT fk_clientes_tipodoc       FOREIGN KEY (id_tipo_documento) REFERENCES tipos_documento(id_tipo_documento),
  CONSTRAINT fk_clientes_estado        FOREIGN KEY (id_estado)         REFERENCES estados(id_estado),
  CONSTRAINT fk_clientes_departamento  FOREIGN KEY (id_departamento)   REFERENCES departamentos(id_departamento),
  CONSTRAINT fk_clientes_distrito      FOREIGN KEY (id_distrito)       REFERENCES distritos(id_distrito),
  CONSTRAINT uq_cliente_documento UNIQUE (id_tipo_documento, numero_documento),
  INDEX idx_clientes_documento (numero_documento)
);

-- ============================================================
--  PROMOCIONES (reglas de fechas especiales)
-- ============================================================
CREATE TABLE promociones (
  id_escenario     INT NOT NULL AUTO_INCREMENT,
  nombre           VARCHAR(80) NOT NULL,
  fecha_inicio     DATE NULL,
  fecha_fin        DATE NULL,
  fecha_especial   DATE NULL,
  puntos_extra     INT NOT NULL DEFAULT 0,
  descuento_extra  DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  max_usos_cliente INT NOT NULL DEFAULT 1,
  activo           TINYINT NOT NULL DEFAULT 1,
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_escenario)
);

-- ============================================================
--  RECOMPENSAS (catálogo de canje: qué puede canjear el cliente)
--  tipo = tipo de habitación (Estándar / Especial). Valor en $ = puntos * 0.05 (fijo por código).
-- ============================================================
CREATE TABLE recompensas (
  id         INT NOT NULL AUTO_INCREMENT,
  nombre     VARCHAR(120) NOT NULL,
  tipo       VARCHAR(60)  NOT NULL DEFAULT 'Estándar',
  puntos     INT NOT NULL,
  activo     TINYINT(1) NOT NULL DEFAULT 1,
  creado_en  DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

-- ============================================================
--  BENEFICIOS EMITIDOS (cupones por cliente)
-- ============================================================
CREATE TABLE beneficios_emitidos (
  id_beneficio       INT NOT NULL AUTO_INCREMENT,
  id_cliente         INT NOT NULL,
  id_tipo_beneficio  INT NOT NULL,
  valor              DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  estado             ENUM('disponible','canjeado','vencido') NOT NULL DEFAULT 'disponible',
  fecha_emision      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_vencimiento  DATE NULL,
  fecha_canje        TIMESTAMP NULL,
  PRIMARY KEY (id_beneficio),
  CONSTRAINT fk_benef_cliente FOREIGN KEY (id_cliente)        REFERENCES clientes(id_cliente),
  CONSTRAINT fk_benef_tipo    FOREIGN KEY (id_tipo_beneficio) REFERENCES tipos_beneficio(id_tipo_beneficio),
  INDEX idx_benef_estado (estado)
);

-- ============================================================
--  TRANSACCIONES (compras / hospedajes)
-- ============================================================
CREATE TABLE transacciones (
  id_transaccion     INT NOT NULL AUTO_INCREMENT,
  id_cliente         INT NOT NULL,
  id_usuario         INT NOT NULL,
  id_escenario       INT NULL,
  referencia_venta   VARCHAR(60) NULL,
  fecha_ingreso      DATE NULL,
  fecha_salida       DATE NULL,
  monto              DECIMAL(10,2) NOT NULL,
  descuento_aplicado DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  puntos_otorgados   INT NOT NULL DEFAULT 0,
  puntos_canjeados   INT NOT NULL DEFAULT 0,
  fecha              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_transaccion),
  CONSTRAINT fk_trans_cliente   FOREIGN KEY (id_cliente)   REFERENCES clientes(id_cliente),
  CONSTRAINT fk_trans_usuario   FOREIGN KEY (id_usuario)   REFERENCES usuarios(id_usuario),
  CONSTRAINT fk_trans_promocion FOREIGN KEY (id_escenario) REFERENCES promociones(id_escenario),
  INDEX idx_trans_fecha (fecha),
  INDEX idx_trans_fecha_ingreso (fecha_ingreso)
);

-- ============================================================
--  MOVIMIENTOS DE PUNTOS (historial / libro mayor de puntos)
-- ============================================================
CREATE TABLE movimientos_puntos (
  id_movimiento   INT NOT NULL AUTO_INCREMENT,
  id_cliente      INT NOT NULL,
  id_transaccion  INT NULL,
  tipo            ENUM('ganado','canjeado','ajuste') NOT NULL,
  puntos          INT NOT NULL,
  descripcion     VARCHAR(150) NULL,
  fecha           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_movimiento),
  CONSTRAINT fk_mov_cliente FOREIGN KEY (id_cliente)     REFERENCES clientes(id_cliente),
  CONSTRAINT fk_mov_trans   FOREIGN KEY (id_transaccion) REFERENCES transacciones(id_transaccion)
);

-- ============================================================
--  TOUR OPERADORES (programa de puntos B2B)
-- ============================================================
CREATE TABLE operadores_turisticos (
  id_operador       INT NOT NULL AUTO_INCREMENT,
  nombre            VARCHAR(120)  NOT NULL,
  tipo              VARCHAR(20)   NOT NULL DEFAULT 'Persona natural',
  telefono          VARCHAR(20)   NULL,
  correo            VARCHAR(120)  NULL,
  puntos_acumulados DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  id_estado         INT NOT NULL DEFAULT 1,
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_operador),
  CONSTRAINT fk_operador_estado FOREIGN KEY (id_estado) REFERENCES estados(id_estado)
);

CREATE TABLE transacciones_operador (
  id_transaccion_op  INT NOT NULL AUTO_INCREMENT,
  id_operador        INT NOT NULL,
  id_usuario         INT NOT NULL,
  num_personas       INT NOT NULL DEFAULT 0,
  puntos_personas    DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  puntos_otorgados   DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  puntos_canjeados   DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  descuento_aplicado DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  fecha              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_transaccion_op),
  CONSTRAINT fk_transop_operador FOREIGN KEY (id_operador) REFERENCES operadores_turisticos(id_operador),
  CONSTRAINT fk_transop_usuario  FOREIGN KEY (id_usuario)  REFERENCES usuarios(id_usuario),
  INDEX idx_transop_fecha (fecha)
);

-- ============================================================
--  CONFIGURACIÓN GLOBAL
-- ============================================================
CREATE TABLE configuracion (
  id_config       INT NOT NULL AUTO_INCREMENT,
  clave           VARCHAR(60)  NOT NULL UNIQUE,
  valor           VARCHAR(100) NOT NULL,
  descripcion     VARCHAR(150) NULL,
  actualizado_por INT          NULL,
  PRIMARY KEY (id_config),
  CONSTRAINT fk_config_usuario FOREIGN KEY (actualizado_por) REFERENCES usuarios(id_usuario) ON DELETE SET NULL
);

-- ============================================================
--  REFRESH TOKENS (sesiones — revocación de tokens)
-- ============================================================
CREATE TABLE refresh_tokens (
  id_token     INT NOT NULL AUTO_INCREMENT,
  id_usuario   INT NOT NULL,
  token_hash   VARCHAR(255) NOT NULL,
  user_agent   VARCHAR(255) NULL,
  ip           VARCHAR(45) NULL,
  revocado     TINYINT NOT NULL DEFAULT 0,
  expira_en    DATETIME NOT NULL,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_token),
  CONSTRAINT fk_rt_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
  INDEX idx_rt_usuario (id_usuario),
  INDEX idx_rt_token (token_hash)
);

-- ============================================================
--  ALERTAS DE CORREO ENVIADAS (retención)
--  Rastrea qué alertas ya se mandaron para no repetirlas (cooldown 30 días).
-- ============================================================
CREATE TABLE alertas_enviadas (
  id            INT          NOT NULL AUTO_INCREMENT,
  id_cliente    INT          NOT NULL,
  tipo          VARCHAR(40)  NOT NULL,
  referencia    VARCHAR(100) NULL,
  fecha_enviada DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_alertas_cliente FOREIGN KEY (id_cliente) REFERENCES clientes(id_cliente) ON DELETE CASCADE,
  INDEX idx_cliente_tipo (id_cliente, tipo, referencia)
);

-- ============================================================
--  BITÁCORA / AUDITORÍA (historial de acciones del sistema)
-- ============================================================
CREATE TABLE bitacora (
  id_bitacora   INT NOT NULL AUTO_INCREMENT,
  id_usuario    INT NULL,
  accion        VARCHAR(80) NOT NULL,
  entidad       VARCHAR(60) NULL,
  id_registro   INT NULL,
  detalle       VARCHAR(255) NULL,
  ip            VARCHAR(45) NULL,
  fecha         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_bitacora),
  CONSTRAINT fk_bitacora_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
  INDEX idx_bitacora_fecha (fecha)
);

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
  ('bienvenida_puntos',      '20',  'Puntos extra en la primera compra (bienvenida)'),
  ('bienvenida_descuento',   '2',   'Descuento en $ en la primera compra (bienvenida)'),
  ('descuento_monto_minimo', '30',  'Monto mínimo de compra para descuento por compra alta'),
  ('descuento_monto_valor',  '1',   'Descuento en $ por compra alta'),
  ('canje_activo',           '1',   'Permite canjear puntos por descuento'),
  ('bienvenida_activo',      '0',   'Activa el beneficio de bienvenida (primera compra)'),
  ('descuento_monto_activo', '0',   'Activa el descuento por compra alta');

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

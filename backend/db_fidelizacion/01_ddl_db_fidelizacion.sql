-- DDL — Fidelización (Punta Diamante) [db_fidelizacion]. Solo estructura: catálogos, ubicaciones, usuarios/clientes, fidelización y auditoría.
-- Correr PRIMERO, luego 02_dml_db_fidelizacion.sql. Acceso del cliente: OTP al correo.
CREATE DATABASE IF NOT EXISTS db_fidelizacion
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE db_fidelizacion;

-- Limpieza (orden inverso por las llaves foráneas) — re-ejecutable
DROP TABLE IF EXISTS bitacora;
DROP TABLE IF EXISTS plantillas_correo;
DROP TABLE IF EXISTS alertas_enviadas;
DROP TABLE IF EXISTS alertas_enviadas_operador;
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
  nombre            VARCHAR(40) NOT NULL UNIQUE,   -- DUI, Pasaporte
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
  fecha_nacimiento  DATE         NULL,          -- opcional
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
  pais              VARCHAR(60)  NOT NULL DEFAULT 'El Salvador',  -- país del cliente; define el código telefónico (+503, +1, ...)
  correo            VARCHAR(150) NULL,
  fecha_nacimiento  DATE         NULL,
  id_departamento   INT          NULL,
  id_distrito       INT          NULL,
  puntos_acumulados INT          NOT NULL DEFAULT 0,
  otp_hash          VARCHAR(255) NULL,            -- código de acceso (OTP) hasheado con bcrypt
  otp_expira        DATETIME     NULL,            -- vencimiento del código
  otp_intentos      INT          NOT NULL DEFAULT 0,  -- intentos de verificación del código actual
  push_token        VARCHAR(255) NULL,            -- token de notificaciones push (app móvil)
  sesion_app        VARCHAR(64)  NULL,            -- id de la sesión ACTIVA en la app (sesión única por superficie)
  sesion_portal     VARCHAR(64)  NULL,            -- id de la sesión ACTIVA en el portal web
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
  aviso_inicio_enviado TINYINT(1) NOT NULL DEFAULT 0,  -- 1 = ya se envió el correo masivo "promoción nueva" al iniciar
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
  creado_por INT          NULL,                 -- usuario del panel que creó la recompensa
  PRIMARY KEY (id),
  CONSTRAINT fk_recompensas_usuario FOREIGN KEY (creado_por) REFERENCES usuarios(id_usuario) ON DELETE SET NULL
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
  id_usuario         INT NOT NULL,                 -- cajero/recepcionista que la registró
  id_escenario       INT NULL,
  referencia_venta   VARCHAR(60) NULL,             -- N.º de folio/ticket del sistema externo
  fecha_ingreso      DATE NULL,                    -- entrada del huésped (hospedaje)
  fecha_salida       DATE NULL,                    -- salida del huésped (hospedaje)
  monto              DECIMAL(10,2) NOT NULL,
  descuento_aplicado DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  puntos_otorgados   INT NOT NULL DEFAULT 0,
  puntos_canjeados   INT NOT NULL DEFAULT 0,
  anulada            TINYINT(1) NOT NULL DEFAULT 0,  -- 1 = anulada (puntos revertidos); no cuenta en totales
  anulada_por        INT NULL,                       -- usuario que la anuló
  anulada_en         DATETIME NULL,                  -- cuándo se anuló
  motivo_anulacion   VARCHAR(255) NULL,              -- por qué se anuló (obligatorio al anular)
  fecha              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_transaccion),
  CONSTRAINT fk_trans_cliente   FOREIGN KEY (id_cliente)   REFERENCES clientes(id_cliente),
  CONSTRAINT fk_trans_usuario   FOREIGN KEY (id_usuario)   REFERENCES usuarios(id_usuario),
  CONSTRAINT fk_trans_promocion FOREIGN KEY (id_escenario) REFERENCES promociones(id_escenario),
  CONSTRAINT fk_trans_anulada_por FOREIGN KEY (anulada_por) REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
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
  puntos          INT NOT NULL,                   -- + gana / - canjea
  descripcion     VARCHAR(150) NULL,
  fecha           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_movimiento),
  CONSTRAINT fk_mov_cliente FOREIGN KEY (id_cliente)     REFERENCES clientes(id_cliente),
  CONSTRAINT fk_mov_trans   FOREIGN KEY (id_transaccion) REFERENCES transacciones(id_transaccion)
);

-- ============================================================
--  TOUR OPERADORES (programa de puntos B2B)
--  Empresas que traen grupos. Puntos DECIMAL (1.5 x persona, 0.5% consumo).
-- ============================================================
CREATE TABLE operadores_turisticos (
  id_operador       INT NOT NULL AUTO_INCREMENT,
  nombre            VARCHAR(120)  NOT NULL,
  tipo              VARCHAR(20)   NOT NULL DEFAULT 'Persona natural',  -- 'Persona natural' o 'Empresa'
  telefono          VARCHAR(20)   NULL,
  pais              VARCHAR(60)   NOT NULL DEFAULT 'El Salvador',       -- define el código de marcación del teléfono
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
  id_usuario         INT NOT NULL,                 -- recepcionista/admin que registró
  num_personas       INT NOT NULL DEFAULT 0,
  puntos_personas    DECIMAL(10,2) NOT NULL DEFAULT 0.00,  -- puntos por persona (si grupo >= mínimo)
  puntos_otorgados   DECIMAL(10,2) NOT NULL DEFAULT 0.00,  -- total
  puntos_canjeados   DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  descuento_aplicado DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  anulada            TINYINT(1) NOT NULL DEFAULT 0,   -- 1 = anulada (puntos revertidos); no cuenta en totales
  anulada_por        INT NULL,                        -- usuario que la anuló
  anulada_en         DATETIME NULL,                   -- cuándo se anuló
  motivo_anulacion   VARCHAR(255) NULL,               -- por qué se anuló (obligatorio al anular)
  fecha              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_transaccion_op),
  CONSTRAINT fk_transop_operador FOREIGN KEY (id_operador) REFERENCES operadores_turisticos(id_operador),
  CONSTRAINT fk_transop_usuario  FOREIGN KEY (id_usuario)  REFERENCES usuarios(id_usuario),
  CONSTRAINT fk_transop_anulada_por FOREIGN KEY (anulada_por) REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
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
  actualizado_por INT          NULL,            -- último usuario que modificó este valor
  PRIMARY KEY (id_config),
  CONSTRAINT fk_config_usuario FOREIGN KEY (actualizado_por) REFERENCES usuarios(id_usuario) ON DELETE SET NULL
);

-- ============================================================
--  PLANTILLAS DE CORREO (contenido editable de cada correo al cliente)
--  El MARCO (logo, colores, pie) es fijo por código; aquí se guarda solo lo
--  editable: on/off, asunto y textos, con variables tipo {nombre} {puntos}.
-- ============================================================
CREATE TABLE plantillas_correo (
  id_plantilla    INT NOT NULL AUTO_INCREMENT,
  clave           VARCHAR(40)  NOT NULL,           -- identificador interno (otp, cerca_canje, ...)
  nombre          VARCHAR(80)  NOT NULL,           -- nombre visible en el panel
  descripcion     VARCHAR(200) NULL,               -- cuándo se envía
  obligatorio     TINYINT(1)   NOT NULL DEFAULT 0, -- 1 = no se puede desactivar (ej. código de acceso)
  activo          TINYINT(1)   NOT NULL DEFAULT 1,
  asunto          VARCHAR(160) NOT NULL,
  titulo          VARCHAR(160) NOT NULL,
  intro           VARCHAR(255) NULL,               -- subtítulo bajo el título
  cuerpo          TEXT         NULL,               -- mensaje principal
  boton           VARCHAR(60)  NULL,               -- texto del botón (si el correo lo lleva)
  variables       VARCHAR(255) NULL,               -- variables disponibles (informativo para el panel)
  dias            INT          NULL,               -- ajuste numérico del correo (promo_por_finalizar: días de antelación del aviso)
  actualizado_en  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  actualizado_por INT NULL,
  PRIMARY KEY (id_plantilla),
  UNIQUE KEY uq_plantilla_clave (clave),
  CONSTRAINT fk_plantilla_usuario FOREIGN KEY (actualizado_por) REFERENCES usuarios(id_usuario) ON DELETE SET NULL
);

-- ============================================================
--  REFRESH TOKENS (sesiones — revocación de tokens)
-- ============================================================
CREATE TABLE refresh_tokens (
  id_token     INT NOT NULL AUTO_INCREMENT,
  id_usuario   INT NOT NULL,
  token_hash   VARCHAR(255) NOT NULL,             -- se guarda el HASH, nunca el token
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
--  Rastrea qué alertas ya se mandaron (cerca del canje / reactivación)
--  para no repetirlas hasta que pase el cooldown.
-- ============================================================
CREATE TABLE alertas_enviadas (
  id            INT          NOT NULL AUTO_INCREMENT,
  id_cliente    INT          NOT NULL,
  tipo          VARCHAR(40)  NOT NULL,       -- 'cerca_canje' | 'reactivacion'
  referencia    VARCHAR(100) NULL,           -- id_recompensa para cerca_canje; NULL para reactivacion
  fecha_enviada DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_alertas_cliente FOREIGN KEY (id_cliente) REFERENCES clientes(id_cliente) ON DELETE CASCADE,
  INDEX idx_cliente_tipo (id_cliente, tipo, referencia)
);

-- Alertas de retención enviadas a los OPERADORES (paralela a alertas_enviadas de clientes).
CREATE TABLE alertas_enviadas_operador (
  id            INT          NOT NULL AUTO_INCREMENT,
  id_operador   INT          NOT NULL,
  tipo          VARCHAR(40)  NOT NULL,       -- 'cerca_canje' | 'resumen'
  referencia    VARCHAR(100) NULL,           -- id_recompensa para cerca_canje; período YYYY-MM para resumen
  fecha_enviada DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_alertas_op_operador FOREIGN KEY (id_operador) REFERENCES operadores_turisticos(id_operador) ON DELETE CASCADE,
  INDEX idx_operador_tipo (id_operador, tipo, referencia)
);

-- ============================================================
--  BITÁCORA / AUDITORÍA (historial de acciones del sistema)
-- ============================================================
CREATE TABLE bitacora (
  id_bitacora   INT NOT NULL AUTO_INCREMENT,
  id_usuario    INT NULL,                          -- quién (NULL = acción anónima/sistema)
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

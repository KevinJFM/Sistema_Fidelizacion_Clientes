-- MySQL dump 10.13  Distrib 8.0.35, for Win64 (x86_64)
--
-- Host: localhost    Database: db_fidelizacion
-- ------------------------------------------------------
-- Server version	8.0.35

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `beneficios_emitidos`
--

DROP TABLE IF EXISTS `beneficios_emitidos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `beneficios_emitidos` (
  `id_beneficio` int NOT NULL AUTO_INCREMENT,
  `id_cliente` int NOT NULL,
  `id_tipo_beneficio` int NOT NULL,
  `valor` decimal(10,2) NOT NULL DEFAULT '0.00',
  `estado` enum('disponible','canjeado','vencido') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'disponible',
  `fecha_emision` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_vencimiento` date DEFAULT NULL,
  `fecha_canje` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id_beneficio`),
  KEY `fk_benef_cliente` (`id_cliente`),
  KEY `fk_benef_tipo` (`id_tipo_beneficio`),
  KEY `idx_benef_estado` (`estado`),
  CONSTRAINT `fk_benef_cliente` FOREIGN KEY (`id_cliente`) REFERENCES `clientes` (`id_cliente`),
  CONSTRAINT `fk_benef_tipo` FOREIGN KEY (`id_tipo_beneficio`) REFERENCES `tipos_beneficio` (`id_tipo_beneficio`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `beneficios_emitidos`
--

LOCK TABLES `beneficios_emitidos` WRITE;
/*!40000 ALTER TABLE `beneficios_emitidos` DISABLE KEYS */;
/*!40000 ALTER TABLE `beneficios_emitidos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bitacora`
--

DROP TABLE IF EXISTS `bitacora`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bitacora` (
  `id_bitacora` int NOT NULL AUTO_INCREMENT,
  `id_usuario` int DEFAULT NULL,
  `accion` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entidad` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `id_registro` int DEFAULT NULL,
  `detalle` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ip` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fecha` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_bitacora`),
  KEY `fk_bitacora_usuario` (`id_usuario`),
  KEY `idx_bitacora_fecha` (`fecha`),
  CONSTRAINT `fk_bitacora_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bitacora`
--

LOCK TABLES `bitacora` WRITE;
/*!40000 ALTER TABLE `bitacora` DISABLE KEYS */;
/*!40000 ALTER TABLE `bitacora` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `clientes`
--

DROP TABLE IF EXISTS `clientes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `clientes` (
  `id_cliente` int NOT NULL AUTO_INCREMENT,
  `id_tipo_documento` int NOT NULL,
  `numero_documento` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombres` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `apellidos` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `telefono` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `correo` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fecha_nacimiento` date DEFAULT NULL,
  `id_departamento` int DEFAULT NULL,
  `id_distrito` int DEFAULT NULL,
  `puntos_acumulados` int NOT NULL DEFAULT '0',
  `pin_hash` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `otp_hash` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `otp_expira` datetime DEFAULT NULL,
  `otp_intentos` int NOT NULL DEFAULT '0',
  `id_estado` int NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_cliente`),
  UNIQUE KEY `uq_cliente_documento` (`id_tipo_documento`,`numero_documento`),
  KEY `fk_clientes_estado` (`id_estado`),
  KEY `fk_clientes_departamento` (`id_departamento`),
  KEY `fk_clientes_distrito` (`id_distrito`),
  KEY `idx_clientes_documento` (`numero_documento`),
  CONSTRAINT `fk_clientes_departamento` FOREIGN KEY (`id_departamento`) REFERENCES `departamentos` (`id_departamento`),
  CONSTRAINT `fk_clientes_distrito` FOREIGN KEY (`id_distrito`) REFERENCES `distritos` (`id_distrito`),
  CONSTRAINT `fk_clientes_estado` FOREIGN KEY (`id_estado`) REFERENCES `estados` (`id_estado`),
  CONSTRAINT `fk_clientes_tipodoc` FOREIGN KEY (`id_tipo_documento`) REFERENCES `tipos_documento` (`id_tipo_documento`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `clientes`
--

LOCK TABLES `clientes` WRITE;
/*!40000 ALTER TABLE `clientes` DISABLE KEYS */;
INSERT INTO `clientes` VALUES (1,1,'12345678-9','mario','lopez','7257-9350','roberto@gmail.com',NULL,1,1,285,'$2a$10$TVH1mhn3ts2gjQdbcVxIi./XJtGbNbes/q8a2uEIVeOJtnrkTJs.q',NULL,NULL,0,1,'2026-07-01 15:58:01','2026-07-20 22:06:02'),(2,1,'12345678-8','mario','arevalo','7257-9350','arevalo@gmail.com',NULL,1,5,0,'$2a$10$O7YYjUsQI5G4N9ZmeOCzB.7Z/pSbH1ahcuR47ZJaxE.qg21fu1OVe',NULL,NULL,0,1,'2026-07-20 17:24:57','2026-07-20 21:23:26'),(3,1,'88996655-4','roberto','lopez','7257-9350','roberto.arevalo.456@gmail.com',NULL,1,5,300,'$2a$10$iYnayRrgOfI22foyepltJeKmBTWvUWi4npVFtjaNhAW.7Y6CdIdyu',NULL,NULL,0,1,'2026-07-20 21:33:40','2026-07-20 21:35:14');
/*!40000 ALTER TABLE `clientes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `configuracion`
--

DROP TABLE IF EXISTS `configuracion`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `configuracion` (
  `id_config` int NOT NULL AUTO_INCREMENT,
  `clave` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL,
  `valor` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id_config`),
  UNIQUE KEY `clave` (`clave`)
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `configuracion`
--

LOCK TABLES `configuracion` WRITE;
/*!40000 ALTER TABLE `configuracion` DISABLE KEYS */;
INSERT INTO `configuracion` VALUES (4,'bienvenida_puntos','20','Puntos extra en la primera compra (bienvenida)'),(5,'bienvenida_descuento','2','Descuento en $ en la primera compra (bienvenida)'),(6,'descuento_monto_minimo','30','Monto mínimo de compra para descuento por compra alta'),(7,'descuento_monto_valor','1','Descuento en $ por compra alta'),(8,'puntos_monto_base','1','Monto en $ de compra que se toma como base para otorgar puntos'),(9,'puntos_por_monto','1','Puntos que gana el cliente por cada monto base'),(11,'bienvenida_activo','0','Activa el beneficio de bienvenida (primera compra)'),(12,'descuento_monto_activo','0','Activa el descuento por compra alta');
/*!40000 ALTER TABLE `configuracion` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `departamentos`
--

DROP TABLE IF EXISTS `departamentos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `departamentos` (
  `id_departamento` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `pais` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'El Salvador',
  PRIMARY KEY (`id_departamento`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `departamentos`
--

LOCK TABLES `departamentos` WRITE;
/*!40000 ALTER TABLE `departamentos` DISABLE KEYS */;
INSERT INTO `departamentos` VALUES (1,'Ahuachapán','El Salvador'),(2,'Santa Ana','El Salvador'),(3,'Sonsonate','El Salvador'),(4,'Chalatenango','El Salvador'),(5,'La Libertad','El Salvador'),(6,'San Salvador','El Salvador'),(7,'Cuscatlán','El Salvador'),(8,'La Paz','El Salvador'),(9,'Cabañas','El Salvador'),(10,'San Vicente','El Salvador'),(11,'Usulután','El Salvador'),(12,'San Miguel','El Salvador'),(13,'Morazán','El Salvador'),(14,'La Unión','El Salvador');
/*!40000 ALTER TABLE `departamentos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `distritos`
--

DROP TABLE IF EXISTS `distritos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `distritos` (
  `id_distrito` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `id_municipio` int NOT NULL,
  PRIMARY KEY (`id_distrito`),
  KEY `idx_distritos_municipio` (`id_municipio`),
  CONSTRAINT `fk_distritos_municipio` FOREIGN KEY (`id_municipio`) REFERENCES `municipios` (`id_municipio`)
) ENGINE=InnoDB AUTO_INCREMENT=263 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `distritos`
--

LOCK TABLES `distritos` WRITE;
/*!40000 ALTER TABLE `distritos` DISABLE KEYS */;
INSERT INTO `distritos` VALUES (1,'Atiquizaya',1),(2,'El Refugio',1),(3,'San Lorenzo',1),(4,'Turín',1),(5,'Ahuachapán',2),(6,'Apaneca',2),(7,'Concepción de Ataco',2),(8,'Tacuba',2),(9,'Guaymango',3),(10,'Jujutla',3),(11,'San Francisco Menéndez',3),(12,'San Pedro Puxtla',3),(13,'Masahuat',4),(14,'Metapán',4),(15,'Santa Rosa Guachipilín',4),(16,'Texistepeque',4),(17,'Santa Ana',5),(18,'Coatepeque',6),(19,'El Congo',6),(20,'Candelaria de la Frontera',7),(21,'Chalchuapa',7),(22,'El Porvenir',7),(23,'San Antonio Pajonal',7),(24,'San Sebastián Salitrillo',7),(25,'Santiago de la Frontera',7),(26,'Juayúa',8),(27,'Nahuizalco',8),(28,'Salcoatitán',8),(29,'Santa Catarina Masahuat',8),(30,'Nahulingo',9),(31,'San Antonio del Monte',9),(32,'Santo Domingo de Guzmán',9),(33,'Sonsonate',9),(34,'Sonzacate',9),(35,'Armenia',10),(36,'Caluco',10),(37,'Cuisnahuat',10),(38,'Santa Isabel Ishuatán',10),(39,'Izalco',10),(40,'San Julián',10),(41,'Acajutla',11),(42,'Citalá',12),(43,'San Ignacio',12),(44,'La Palma',12),(45,'Agua Caliente',13),(46,'Dulce Nombre de María',13),(47,'El Paraíso',13),(48,'La Reina',13),(49,'Nueva Concepción',13),(50,'San Fernando',13),(51,'San Francisco Morazán',13),(52,'San Rafael',13),(53,'Santa Rita',13),(54,'Tejutla',13),(55,'Arcatao',14),(56,'Azacualpa',14),(57,'Comalapa',14),(58,'Concepción Quezaltepeque',14),(59,'Chalatenango',14),(60,'El Carrizal',14),(61,'La Laguna',14),(62,'Las Vueltas',14),(63,'Nombre de Jesús',14),(64,'Nueva Trinidad',14),(65,'Ojos de Agua',14),(66,'Potonico',14),(67,'San Antonio de la Cruz',14),(68,'San Antonio Los Ranchos',14),(69,'San Isidro Labrador',14),(70,'San Francisco Lempa',14),(71,'San José Cancasque',14),(72,'San José Las Flores',14),(73,'San Luis del Carmen',14),(74,'San Miguel de Mercedes',14),(75,'Quezaltepeque',15),(76,'San Matías',15),(77,'San Pablo Tacachico',15),(78,'Ciudad Arce',16),(79,'San Juan Opico',16),(80,'Colón',17),(81,'Jayaque',17),(82,'Sacacoyo',17),(83,'Talnique',17),(84,'Tepecoyo',17),(85,'Antiguo Cuscatlán',18),(86,'Huizúcar',18),(87,'Nuevo Cuscatlán',18),(88,'San José Villanueva',18),(89,'Zaragoza',18),(90,'Chiltiupán',19),(91,'Jicalapa',19),(92,'La Libertad',19),(93,'Tamanique',19),(94,'Teotepeque',19),(95,'Comasagua',20),(96,'Santa Tecla',20),(97,'Aguilares',21),(98,'El Paisnal',21),(99,'Guazapa',21),(100,'Apopa',22),(101,'Nejapa',22),(102,'Ilopango',23),(103,'San Martín',23),(104,'Soyapango',23),(105,'Tonacatepeque',23),(106,'Ayutuxtepeque',24),(107,'Cuscatancingo',24),(108,'Mejicanos',24),(109,'San Salvador',24),(110,'Delgado',24),(111,'Panchimalco',25),(112,'Rosario de Mora',25),(113,'San Marcos',25),(114,'Santiago Texacuangos',25),(115,'Santo Tomás',25),(116,'Oratorio de Concepción',26),(117,'San Bartolomé Perulapía',26),(118,'San José Guayabal',26),(119,'San Pedro Perulapán',26),(120,'Suchitoto',26),(121,'Candelaria',27),(122,'Cojutepeque',27),(123,'El Carmen',27),(124,'El Rosario',27),(125,'Monte San Juan',27),(126,'San Cristóbal',27),(127,'San Rafael Cedros',27),(128,'San Ramón',27),(129,'Santa Cruz Analquito',27),(130,'Santa Cruz Michapa',27),(131,'Tenancingo',27),(132,'Cuyultitán',28),(133,'Olocuilta',28),(134,'San Francisco Chinameca',28),(135,'San Juan Talpa',28),(136,'San Luis Talpa',28),(137,'San Pedro Masahuat',28),(138,'Tapalhuaca',28),(139,'El Rosario',29),(140,'Jerusalén',29),(141,'Mercedes La Ceiba',29),(142,'Paraíso de Osorio',29),(143,'San Antonio Masahuat',29),(144,'San Emigdio',29),(145,'San Juan Tepezontes',29),(146,'San Miguel Tepezontes',29),(147,'San Pedro Nonualco',29),(148,'Santa María Ostuma',29),(149,'Santiago Nonualco',29),(150,'San Luis La Herradura',29),(151,'San Juan Nonualco',30),(152,'San Rafael Obrajuelo',30),(153,'Zacatecoluca',30),(154,'Dolores',31),(155,'Guacotecti',31),(156,'San Isidro',31),(157,'Sensuntepeque',31),(158,'Victoria',31),(159,'Cinquera',32),(160,'Ilobasco',32),(161,'Jutiapa',32),(162,'Tejutepeque',32),(163,'Apastepeque',33),(164,'San Esteban Catarina',33),(165,'San Ildefonso',33),(166,'San Lorenzo',33),(167,'San Sebastián',33),(168,'Santa Clara',33),(169,'Santo Domingo',33),(170,'Guadalupe',34),(171,'San Cayetano Istepeque',34),(172,'San Vicente',34),(173,'Tecoluca',34),(174,'Tepetitán',34),(175,'Verapaz',34),(176,'Alegría',35),(177,'Berlín',35),(178,'El Triunfo',35),(179,'Estanzuelas',35),(180,'Jucuapa',35),(181,'Mercedes Umaña',35),(182,'Nueva Granada',35),(183,'San Buenaventura',35),(184,'Santiago de María',35),(185,'California',36),(186,'Concepción Batres',36),(187,'Ereguayquín',36),(188,'Jucuarán',36),(189,'Ozatlán',36),(190,'Usulután',36),(191,'San Dionisio',36),(192,'Santa Elena',36),(193,'Santa María',36),(194,'Tecapán',36),(195,'Jiquilisco',37),(196,'Puerto El Triunfo',37),(197,'San Agustín',37),(198,'San Francisco Javier',37),(199,'Carolina',38),(200,'Ciudad Barrios',38),(201,'Chapeltique',38),(202,'Nuevo Edén de San Juan',38),(203,'San Antonio del Mosco',38),(204,'San Gerardo',38),(205,'San Luis de La Reina',38),(206,'Sesori',38),(207,'Comacarán',39),(208,'Moncagua',39),(209,'Chirilagua',39),(210,'Quelepa',39),(211,'San Miguel',39),(212,'Uluazapa',39),(213,'Chinameca',40),(214,'El Tránsito',40),(215,'Lolotique',40),(216,'Nueva Guadalupe',40),(217,'San Jorge',40),(218,'San Rafael Oriente',40),(219,'Arambala',41),(220,'Cacaopera',41),(221,'Corinto',41),(222,'El Rosario',41),(223,'Joateca',41),(224,'Jocoaitique',41),(225,'Meanguera',41),(226,'Perquín',41),(227,'San Fernando',41),(228,'San Isidro',41),(229,'Torola',41),(230,'Chilanga',42),(231,'Delicias de Concepción',42),(232,'El Divisadero',42),(233,'Gualococti',42),(234,'Guatajiagua',42),(235,'Jocoro',42),(236,'Lolotiquillo',42),(237,'Osicala',42),(238,'San Carlos',42),(239,'San Francisco Gotera',42),(240,'San Simón',42),(241,'Sensembra',42),(242,'Sociedad',42),(243,'Yamabal',42),(244,'Yoloaiquín',42),(245,'Anamorós',43),(246,'Bolívar',43),(247,'Concepción de Oriente',43),(248,'El Sauce',43),(249,'Lislique',43),(250,'Nueva Esparta',43),(251,'Pasaquina',43),(252,'Polorós',43),(253,'San José La Fuente',43),(254,'Santa Rosa de Lima',43),(255,'Conchagua',44),(256,'El Carmen',44),(257,'Intipucá',44),(258,'La Unión',44),(259,'Meanguera del Golfo',44),(260,'San Alejo',44),(261,'Yayantique',44),(262,'Yucuaiquín',44);
/*!40000 ALTER TABLE `distritos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `escenarios`
--

DROP TABLE IF EXISTS `escenarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `escenarios` (
  `id_escenario` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `fecha_inicio` date DEFAULT NULL,
  `fecha_fin` date DEFAULT NULL,
  `fecha_especial` date DEFAULT NULL,
  `puntos_extra` int NOT NULL DEFAULT '0',
  `descuento_extra` decimal(10,2) NOT NULL DEFAULT '0.00',
  `max_usos_cliente` int NOT NULL DEFAULT '1',
  `activo` tinyint NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_escenario`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `escenarios`
--

LOCK TABLES `escenarios` WRITE;
/*!40000 ALTER TABLE `escenarios` DISABLE KEYS */;
/*!40000 ALTER TABLE `escenarios` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `estados`
--

DROP TABLE IF EXISTS `estados`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `estados` (
  `id_estado` int NOT NULL AUTO_INCREMENT,
  `estado` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id_estado`),
  UNIQUE KEY `estado` (`estado`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `estados`
--

LOCK TABLES `estados` WRITE;
/*!40000 ALTER TABLE `estados` DISABLE KEYS */;
INSERT INTO `estados` VALUES (1,'activo'),(2,'inactivo'),(3,'suspendido');
/*!40000 ALTER TABLE `estados` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `movimientos_puntos`
--

DROP TABLE IF EXISTS `movimientos_puntos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `movimientos_puntos` (
  `id_movimiento` int NOT NULL AUTO_INCREMENT,
  `id_cliente` int NOT NULL,
  `id_transaccion` int DEFAULT NULL,
  `tipo` enum('ganado','canjeado','ajuste') COLLATE utf8mb4_unicode_ci NOT NULL,
  `puntos` int NOT NULL,
  `descripcion` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fecha` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_movimiento`),
  KEY `fk_mov_cliente` (`id_cliente`),
  KEY `fk_mov_trans` (`id_transaccion`),
  CONSTRAINT `fk_mov_cliente` FOREIGN KEY (`id_cliente`) REFERENCES `clientes` (`id_cliente`),
  CONSTRAINT `fk_mov_trans` FOREIGN KEY (`id_transaccion`) REFERENCES `transacciones` (`id_transaccion`)
) ENGINE=InnoDB AUTO_INCREMENT=34 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `movimientos_puntos`
--

LOCK TABLES `movimientos_puntos` WRITE;
/*!40000 ALTER TABLE `movimientos_puntos` DISABLE KEYS */;
INSERT INTO `movimientos_puntos` VALUES (1,1,1,'ganado',100,'Puntos por transacción','2026-07-01 16:02:32'),(2,1,2,'ganado',60,'Puntos por transacción','2026-07-01 16:09:12'),(3,1,3,'ganado',60,'Puntos por transacción','2026-07-01 16:46:04'),(4,1,4,'ganado',62,'Puntos por transacción','2026-07-01 16:50:18'),(5,1,5,'ganado',80,'Puntos por transacción','2026-07-03 18:56:45'),(6,1,5,'canjeado',-100,'Canje de puntos','2026-07-03 18:56:45'),(7,1,6,'ganado',25,'Puntos por transacción','2026-07-03 19:01:28'),(8,1,6,'canjeado',-100,'Canje de puntos','2026-07-03 19:01:28'),(9,1,7,'ganado',800,'Puntos por transacción','2026-07-12 03:50:42'),(10,1,8,'canjeado',-700,'Canje: Pasanoche (Dom a Jue)','2026-07-12 03:51:16'),(11,1,9,'ganado',800,'Puntos por transacción','2026-07-12 03:51:38'),(12,1,10,'canjeado',-800,'Canje: Pasadía (Vie o Sáb)','2026-07-12 03:52:18'),(13,1,11,'ganado',800,'Puntos por transacción','2026-07-12 03:52:25'),(14,1,12,'canjeado',-800,'Canje: Pasadía (Vie o Sáb)','2026-07-12 03:52:55'),(15,1,13,'ganado',800,'Puntos por transacción','2026-07-12 03:52:59'),(16,1,14,'canjeado',-800,'Canje: Pasadía (Vie o Sáb)','2026-07-12 03:53:10'),(17,1,15,'ganado',100,'Puntos por transacción','2026-07-12 03:56:14'),(18,1,16,'ganado',1,'Puntos por transacción','2026-07-12 03:56:48'),(19,1,17,'ganado',1857,'Puntos por transacción','2026-07-12 03:57:15'),(20,1,18,'canjeado',-1200,'Canje: Estadía 24h · 2 personas (Vie o Sáb)','2026-07-12 03:57:40'),(21,1,19,'canjeado',-800,'Canje: Pasadía (Vie o Sáb)','2026-07-12 03:58:39'),(22,1,20,'ganado',90,'Puntos por transacción','2026-07-15 22:45:00'),(23,1,21,'ganado',90,'Puntos por transacción','2026-07-15 22:45:44'),(24,1,22,'ganado',410,'Puntos por transacción','2026-07-15 22:46:51'),(25,1,23,'ganado',80,'Puntos por transacción','2026-07-15 22:59:31'),(26,1,24,'ganado',90,'Puntos por transacción','2026-07-15 23:00:39'),(27,1,25,'ganado',80,'Puntos por transacción','2026-07-15 23:00:47'),(28,3,26,'ganado',300,'Puntos por transacción','2026-07-20 21:34:06'),(29,1,27,'canjeado',-1000,'Canje: Estadía 24h · 2 personas (Dom a Jue)','2026-07-20 21:50:29'),(30,1,28,'ganado',300,'Puntos por transacción','2026-07-20 22:03:27'),(31,1,29,'ganado',800,'Puntos por transacción','2026-07-20 22:03:34'),(32,1,30,'ganado',300,'Puntos por transacción','2026-07-20 22:03:53'),(33,1,31,'canjeado',-1200,'Canje: Estadía 24h · 2 personas (Vie o Sáb)','2026-07-20 22:06:02');
/*!40000 ALTER TABLE `movimientos_puntos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `municipios`
--

DROP TABLE IF EXISTS `municipios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `municipios` (
  `id_municipio` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `id_departamento` int NOT NULL,
  PRIMARY KEY (`id_municipio`),
  KEY `idx_municipios_departamento` (`id_departamento`),
  CONSTRAINT `fk_municipios_departamento` FOREIGN KEY (`id_departamento`) REFERENCES `departamentos` (`id_departamento`)
) ENGINE=InnoDB AUTO_INCREMENT=45 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `municipios`
--

LOCK TABLES `municipios` WRITE;
/*!40000 ALTER TABLE `municipios` DISABLE KEYS */;
INSERT INTO `municipios` VALUES (1,'Ahuachapán Norte',1),(2,'Ahuachapán Centro',1),(3,'Ahuachapán Sur',1),(4,'Santa Ana Norte',2),(5,'Santa Ana Centro',2),(6,'Santa Ana Este',2),(7,'Santa Ana Oeste',2),(8,'Sonsonate Norte',3),(9,'Sonsonate Centro',3),(10,'Sonsonate Este',3),(11,'Sonsonate Oeste',3),(12,'Chalatenango Norte',4),(13,'Chalatenango Centro',4),(14,'Chalatenango Sur',4),(15,'La Libertad Norte',5),(16,'La Libertad Centro',5),(17,'La Libertad Oeste',5),(18,'La Libertad Este',5),(19,'La Libertad Costa',5),(20,'La Libertad Sur',5),(21,'San Salvador Norte',6),(22,'San Salvador Oeste',6),(23,'San Salvador Este',6),(24,'San Salvador Centro',6),(25,'San Salvador Sur',6),(26,'Cuscatlán Norte',7),(27,'Cuscatlán Sur',7),(28,'La Paz Oeste',8),(29,'La Paz Centro',8),(30,'La Paz Este',8),(31,'Cabañas Este',9),(32,'Cabañas Oeste',9),(33,'San Vicente Norte',10),(34,'San Vicente Sur',10),(35,'Usulután Norte',11),(36,'Usulután Este',11),(37,'Usulután Oeste',11),(38,'San Miguel Norte',12),(39,'San Miguel Centro',12),(40,'San Miguel Oeste',12),(41,'Morazán Norte',13),(42,'Morazán Sur',13),(43,'La Unión Norte',14),(44,'La Unión Sur',14);
/*!40000 ALTER TABLE `municipios` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `operadores_turisticos`
--

DROP TABLE IF EXISTS `operadores_turisticos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `operadores_turisticos` (
  `id_operador` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Persona natural',
  `telefono` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `correo` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `puntos_acumulados` decimal(10,2) NOT NULL DEFAULT '0.00',
  `id_estado` int NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_operador`),
  KEY `fk_operador_estado` (`id_estado`),
  CONSTRAINT `fk_operador_estado` FOREIGN KEY (`id_estado`) REFERENCES `estados` (`id_estado`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `operadores_turisticos`
--

LOCK TABLES `operadores_turisticos` WRITE;
/*!40000 ALTER TABLE `operadores_turisticos` DISABLE KEYS */;
INSERT INTO `operadores_turisticos` VALUES (1,'mercosal','Empresa','4144-4774','mercosal@gmail.com',400.00,1,'2026-07-12 03:54:36');
/*!40000 ALTER TABLE `operadores_turisticos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `promociones`
--

DROP TABLE IF EXISTS `promociones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `promociones` (
  `id_escenario` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `fecha_inicio` date DEFAULT NULL,
  `fecha_fin` date DEFAULT NULL,
  `fecha_especial` date DEFAULT NULL,
  `puntos_extra` int NOT NULL DEFAULT '0',
  `descuento_extra` decimal(10,2) NOT NULL DEFAULT '0.00',
  `max_usos_cliente` int NOT NULL DEFAULT '1',
  `activo` tinyint NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_escenario`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `promociones`
--

LOCK TABLES `promociones` WRITE;
/*!40000 ALTER TABLE `promociones` DISABLE KEYS */;
INSERT INTO `promociones` VALUES (1,'dia del mar',NULL,NULL,'2026-07-01',10,20.00,1,1,'2026-07-01 16:08:51'),(2,'dia del mar 2','2026-07-15','2026-07-19',NULL,10,10.00,1,0,'2026-07-15 22:44:35'),(3,'dia del mar 3','2026-07-15','2026-07-19',NULL,10,10.00,1,1,'2026-07-15 23:00:29');
/*!40000 ALTER TABLE `promociones` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `recompensas`
--

DROP TABLE IF EXISTS `recompensas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `recompensas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Est├índar',
  `puntos` int NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `creado_en` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `recompensas`
--

LOCK TABLES `recompensas` WRITE;
/*!40000 ALTER TABLE `recompensas` DISABLE KEYS */;
INSERT INTO `recompensas` VALUES (1,'Pasanoche (Dom a Jue)','Estándar',700,1,'2026-07-20 17:13:39'),(2,'Pasadía (Dom a Jue)','Estándar',800,1,'2026-07-20 17:13:39'),(3,'Estadía 24h · 2 personas (Dom a Jue)','Estándar',1000,1,'2026-07-20 17:13:39'),(4,'Pasanoche (Vie o Sáb)','Estándar',800,1,'2026-07-20 17:13:39'),(5,'Pasadía (Vie o Sáb)','Estándar',800,1,'2026-07-20 17:13:39'),(6,'Estadía 24h · 2 personas (Vie o Sáb)','Estándar',1200,1,'2026-07-20 17:13:39');
/*!40000 ALTER TABLE `recompensas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `refresh_tokens`
--

DROP TABLE IF EXISTS `refresh_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `refresh_tokens` (
  `id_token` int NOT NULL AUTO_INCREMENT,
  `id_usuario` int NOT NULL,
  `token_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_agent` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ip` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `revocado` tinyint NOT NULL DEFAULT '0',
  `expira_en` datetime NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_token`),
  KEY `idx_rt_usuario` (`id_usuario`),
  CONSTRAINT `fk_rt_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `refresh_tokens`
--

LOCK TABLES `refresh_tokens` WRITE;
/*!40000 ALTER TABLE `refresh_tokens` DISABLE KEYS */;
/*!40000 ALTER TABLE `refresh_tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `id_rol` int NOT NULL AUTO_INCREMENT,
  `rol` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_rol`),
  UNIQUE KEY `rol` (`rol`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` VALUES (1,'admin','Acceso total al sistema','2026-07-01 15:24:32'),(2,'recepcionista','Front desk: registra huéspedes, consumos y consultas','2026-07-01 15:24:32'),(3,'empleado','Consulta de puntos de los huéspedes','2026-07-03 18:48:02');
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tipos_beneficio`
--

DROP TABLE IF EXISTS `tipos_beneficio`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tipos_beneficio` (
  `id_tipo_beneficio` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id_tipo_beneficio`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tipos_beneficio`
--

LOCK TABLES `tipos_beneficio` WRITE;
/*!40000 ALTER TABLE `tipos_beneficio` DISABLE KEYS */;
INSERT INTO `tipos_beneficio` VALUES (1,'Descuento porcentual','Descuento expresado en %'),(2,'Descuento fijo','Descuento de monto fijo'),(3,'Producto gratis','Producto de cortesía'),(4,'Cupón de bienvenida','Beneficio para clientes nuevos'),(5,'Cumpleaños','Beneficio por fecha de cumpleaños');
/*!40000 ALTER TABLE `tipos_beneficio` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tipos_documento`
--

DROP TABLE IF EXISTS `tipos_documento`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tipos_documento` (
  `id_tipo_documento` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id_tipo_documento`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tipos_documento`
--

LOCK TABLES `tipos_documento` WRITE;
/*!40000 ALTER TABLE `tipos_documento` DISABLE KEYS */;
INSERT INTO `tipos_documento` VALUES (1,'DUI'),(2,'Pasaporte');
/*!40000 ALTER TABLE `tipos_documento` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `transacciones`
--

DROP TABLE IF EXISTS `transacciones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `transacciones` (
  `id_transaccion` int NOT NULL AUTO_INCREMENT,
  `id_cliente` int NOT NULL,
  `id_usuario` int NOT NULL,
  `id_escenario` int DEFAULT NULL,
  `referencia_venta` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fecha_ingreso` date DEFAULT NULL,
  `fecha_salida` date DEFAULT NULL,
  `monto` decimal(10,2) NOT NULL,
  `descuento_aplicado` decimal(10,2) NOT NULL DEFAULT '0.00',
  `puntos_otorgados` int NOT NULL DEFAULT '0',
  `puntos_canjeados` int NOT NULL DEFAULT '0',
  `fecha` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_transaccion`),
  KEY `fk_trans_cliente` (`id_cliente`),
  KEY `fk_trans_usuario` (`id_usuario`),
  KEY `fk_trans_promocion` (`id_escenario`),
  KEY `idx_trans_fecha` (`fecha`),
  KEY `idx_trans_fecha_ingreso` (`fecha_ingreso`),
  CONSTRAINT `fk_trans_cliente` FOREIGN KEY (`id_cliente`) REFERENCES `clientes` (`id_cliente`),
  CONSTRAINT `fk_trans_promocion` FOREIGN KEY (`id_escenario`) REFERENCES `promociones` (`id_escenario`),
  CONSTRAINT `fk_trans_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`)
) ENGINE=InnoDB AUTO_INCREMENT=32 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `transacciones`
--

LOCK TABLES `transacciones` WRITE;
/*!40000 ALTER TABLE `transacciones` DISABLE KEYS */;
INSERT INTO `transacciones` VALUES (1,1,3,NULL,NULL,'2026-07-01','2026-07-01',80.00,2.00,100,0,'2026-07-01 16:02:32'),(2,1,3,1,NULL,'2026-07-01','2026-07-01',50.00,10.00,60,0,'2026-07-01 16:09:12'),(3,1,3,1,NULL,'2026-07-01','2026-07-01',50.00,10.00,60,0,'2026-07-01 16:46:04'),(4,1,3,1,NULL,NULL,NULL,52.00,10.40,62,0,'2026-07-01 16:50:18'),(5,1,3,NULL,NULL,'2026-07-03','2026-07-03',80.00,5.00,80,100,'2026-07-03 18:56:45'),(6,1,3,NULL,NULL,NULL,NULL,25.00,5.00,25,100,'2026-07-03 19:01:28'),(7,1,3,NULL,NULL,NULL,NULL,800.00,1.00,800,0,'2026-07-12 03:50:42'),(8,1,3,NULL,NULL,NULL,NULL,80.00,0.00,0,700,'2026-07-12 03:51:16'),(9,1,3,NULL,NULL,NULL,NULL,800.00,1.00,800,0,'2026-07-12 03:51:38'),(10,1,3,NULL,NULL,NULL,NULL,80.00,0.00,0,800,'2026-07-12 03:52:18'),(11,1,3,NULL,NULL,NULL,NULL,800.00,1.00,800,0,'2026-07-12 03:52:25'),(12,1,3,NULL,NULL,NULL,NULL,80.00,0.00,0,800,'2026-07-12 03:52:55'),(13,1,3,NULL,NULL,NULL,NULL,800.00,0.00,800,0,'2026-07-12 03:52:59'),(14,1,3,NULL,NULL,NULL,NULL,20.00,0.00,0,800,'2026-07-12 03:53:10'),(15,1,3,NULL,NULL,NULL,NULL,100.00,0.00,100,0,'2026-07-12 03:56:14'),(16,1,3,NULL,NULL,NULL,NULL,1.25,0.00,1,0,'2026-07-12 03:56:48'),(17,1,3,NULL,NULL,NULL,NULL,1857.00,0.00,1857,0,'2026-07-12 03:57:15'),(18,1,3,NULL,NULL,NULL,NULL,100.00,0.00,0,1200,'2026-07-12 03:57:40'),(19,1,3,NULL,NULL,NULL,NULL,44.00,0.00,0,800,'2026-07-12 03:58:39'),(20,1,3,2,NULL,'2026-07-15','2026-07-19',80.00,8.00,90,0,'2026-07-15 22:45:00'),(21,1,3,2,NULL,NULL,NULL,80.00,8.00,90,0,'2026-07-15 22:45:44'),(22,1,3,2,NULL,NULL,NULL,400.00,40.00,410,0,'2026-07-15 22:46:51'),(23,1,3,NULL,NULL,NULL,NULL,80.00,0.00,80,0,'2026-07-15 22:59:31'),(24,1,3,3,NULL,NULL,NULL,80.00,8.00,90,0,'2026-07-15 23:00:39'),(25,1,3,NULL,NULL,NULL,NULL,80.00,0.00,80,0,'2026-07-15 23:00:47'),(26,3,3,NULL,NULL,'2026-07-20','2026-07-22',300.00,0.00,300,0,'2026-07-20 21:34:06'),(27,1,3,NULL,NULL,'2026-07-20','2026-07-23',300.00,0.00,0,1000,'2026-07-20 21:50:29'),(28,1,3,NULL,NULL,NULL,NULL,300.00,0.00,300,0,'2026-07-20 22:03:27'),(29,1,3,NULL,NULL,NULL,NULL,800.00,0.00,800,0,'2026-07-20 22:03:34'),(30,1,3,NULL,NULL,NULL,NULL,300.00,0.00,300,0,'2026-07-20 22:03:53'),(31,1,3,NULL,NULL,NULL,NULL,300.00,0.00,0,1200,'2026-07-20 22:06:02');
/*!40000 ALTER TABLE `transacciones` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `transacciones_operador`
--

DROP TABLE IF EXISTS `transacciones_operador`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `transacciones_operador` (
  `id_transaccion_op` int NOT NULL AUTO_INCREMENT,
  `id_operador` int NOT NULL,
  `id_usuario` int NOT NULL,
  `num_personas` int NOT NULL DEFAULT '0',
  `puntos_personas` decimal(10,2) NOT NULL DEFAULT '0.00',
  `puntos_otorgados` decimal(10,2) NOT NULL DEFAULT '0.00',
  `puntos_canjeados` decimal(10,2) NOT NULL DEFAULT '0.00',
  `descuento_aplicado` decimal(10,2) NOT NULL DEFAULT '0.00',
  `fecha` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_transaccion_op`),
  KEY `fk_transop_operador` (`id_operador`),
  KEY `fk_transop_usuario` (`id_usuario`),
  CONSTRAINT `fk_transop_operador` FOREIGN KEY (`id_operador`) REFERENCES `operadores_turisticos` (`id_operador`),
  CONSTRAINT `fk_transop_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `transacciones_operador`
--

LOCK TABLES `transacciones_operador` WRITE;
/*!40000 ALTER TABLE `transacciones_operador` DISABLE KEYS */;
INSERT INTO `transacciones_operador` VALUES (1,1,3,15,100.00,100.00,0.00,0.00,'2026-07-12 03:55:05'),(2,1,3,20,100.00,100.00,0.00,0.00,'2026-07-15 23:01:27'),(3,1,3,15,100.00,100.00,0.00,0.00,'2026-07-15 23:01:34'),(4,1,3,5,100.00,100.00,0.00,0.00,'2026-07-15 23:01:51');
/*!40000 ALTER TABLE `transacciones_operador` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `usuarios`
--

DROP TABLE IF EXISTS `usuarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `usuarios` (
  `id_usuario` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `apellido` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `contrasena_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `telefono` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `fecha_nacimiento` date DEFAULT NULL,
  `id_departamento` int DEFAULT NULL,
  `id_distrito` int DEFAULT NULL,
  `id_rol` int NOT NULL,
  `id_estado` int NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_usuario`),
  UNIQUE KEY `email` (`email`),
  KEY `fk_usuarios_rol` (`id_rol`),
  KEY `fk_usuarios_estado` (`id_estado`),
  KEY `fk_usuarios_departamento` (`id_departamento`),
  KEY `fk_usuarios_distrito` (`id_distrito`),
  KEY `idx_usuarios_email` (`email`),
  CONSTRAINT `fk_usuarios_departamento` FOREIGN KEY (`id_departamento`) REFERENCES `departamentos` (`id_departamento`),
  CONSTRAINT `fk_usuarios_distrito` FOREIGN KEY (`id_distrito`) REFERENCES `distritos` (`id_distrito`),
  CONSTRAINT `fk_usuarios_estado` FOREIGN KEY (`id_estado`) REFERENCES `estados` (`id_estado`),
  CONSTRAINT `fk_usuarios_rol` FOREIGN KEY (`id_rol`) REFERENCES `roles` (`id_rol`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `usuarios`
--

LOCK TABLES `usuarios` WRITE;
/*!40000 ALTER TABLE `usuarios` DISABLE KEYS */;
INSERT INTO `usuarios` VALUES (1,'Kevin','Flores','kevin@ejemplo.com','$2a$10$23ThE8FiJLyt8WsBbZ.cjOf1YgbBpqrfrAdqfJOIIdqcv4bkpo35e','5605-0000','2000-01-01',3,39,1,1,'2026-07-01 15:25:51','2026-07-01 15:25:51'),(3,'roberto','lopez','roberto@ejemplo.com','$2a$10$shbGmf/HL8g62JqINRpfkOMopeQBdLsALnR9akTpjwlbOxDdKmH0W','5605-0000','2000-01-01',3,39,1,1,'2026-07-01 15:47:15','2026-07-01 15:47:15'),(4,'mireya ','lopez','mireya@gmail.com','$2a$10$aWRg5nrK5jX/zCdiZVB/MOzg1pRPDijhB.tKVY/sXTw/j5VFyDB6S','2547-8956','1999-06-30',1,5,2,1,'2026-07-03 18:54:37','2026-07-03 18:54:37');
/*!40000 ALTER TABLE `usuarios` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping routines for database 'db_fidelizacion'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-07-20 18:53:05

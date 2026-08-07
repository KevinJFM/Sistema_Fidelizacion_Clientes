import mysql from 'mysql2/promise';

// Zona horaria de El Salvador: UTC-6 fijo (no tiene horario de verano).
const ZONA_EL_SALVADOR = '-06:00';

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  waitForConnections: true,
  connectionLimit: 10,
  // mysql2 usa esto para convertir las fechas (TIMESTAMP/DATETIME) a/desde objetos Date
  // interpretándolas en hora de El Salvador, para que el instante siga siendo correcto.
  timezone: ZONA_EL_SALVADOR,
});

// Fijar la zona horaria de sesión en cada conexión nueva del pool. Sin esto, en el
// servidor (UTC) el CURDATE()/DATE(fecha) del dashboard tomaría el día en UTC y los
// ingresos de la tarde/noche se irían al día equivocado. Con esto, "hoy" va de las
// 12:00 a.m. a las 11:59 p.m. hora de El Salvador (dashboard, gráfico semanal y promociones).
pool.pool.on('connection', (conn) => {
  conn.query(`SET time_zone = '${ZONA_EL_SALVADOR}'`, (err) => {
    if (err) console.error('No se pudo fijar la zona horaria de la conexión:', err.message);
  });
});

export default pool;

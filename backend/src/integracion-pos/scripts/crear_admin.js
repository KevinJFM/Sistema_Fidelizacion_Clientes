// Crea un usuario admin en la base de una empresa (las bases nuevas nacen sin usuarios).
// Uso: node src/integracion-pos/scripts/crear_admin.js merasopa correo@empresa.com MiClave123 -> crea el admin en db_fidelizacion_merasopa usando el .env del backend.
import 'dotenv/config';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

const slug = (process.argv[2] || 'merasopa').toLowerCase().replace(/[^a-z0-9_]/g, '');
const correo = process.argv[3] || 'admin@merasopa.com';
const clave = process.argv[4] || 'Admin123';
const nuevaBd = `db_fidelizacion_${slug}`;

const conexion = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: nuevaBd,
});

try {
  // ¿Ya existe ese correo?
  const [existe] = await conexion.query('SELECT id_usuario FROM usuarios WHERE email = ? LIMIT 1', [correo]);
  if (existe.length) {
    console.log(`\n⚠ Ya existe un usuario con el correo "${correo}" en "${nuevaBd}". No se creó nada.\n`);
    process.exitCode = 1;
  } else {
    const [rol] = await conexion.query("SELECT id_rol FROM roles WHERE rol = 'admin' LIMIT 1");
    const [est] = await conexion.query("SELECT id_estado FROM estados WHERE estado = 'activo' LIMIT 1");
    const hash = await bcrypt.hash(clave, 10);

    await conexion.query(
      `INSERT INTO usuarios (nombre, apellido, email, contrasena_hash, telefono, id_rol, id_estado)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ['Admin', slug, correo, hash, '00000000', rol[0].id_rol, est[0].id_estado]
    );

    console.log(`\n✔ Admin creado en "${nuevaBd}".`);
    console.log(`  Correo:      ${correo}`);
    console.log(`  Contraseña:  ${clave}`);
    console.log(`  Ya puedes iniciar sesión en el panel apuntado a esa instancia.\n`);
  }
} catch (e) {
  console.error(`\n✗ Error: ${e.message}\n`);
  process.exitCode = 1;
} finally {
  await conexion.end();
}

import 'dotenv/config';
import bcrypt from 'bcryptjs';
import pool from '../config/db.js';

// Datos del admin inicial (se pueden sobreescribir con variables de entorno)
const admin = {
  nombre:           process.env.ADMIN_NOMBRE   || 'Admin',
  apellido:         process.env.ADMIN_APELLIDO || 'Principal',
  email:            process.env.ADMIN_EMAIL    || 'admin@fideliza.com',
  contrasena:       process.env.ADMIN_PASSWORD || 'Admin1234',
  telefono:         process.env.ADMIN_TELEFONO || '0000-0000',
  fecha_nacimiento: '2000-01-01',
};

async function crearAdmin() {
  try {
    const [existe] = await pool.query(
      'SELECT id_usuario FROM usuarios WHERE email = ?',
      [admin.email]
    );

    if (existe.length > 0) {
      console.log(`ℹ  El usuario ${admin.email} ya existe. No se hizo nada.`);
      return;
    }

    const contrasena_hash = await bcrypt.hash(admin.contrasena, 10);

    await pool.query(
      `INSERT INTO usuarios
        (nombre, apellido, email, contrasena_hash, telefono, fecha_nacimiento, id_rol, id_estado)
       VALUES (?, ?, ?, ?, ?, ?, 1, 1)`,  -- id_rol=1 (admin), id_estado=1 (activo)
      [admin.nombre, admin.apellido, admin.email, contrasena_hash, admin.telefono, admin.fecha_nacimiento]
    );

    console.log('✓ Usuario admin creado correctamente:');
    console.log(`   Email:      ${admin.email}`);
    console.log(`   Contraseña: ${admin.contrasena}`);
    console.log('   ⚠  Cámbiala después de iniciar sesión.');
  } catch (err) {
    console.error('✗ Error al crear el admin:', err.message);
  } finally {
    await pool.end();
  }
}

crearAdmin();

import 'dotenv/config';
import bcrypt from 'bcryptjs';
import pool from '../configuracion/bd.js';

// Datos del admin inicial (se pueden sobreescribir con variables de entorno)
const admin = {
  nombre:          process.env.ADMIN_NOMBRE       || 'roberto',
  apellido:        process.env.ADMIN_APELLIDO     || 'lopez',
  email:           process.env.ADMIN_EMAIL        || 'roberto@ejemplo.com',
  contrasena:      process.env.ADMIN_PASSWORD     || 'Mi@Password1234',
  telefono:        process.env.ADMIN_TELEFONO     || '5605-0000',
  fechaNacimiento: '2000-01-01',
  departamento:    process.env.ADMIN_DEPARTAMENTO || 'Sonsonate',
  distrito:        process.env.ADMIN_DISTRITO     || 'Izalco',
};

async function crearAdmin() {
  try {
    // Solo sirve para crear el PRIMER admin. Si ya existe cualquier administrador,
    // no se crea otro (evita una puerta trasera si el script corre en producción).
    // Los siguientes admins se crean desde el panel (/register, solo admin).
    const [admins] = await pool.query(
      `SELECT u.id_usuario FROM usuarios u
       JOIN roles r ON u.id_rol = r.id_rol
       WHERE r.rol = 'admin' LIMIT 1`
    );
    if (admins.length > 0) {
      console.log('ℹ  Ya existe un administrador. No se creó ninguno.');
      return;
    }

    // Buscar los IDs de departamento y distrito por su nombre
    const [departamentos] = await pool.query(
      'SELECT id_departamento FROM departamentos WHERE nombre = ?',
      [admin.departamento]
    );
    const [distritos] = await pool.query(
      'SELECT id_distrito FROM distritos WHERE nombre = ?',
      [admin.distrito]
    );

    const idDepartamento = departamentos[0]?.id_departamento ?? null;
    const idDistrito     = distritos[0]?.id_distrito ?? null;

    const contrasenaHash = await bcrypt.hash(admin.contrasena, 10);

    // id_rol = 1 (admin), id_estado = 1 (activo)
    await pool.query(
      `INSERT INTO usuarios
        (nombre, apellido, email, contrasena_hash, telefono, fecha_nacimiento, id_departamento, id_distrito, id_rol, id_estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1)`,
      [admin.nombre, admin.apellido, admin.email, contrasenaHash, admin.telefono, admin.fechaNacimiento, idDepartamento, idDistrito]
    );

    console.log('✓ Usuario admin creado correctamente:');
    console.log(`   Email:        ${admin.email}`);
    console.log(`   Contraseña:   (la que configuraste en .env o el valor por defecto en crearAdmin.js)`);
    console.log(`   Departamento: ${admin.departamento} (id ${idDepartamento})`);
    console.log(`   Distrito:     ${admin.distrito} (id ${idDistrito})`);
    console.log('   ⚠  Cámbiala desde el panel después de iniciar sesión.');
  } catch (err) {
    console.error('✗ Error al crear el admin:', err.message);
  } finally {
    await pool.end();
  }
}

crearAdmin();

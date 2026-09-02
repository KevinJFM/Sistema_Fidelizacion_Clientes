import pool from '../configuracion/bd.js';
import { cargarPlantilla, renderizarEjemplo, enviarCorreo, documentoPreview } from '../configuracion/correo.js';

// Gestión de las plantillas de correo (contenido editable de cada correo al cliente).
// El marco/diseño es fijo por código; aquí solo se edita on/off, asunto y textos.

// Listar todas las plantillas (para el panel de Configuración).
export const listarPlantillas = async (req, res) => {
  try {
    const [filas] = await pool.query(
      `SELECT id_plantilla, clave, nombre, descripcion, obligatorio, activo,
              asunto, titulo, intro, cuerpo, boton, variables, dias
       FROM plantillas_correo
       ORDER BY id_plantilla ASC`
    );
    return res.status(200).json(filas);
  } catch (error) {
    return res.status(500).json({ message: 'Error al listar las plantillas' });
  }
};

// Actualizar el contenido editable de una plantilla. Las obligatorias no se pueden desactivar.
export const actualizarPlantilla = async (req, res) => {
  try {
    const { clave } = req.params;
    const plantilla = await cargarPlantilla(clave);
    if (!plantilla) return res.status(404).json({ message: 'Plantilla no encontrada' });

    const asunto = (req.body.asunto ?? '').trim();
    const titulo = (req.body.titulo ?? '').trim();
    if (!asunto || !titulo) {
      return res.status(400).json({ message: 'El asunto y el título son obligatorios' });
    }

    const intro = (req.body.intro ?? '').trim() || null;
    const cuerpo = (req.body.cuerpo ?? '').trim() || null;
    // El botón solo aplica si la plantilla original lo tiene; se conserva ese "slot".
    const boton = plantilla.boton != null ? ((req.body.boton ?? '').trim() || null) : null;
    // Obligatoria (ej. código de acceso): siempre activa, no se puede apagar.
    const activo = plantilla.obligatorio ? 1 : (req.body.activo ? 1 : 0);

    // Ajuste numérico (solo plantillas que lo usan, ej. promo_por_finalizar: días de antelación).
    let dias = plantilla.dias;
    if (plantilla.dias != null && req.body.dias !== undefined) {
      const n = Number(req.body.dias);
      if (!Number.isInteger(n) || n < 1 || n > 60) {
        return res.status(400).json({ message: 'Los días de antelación deben ser un número entre 1 y 60' });
      }
      dias = n;
    }

    await pool.query(
      `UPDATE plantillas_correo
         SET activo = ?, asunto = ?, titulo = ?, intro = ?, cuerpo = ?, boton = ?, dias = ?, actualizado_por = ?
       WHERE clave = ?`,
      [activo, asunto, titulo, intro, cuerpo, boton, dias, req.usuario.id_usuario, clave]
    );

    const actualizada = await cargarPlantilla(clave);
    return res.status(200).json(actualizada);
  } catch (error) {
    return res.status(500).json({ message: 'Error al guardar la plantilla' });
  }
};

// Vista previa: renderiza la plantilla (con los cambios sin guardar del body) usando datos de
// ejemplo. Devuelve { asunto, html } para mostrarlo en el panel sin enviar nada.
export const previsualizarPlantilla = async (req, res) => {
  try {
    const { clave } = req.params;
    const plantilla = await cargarPlantilla(clave);
    if (!plantilla) return res.status(404).json({ message: 'Plantilla no encontrada' });

    // Mezcla los campos editables que manden desde el panel (edición en vivo).
    const editable = {};
    for (const campo of ['asunto', 'titulo', 'intro', 'cuerpo', 'boton', 'dias']) {
      if (req.body[campo] !== undefined) editable[campo] = req.body[campo];
    }
    const { asunto, html } = renderizarEjemplo({ ...plantilla, ...editable });
    // Documento completo para el iframe: logo en línea + tema del panel (claro/oscuro).
    return res.status(200).json({ asunto, html: documentoPreview(html, req.body.tema) });
  } catch (error) {
    return res.status(500).json({ message: 'Error al generar la vista previa' });
  }
};

// Enviar una prueba de la plantilla al correo del admin que la solicita (con datos de ejemplo).
export const enviarPruebaPlantilla = async (req, res) => {
  try {
    const { clave } = req.params;
    const plantilla = await cargarPlantilla(clave);
    if (!plantilla) return res.status(404).json({ message: 'Plantilla no encontrada' });

    const destino = req.usuario?.email;
    if (!destino) return res.status(400).json({ message: 'Tu usuario no tiene un correo para la prueba' });

    const editable = {};
    for (const campo of ['asunto', 'titulo', 'intro', 'cuerpo', 'boton', 'dias']) {
      if (req.body[campo] !== undefined) editable[campo] = req.body[campo];
    }
    const { asunto, html } = renderizarEjemplo({ ...plantilla, ...editable });
    const enviado = await enviarCorreo({ to: destino, asunto: `[PRUEBA] ${asunto}`, html });
    if (!enviado) {
      return res.status(503).json({ message: 'El correo no está configurado en el servidor (CORREO_USUARIO/CORREO_CLAVE)' });
    }
    return res.status(200).json({ message: `Enviamos una prueba a ${destino}` });
  } catch (error) {
    return res.status(500).json({ message: 'No se pudo enviar la prueba' });
  }
};

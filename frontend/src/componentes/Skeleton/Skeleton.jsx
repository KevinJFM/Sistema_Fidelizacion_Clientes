import './Skeleton.css';

// Bloque skeleton individual (barra con brillo). Se adapta a claro/oscuro con el tema.
export default function Skeleton({ width = '100%', height = 14, radius = 8, style, className = '' }) {
  return (
    <span
      className={`skeleton ${className}`}
      style={{ width, height, borderRadius: radius, ...style }}
    />
  );
}

// Filas skeleton para una tabla (usar dentro de <tbody>)
export function SkeletonFilas({ columnas, filas = 8 }) {
  return Array.from({ length: filas }).map((_, r) => (
    <tr key={r}>
      {Array.from({ length: columnas }).map((_, c) => (
        <td key={c}><Skeleton height={14} width={c === 0 ? '70%' : '85%'} /></td>
      ))}
    </tr>
  ));
}

// Skeleton de una página de CONFIGURACIÓN (tarjetas config-card): título + subtítulo
// y N tarjetas, cada una con encabezado y varios campos. Sirve para Configuración y
// para Integración POS (ambas usan las mismas clases).
export function SkeletonConfig({ tarjetas = 3, filasPorTarjeta = 3 }) {
  return (
    <div className="admin-page">
      <Skeleton width={220} height={28} radius={8} />
      <div style={{ height: 10 }} />
      <Skeleton width={420} height={14} style={{ maxWidth: '100%' }} />
      <div style={{ height: 22 }} />

      {Array.from({ length: tarjetas }).map((_, i) => (
        <div className="config-card" key={i} style={{ marginBottom: 18 }}>
          <div className="config-head">
            <div>
              <Skeleton width={180} height={18} radius={8} />
              <div style={{ height: 8 }} />
              <Skeleton width={280} height={12} style={{ maxWidth: '100%' }} />
            </div>
          </div>
          <div className="config-grid">
            {Array.from({ length: filasPorTarjeta }).map((_, r) => (
              <Skeleton key={r} height={46} radius={12} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Skeleton del PERFIL de un cliente: tarjeta (avatar + info + stats + botón) y la
// tabla de su historial. Se usa mientras carga el perfil tras buscar un cliente.
export function SkeletonPerfil({ columnas = 11, filas = 6 }) {
  return (
    <>
      <div className="perfil-cliente-card">
        <Skeleton width={64} height={64} radius="50%" />
        <div className="perfil-info">
          <Skeleton width={200} height={20} radius={8} />
          <div style={{ height: 8 }} />
          <Skeleton width={150} height={13} />
          <div style={{ height: 6 }} />
          <Skeleton width={180} height={12} />
        </div>
        <div className="perfil-stats">
          {Array.from({ length: 4 }).map((_, i) => (
            <div className="perfil-stat" key={i}>
              <Skeleton width={48} height={24} radius={8} />
              <div style={{ height: 8 }} />
              <Skeleton width={64} height={10} />
            </div>
          ))}
        </div>
        <Skeleton width={130} height={40} radius={12} />
      </div>

      <div className="table-card" style={{ marginTop: 20 }}>
        <table className="data-table">
          <thead>
            <tr>
              {Array.from({ length: columnas }).map((_, c) => (
                <th key={c}><Skeleton width="55%" height={12} /></th>
              ))}
            </tr>
          </thead>
          <tbody>
            <SkeletonFilas columnas={columnas} filas={filas} />
          </tbody>
        </table>
      </div>
    </>
  );
}

// Skeleton de un MÓDULO de lista COMPLETO: encabezado (título + subtítulo, con o sin
// botón), barra de filtros o buscador, y tabla (encabezados + filas). Se usa mientras
// carga la primera vez, para que TODA la pantalla se vea como esqueleto (no solo las filas).
//   conBoton    -> muestra el botón de acción a la derecha del título (page-head)
//   conBusqueda -> caja de búsqueda simple dentro de la tabla
//   filtros     -> nº de campos de una barra de filtros arriba (si >0, para Historial, etc.)
export function SkeletonListado({ columnas, filas = 8, conBoton = true, conBusqueda = true, filtros = 0 }) {
  return (
    <div className="admin-page">
      {conBoton ? (
        <div className="page-head">
          <div>
            <Skeleton width={180} height={28} radius={8} />
            <div style={{ height: 10 }} />
            <Skeleton width={320} height={14} />
          </div>
          <Skeleton width={150} height={44} radius={12} />
        </div>
      ) : (
        <div style={{ marginBottom: 18 }}>
          <Skeleton width={260} height={28} radius={8} />
          <div style={{ height: 10 }} />
          <Skeleton width={380} height={14} />
        </div>
      )}

      {filtros > 0 && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
          {Array.from({ length: filtros }).map((_, i) => (
            <Skeleton key={i} width={150} height={40} radius={10} />
          ))}
          <Skeleton width={100} height={40} radius={10} />
        </div>
      )}

      <div className="table-card">
        {conBusqueda && (
          <div style={{ padding: '12px 18px', borderBottom: '1px solid #f3f4f6' }}>
            <Skeleton width={360} height={40} radius={12} style={{ maxWidth: '100%' }} />
          </div>
        )}
        <table className="data-table">
          <thead>
            <tr>
              {Array.from({ length: columnas }).map((_, c) => (
                <th key={c}><Skeleton width="55%" height={12} /></th>
              ))}
            </tr>
          </thead>
          <tbody>
            <SkeletonFilas columnas={columnas} filas={filas} />
          </tbody>
        </table>
      </div>
    </div>
  );
}

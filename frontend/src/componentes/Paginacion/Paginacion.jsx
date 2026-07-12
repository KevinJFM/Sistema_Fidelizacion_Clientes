import { useEffect } from 'react';

// Cantidad de filas por página (igual para todos los módulos)
export const PAGE_SIZE = 15;

// Genera los números de página con elipsis cuando hay muchas
const getPages = (total, current) => {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, '...', total];
  if (current >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
  return [1, '...', current - 1, current, current + 1, '...', total];
};

// Paginación (mismo estilo que Usuarios). Se oculta si todo cabe en una página.
export default function Paginacion({ total, page, pageSize = PAGE_SIZE, onChange }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Si la página actual quedó fuera de rango (p. ej. tras filtrar), la corrige
  useEffect(() => {
    if (page > totalPages) onChange(totalPages);
  }, [page, totalPages, onChange]);

  if (total <= pageSize) return null;

  return (
    <div className="pagination">
      <span className="page-info">
        Mostrando {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} de {total}
      </span>

      <div className="page-controls">
        <button
          className="page-btn nav"
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          title="Anterior"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        {getPages(totalPages, page).map((p, i) =>
          p === '...' ? (
            <span key={`dots-${i}`} className="page-dots">…</span>
          ) : (
            <button
              key={p}
              className={`page-btn ${p === page ? 'active' : ''}`}
              onClick={() => onChange(p)}
            >
              {p}
            </button>
          )
        )}

        <button
          className="page-btn nav"
          onClick={() => onChange(page + 1)}
          disabled={page === totalPages}
          title="Siguiente"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
    </div>
  );
}

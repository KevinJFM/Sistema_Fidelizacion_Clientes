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

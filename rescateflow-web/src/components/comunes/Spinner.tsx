/** Indicador de carga circular. */
export function Spinner({ etiqueta = 'Cargando', tamano = 16 }: { etiqueta?: string; tamano?: number }) {
  return (
    <span className="spinner" role="status" style={{ width: tamano, height: tamano }}>
      <span className="solo-lectores">{etiqueta}</span>
    </span>
  );
}

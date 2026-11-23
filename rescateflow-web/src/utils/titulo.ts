/**
 * El backend guarda un unico campo "descripcion" (Fase 1, diccionario de datos).
 * El formulario pide titulo + descripcion y los combina asi: primera linea = titulo,
 * resto = detalle. Al mostrar, se separan de nuevo. Una descripcion de una sola
 * linea (como las del seed) se muestra completa como titulo.
 */

export function componerDescripcion(titulo: string, detalle: string): string {
  const t = titulo.trim();
  const d = detalle.trim();
  return d ? `${t}\n${d}` : t;
}

export function separarDescripcion(descripcion: string): { titulo: string; detalle: string } {
  const indice = descripcion.indexOf('\n');
  if (indice === -1) return { titulo: descripcion.trim(), detalle: '' };
  return { titulo: descripcion.slice(0, indice).trim(), detalle: descripcion.slice(indice + 1).trim() };
}

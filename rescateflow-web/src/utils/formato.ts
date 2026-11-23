/** Utilidades de formato de fechas, tiempos y numeros (zona horaria America/Bogota). */

const formatoHora = new Intl.DateTimeFormat('es-CO', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Bogota',
});

const formatoFechaHora = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  timeZone: 'America/Bogota',
});

export function hora(iso: string): string {
  return formatoHora.format(new Date(iso));
}

export function fechaHora(iso: string): string {
  return formatoFechaHora.format(new Date(iso));
}

/** "hace 3 min", "hace 2 h", "hace 4 d". */
export function tiempoTranscurrido(iso: string, ahora: number = Date.now()): string {
  const segundos = Math.max(0, Math.round((ahora - new Date(iso).getTime()) / 1000));
  if (segundos < 45) return 'hace un momento';
  const minutos = Math.round(segundos / 60);
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;
  return `hace ${Math.round(horas / 24)} d`;
}

export function kilometros(valor: number): string {
  return `${valor.toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} km`;
}

export function coordenadas(latitud: number | null, longitud: number | null): string | null {
  if (latitud === null || longitud === null) return null;
  return `${latitud.toFixed(5)}, ${longitud.toFixed(5)}`;
}

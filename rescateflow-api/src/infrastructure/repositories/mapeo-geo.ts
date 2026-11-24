import { Ubicacion } from '../../domain/entities/ubicacion';

/** Punto GeoJSON tal como lo guarda MongoDB: coordinates = [longitud, latitud]. */
export interface PuntoGeoJson {
  type: 'Point';
  coordinates: [number, number];
}

export function aPunto(ubicacion: Ubicacion): PuntoGeoJson {
  return { type: 'Point', coordinates: [ubicacion.longitud, ubicacion.latitud] };
}

export function desdePunto(punto: PuntoGeoJson): Ubicacion {
  const [longitud, latitud] = punto.coordinates;
  return new Ubicacion(latitud, longitud);
}

/** Codigo de error de MongoDB para violacion de indice unico. */
export function esClaveDuplicada(error: unknown, indice?: string): boolean {
  if (typeof error !== 'object' || error === null || (error as { code?: unknown }).code !== 11000) return false;
  return indice === undefined || String((error as { message?: unknown }).message).includes(indice);
}

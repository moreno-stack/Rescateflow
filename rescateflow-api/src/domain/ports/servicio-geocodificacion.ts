/**
 * Puerto hacia el Servicio Externo de Mapas/Geocodificacion (actor secundario).
 * Implementado por NominatimGeocodificacionAdapter y SimuladoGeocodificacionAdapter.
 */
export interface ResultadoGeocodificacion {
  latitud: number;
  longitud: number;
  direccionNormalizada: string;
  /** Nivel de confianza entre 0 y 1. */
  confianza: number;
  proveedor: 'NOMINATIM' | 'SIMULADO';
}

export interface ServicioGeocodificacion {
  /** Devuelve null si no encuentra la direccion o si el servicio falla (RN-23: no bloquea el registro). */
  geocodificar(direccion: string): Promise<ResultadoGeocodificacion | null>;
}

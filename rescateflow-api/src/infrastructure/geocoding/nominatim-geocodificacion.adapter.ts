import { ResultadoGeocodificacion, ServicioGeocodificacion } from '../../domain/ports/servicio-geocodificacion';

interface RespuestaNominatim {
  lat: string;
  lon: string;
  display_name: string;
  importance?: number;
}

/**
 * Adaptador hacia Nominatim (OpenStreetMap). Traduce su formato (lat/lon como texto,
 * display_name, importance) al ResultadoGeocodificacion del dominio.
 * Cualquier fallo de red o tiempo agotado devuelve null (RN-23: no bloquea el registro).
 */
export class NominatimGeocodificacionAdapter implements ServicioGeocodificacion {
  constructor(
    private readonly urlBase = 'https://nominatim.openstreetmap.org',
    private readonly tiempoLimiteMs = 5000,
    private readonly ciudadPorDefecto = 'Pasto, Narino, Colombia',
  ) {}

  async geocodificar(direccion: string): Promise<ResultadoGeocodificacion | null> {
    const consulta = direccion.toLowerCase().includes('pasto') ? direccion : `${direccion}, ${this.ciudadPorDefecto}`;
    const url = new URL('/search', this.urlBase);
    url.searchParams.set('q', consulta);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '1');
    url.searchParams.set('countrycodes', 'co');

    const controlador = new AbortController();
    const temporizador = setTimeout(() => controlador.abort(), this.tiempoLimiteMs);
    try {
      const respuesta = await fetch(url, {
        headers: { 'User-Agent': 'RescateFlow/1.0 (proyecto academico)', 'Accept-Language': 'es' },
        signal: controlador.signal,
      });
      if (!respuesta.ok) return null;
      const datos = (await respuesta.json()) as RespuestaNominatim[];
      const primero = datos[0];
      if (!primero) return null;
      const latitud = Number(primero.lat);
      const longitud = Number(primero.lon);
      if (!Number.isFinite(latitud) || !Number.isFinite(longitud)) return null;
      return {
        latitud,
        longitud,
        direccionNormalizada: primero.display_name,
        confianza: Math.max(0, Math.min(1, primero.importance ?? 0.5)),
        proveedor: 'NOMINATIM',
      };
    } catch {
      return null;
    } finally {
      clearTimeout(temporizador);
    }
  }
}

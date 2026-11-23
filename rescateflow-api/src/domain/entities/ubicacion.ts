import { ErrorValidacion } from '../errors/errores-dominio';

/** Rectangulo geografico que delimita la cobertura del servicio (RN-21). */
export interface AreaCobertura {
  latitudMinima: number;
  longitudMinima: number;
  latitudMaxima: number;
  longitudMaxima: number;
}

const RADIO_TIERRA_KM = 6371;

function redondear6(valor: number): number {
  return Math.round(valor * 1_000_000) / 1_000_000;
}

/**
 * Objeto de valor Ubicacion (<<value object>> en la Vista Logica).
 * Inmutable; valida rangos de coordenadas (RN-20) y calcula distancias (RN-42).
 */
export class Ubicacion {
  readonly latitud: number;
  readonly longitud: number;

  constructor(latitud: number, longitud: number) {
    if (!Number.isFinite(latitud) || latitud < -90 || latitud > 90) {
      throw new ErrorValidacion('La latitud debe estar entre -90 y 90', { latitud });
    }
    if (!Number.isFinite(longitud) || longitud < -180 || longitud > 180) {
      throw new ErrorValidacion('La longitud debe estar entre -180 y 180', { longitud });
    }
    this.latitud = redondear6(latitud);
    this.longitud = redondear6(longitud);
  }

  /** Distancia en linea recta en kilometros (formula de Haversine). */
  distanciaKmA(otra: Ubicacion): number {
    const aRad = (grados: number) => (grados * Math.PI) / 180;
    const dLat = aRad(otra.latitud - this.latitud);
    const dLon = aRad(otra.longitud - this.longitud);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(aRad(this.latitud)) * Math.cos(aRad(otra.latitud)) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(RADIO_TIERRA_KM * c * 100) / 100;
  }

  estaDentroDe(area: AreaCobertura): boolean {
    return (
      this.latitud >= area.latitudMinima &&
      this.latitud <= area.latitudMaxima &&
      this.longitud >= area.longitudMinima &&
      this.longitud <= area.longitudMaxima
    );
  }

  equals(otra: Ubicacion): boolean {
    return this.latitud === otra.latitud && this.longitud === otra.longitud;
  }
}

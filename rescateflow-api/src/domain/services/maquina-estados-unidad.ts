import { EstadoUnidad } from '../enums';
import { ErrorTransicionInvalida } from '../errors/errores-dominio';

/**
 * Tabla de transiciones de una unidad de respuesta (RN-50).
 *
 *   DISPONIBLE        -> EN_RUTA (despacho) | FUERA_DE_SERVICIO (administrador)
 *   EN_RUTA           -> OCUPADA (llegada) | DISPONIBLE (despacho/emergencia cancelados)
 *   OCUPADA           -> DISPONIBLE (despacho finalizado o emergencia cerrada)
 *   FUERA_DE_SERVICIO -> DISPONIBLE (reactivacion)
 */
export const TRANSICIONES_UNIDAD: Readonly<Record<EstadoUnidad, readonly EstadoUnidad[]>> = {
  DISPONIBLE: [EstadoUnidad.EN_RUTA, EstadoUnidad.FUERA_DE_SERVICIO],
  EN_RUTA: [EstadoUnidad.OCUPADA, EstadoUnidad.DISPONIBLE],
  OCUPADA: [EstadoUnidad.DISPONIBLE],
  FUERA_DE_SERVICIO: [EstadoUnidad.DISPONIBLE],
};

export class MaquinaEstadosUnidad {
  puedeTransicionar(desde: EstadoUnidad, hacia: EstadoUnidad): boolean {
    return TRANSICIONES_UNIDAD[desde].includes(hacia);
  }

  validarTransicion(desde: EstadoUnidad, hacia: EstadoUnidad): void {
    if (!this.puedeTransicionar(desde, hacia)) {
      throw new ErrorTransicionInvalida('Unidad', desde, hacia);
    }
  }
}

import { UnidadDeTrabajo } from '../../domain/ports/repositorios';
import { ConexionMongo } from '../database/conexion';
import { ejecutarConSesion, sesionActual } from '../database/contexto-sesion';

/**
 * Unidad de trabajo sobre una transaccion de MongoDB: si el trabajo lanza un error se aborta
 * todo (crear despacho + unidad EN_RUTA + emergencia DESPACHADA + historiales).
 *
 * MongoDB solo admite transacciones en un replica set. Con un servidor independiente
 * (instalacion por defecto en Windows) el trabajo se ejecuta sin transaccion y la consistencia
 * la siguen protegiendo el bloqueo optimista por "version" (RN-33) y el indice unico parcial (RN-53).
 */
export class MongoUnidadDeTrabajo implements UnidadDeTrabajo {
  constructor(private readonly conexion: ConexionMongo) {}

  async ejecutarEnTransaccion<T>(trabajo: () => Promise<T>): Promise<T> {
    // Transaccion anidada o servidor sin soporte: se ejecuta tal cual.
    if (sesionActual() || !this.conexion.soportaTransacciones) return trabajo();

    const sesion = this.conexion.cliente.startSession();
    try {
      return await sesion.withTransaction(() => ejecutarConSesion(sesion, trabajo), {
        readConcern: { level: 'snapshot' },
        writeConcern: { w: 'majority' },
      });
    } finally {
      await sesion.endSession();
    }
  }
}

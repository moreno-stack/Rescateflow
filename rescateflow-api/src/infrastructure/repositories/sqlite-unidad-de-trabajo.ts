import { UnidadDeTrabajo } from '../../domain/ports/repositorios';
import { BaseDatos } from '../database/conexion';

/**
 * Unidad de trabajo sobre una transaccion SQLite: si el trabajo lanza un error
 * se hace ROLLBACK de todo (crear despacho + unidad EN_RUTA + emergencia DESPACHADA + historiales).
 */
export class SqliteUnidadDeTrabajo implements UnidadDeTrabajo {
  constructor(private readonly db: BaseDatos) {}

  ejecutarEnTransaccion<T>(trabajo: () => T): T {
    return this.db.transaction(trabajo).immediate();
  }
}

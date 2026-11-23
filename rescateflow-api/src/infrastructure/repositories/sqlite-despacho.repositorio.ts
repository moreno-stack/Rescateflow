import { Despacho } from '../../domain/entities/despacho';
import { EstadoDespacho } from '../../domain/enums';
import { ErrorConflicto } from '../../domain/errors/errores-dominio';
import { DespachoRepositorio } from '../../domain/ports/repositorios';
import { BaseDatos } from '../database/conexion';

interface FilaDespacho {
  id: string;
  emergencia_id: string;
  unidad_id: string;
  despachador_id: string | null;
  estado: EstadoDespacho;
  distancia_km: number;
  tiempo_estimado_min: number;
  asignado_en: string;
  llegada_en: string | null;
  liberado_en: string | null;
  observaciones: string | null;
}

function aEntidad(f: FilaDespacho): Despacho {
  return Despacho.reconstruir({
    id: f.id,
    emergenciaId: f.emergencia_id,
    unidadId: f.unidad_id,
    despachadorId: f.despachador_id,
    estado: f.estado,
    distanciaKm: f.distancia_km,
    tiempoEstimadoMin: f.tiempo_estimado_min,
    asignadoEn: f.asignado_en,
    llegadaEn: f.llegada_en,
    liberadoEn: f.liberado_en,
    observaciones: f.observaciones,
  });
}

function aParametros(d: Despacho): Record<string, unknown> {
  const p = d.propiedades;
  return {
    id: p.id,
    emergencia_id: p.emergenciaId,
    unidad_id: p.unidadId,
    despachador_id: p.despachadorId,
    estado: p.estado,
    distancia_km: p.distanciaKm,
    tiempo_estimado_min: p.tiempoEstimadoMin,
    asignado_en: p.asignadoEn,
    llegada_en: p.llegadaEn,
    liberado_en: p.liberadoEn,
    observaciones: p.observaciones,
  };
}

/** Implementacion SQLite del puerto DespachoRepositorio. */
export class SqliteDespachoRepositorio implements DespachoRepositorio {
  constructor(private readonly db: BaseDatos) {}

  buscarPorId(id: string): Despacho | null {
    const fila = this.db.prepare('SELECT * FROM despachos WHERE id = ?').get(id) as FilaDespacho | undefined;
    return fila ? aEntidad(fila) : null;
  }

  listarPorEmergencia(emergenciaId: string): Despacho[] {
    const filas = this.db
      .prepare('SELECT * FROM despachos WHERE emergencia_id = ? ORDER BY asignado_en ASC')
      .all(emergenciaId) as FilaDespacho[];
    return filas.map(aEntidad);
  }

  listarActivosPorEmergencia(emergenciaId: string): Despacho[] {
    const filas = this.db
      .prepare("SELECT * FROM despachos WHERE emergencia_id = ? AND estado = 'ACTIVO' ORDER BY asignado_en ASC")
      .all(emergenciaId) as FilaDespacho[];
    return filas.map(aEntidad);
  }

  buscarActivoPorUnidad(unidadId: string): Despacho | null {
    const fila = this.db
      .prepare("SELECT * FROM despachos WHERE unidad_id = ? AND estado = 'ACTIVO'")
      .get(unidadId) as FilaDespacho | undefined;
    return fila ? aEntidad(fila) : null;
  }

  insertar(despacho: Despacho): void {
    try {
      this.db
        .prepare(
          `INSERT INTO despachos (id, emergencia_id, unidad_id, despachador_id, estado, distancia_km,
             tiempo_estimado_min, asignado_en, llegada_en, liberado_en, observaciones)
           VALUES (@id, @emergencia_id, @unidad_id, @despachador_id, @estado, @distancia_km,
             @tiempo_estimado_min, @asignado_en, @llegada_en, @liberado_en, @observaciones)`,
        )
        .run(aParametros(despacho));
    } catch (error) {
      // El indice unico parcial protege RN-53 incluso ante operaciones concurrentes.
      if (error instanceof Error && error.message.includes('UNIQUE constraint failed: despachos.unidad_id')) {
        throw new ErrorConflicto('UNIDAD_NO_DISPONIBLE', 'La unidad ya tiene un despacho ACTIVO (RN-53)', {
          unidadId: despacho.unidadId,
        });
      }
      throw error;
    }
  }

  actualizar(despacho: Despacho): void {
    this.db
      .prepare(
        `UPDATE despachos SET estado = @estado, llegada_en = @llegada_en, liberado_en = @liberado_en,
           observaciones = @observaciones
         WHERE id = @id`,
      )
      .run(aParametros(despacho));
  }
}

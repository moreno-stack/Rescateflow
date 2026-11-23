import { Emergencia } from '../../domain/entities/emergencia';
import { HistorialEstadoEmergencia } from '../../domain/entities/historial';
import { Ubicacion } from '../../domain/entities/ubicacion';
import {
  EstadoEmergencia,
  FuenteUbicacion,
  MotivoCancelacion,
  NivelPrioridad,
  TipoEmergencia,
} from '../../domain/enums';
import { ErrorConflicto } from '../../domain/errors/errores-dominio';
import { EmergenciaRepositorio, FiltroEmergencias } from '../../domain/ports/repositorios';
import { BaseDatos } from '../database/conexion';

interface FilaEmergencia {
  id: string;
  codigo: string;
  tipo: TipoEmergencia;
  descripcion: string;
  direccion_reportada: string;
  direccion_normalizada: string | null;
  latitud: number | null;
  longitud: number | null;
  geocodificada: number;
  fuente_ubicacion: FuenteUbicacion | null;
  nombre_reportante: string | null;
  telefono_reportante: string;
  numero_afectados: number;
  hay_riesgo_vital: number;
  hay_heridos: number;
  hay_riesgo_propagacion: number;
  puntaje_prioridad: number;
  prioridad: NivelPrioridad;
  prioridad_ajustada_manualmente: number;
  justificacion_prioridad: string | null;
  estado: EstadoEmergencia;
  motivo_cancelacion: MotivoCancelacion | null;
  detalle_cancelacion: string | null;
  emergencia_relacionada_id: string | null;
  observaciones_cierre: string | null;
  operador_id: string | null;
  despachador_id: string | null;
  reportada_en: string;
  validada_en: string | null;
  despachada_en: string | null;
  en_atencion_en: string | null;
  cerrada_en: string | null;
  cancelada_en: string | null;
  creado_en: string;
  actualizado_en: string;
  version: number;
}

interface FilaHistorial {
  id: string;
  emergencia_id: string;
  estado_anterior: EstadoEmergencia | null;
  estado_nuevo: EstadoEmergencia;
  usuario_id: string | null;
  motivo: string | null;
  ocurrido_en: string;
}

function aEntidad(f: FilaEmergencia): Emergencia {
  return Emergencia.reconstruir({
    id: f.id,
    codigo: f.codigo,
    tipo: f.tipo,
    descripcion: f.descripcion,
    direccionReportada: f.direccion_reportada,
    direccionNormalizada: f.direccion_normalizada,
    ubicacion: f.latitud !== null && f.longitud !== null ? new Ubicacion(f.latitud, f.longitud) : null,
    geocodificada: f.geocodificada === 1,
    fuenteUbicacion: f.fuente_ubicacion,
    nombreReportante: f.nombre_reportante,
    telefonoReportante: f.telefono_reportante,
    numeroAfectados: f.numero_afectados,
    hayRiesgoVital: f.hay_riesgo_vital === 1,
    hayHeridos: f.hay_heridos === 1,
    hayRiesgoPropagacion: f.hay_riesgo_propagacion === 1,
    puntajePrioridad: f.puntaje_prioridad,
    prioridad: f.prioridad,
    prioridadAjustadaManualmente: f.prioridad_ajustada_manualmente === 1,
    justificacionPrioridad: f.justificacion_prioridad,
    estado: f.estado,
    motivoCancelacion: f.motivo_cancelacion,
    detalleCancelacion: f.detalle_cancelacion,
    emergenciaRelacionadaId: f.emergencia_relacionada_id,
    observacionesCierre: f.observaciones_cierre,
    operadorId: f.operador_id,
    despachadorId: f.despachador_id,
    reportadaEn: f.reportada_en,
    validadaEn: f.validada_en,
    despachadaEn: f.despachada_en,
    enAtencionEn: f.en_atencion_en,
    cerradaEn: f.cerrada_en,
    canceladaEn: f.cancelada_en,
    creadoEn: f.creado_en,
    actualizadoEn: f.actualizado_en,
    version: f.version,
  });
}

function aParametros(e: Emergencia): Record<string, unknown> {
  const p = e.propiedades;
  return {
    id: p.id,
    codigo: p.codigo,
    tipo: p.tipo,
    descripcion: p.descripcion,
    direccion_reportada: p.direccionReportada,
    direccion_normalizada: p.direccionNormalizada,
    latitud: p.ubicacion?.latitud ?? null,
    longitud: p.ubicacion?.longitud ?? null,
    geocodificada: p.geocodificada ? 1 : 0,
    fuente_ubicacion: p.fuenteUbicacion,
    nombre_reportante: p.nombreReportante,
    telefono_reportante: p.telefonoReportante,
    numero_afectados: p.numeroAfectados,
    hay_riesgo_vital: p.hayRiesgoVital ? 1 : 0,
    hay_heridos: p.hayHeridos ? 1 : 0,
    hay_riesgo_propagacion: p.hayRiesgoPropagacion ? 1 : 0,
    puntaje_prioridad: p.puntajePrioridad,
    prioridad: p.prioridad,
    prioridad_ajustada_manualmente: p.prioridadAjustadaManualmente ? 1 : 0,
    justificacion_prioridad: p.justificacionPrioridad,
    estado: p.estado,
    motivo_cancelacion: p.motivoCancelacion,
    detalle_cancelacion: p.detalleCancelacion,
    emergencia_relacionada_id: p.emergenciaRelacionadaId,
    observaciones_cierre: p.observacionesCierre,
    operador_id: p.operadorId,
    despachador_id: p.despachadorId,
    reportada_en: p.reportadaEn,
    validada_en: p.validadaEn,
    despachada_en: p.despachadaEn,
    en_atencion_en: p.enAtencionEn,
    cerrada_en: p.cerradaEn,
    cancelada_en: p.canceladaEn,
    creado_en: p.creadoEn,
    actualizado_en: p.actualizadoEn,
    version: p.version,
  };
}

const COLUMNAS = [
  'id', 'codigo', 'tipo', 'descripcion', 'direccion_reportada', 'direccion_normalizada', 'latitud', 'longitud',
  'geocodificada', 'fuente_ubicacion', 'nombre_reportante', 'telefono_reportante', 'numero_afectados',
  'hay_riesgo_vital', 'hay_heridos', 'hay_riesgo_propagacion', 'puntaje_prioridad', 'prioridad',
  'prioridad_ajustada_manualmente', 'justificacion_prioridad', 'estado', 'motivo_cancelacion', 'detalle_cancelacion',
  'emergencia_relacionada_id', 'observaciones_cierre', 'operador_id', 'despachador_id', 'reportada_en', 'validada_en',
  'despachada_en', 'en_atencion_en', 'cerrada_en', 'cancelada_en', 'creado_en', 'actualizado_en', 'version',
] as const;

/** RN-14: CRITICA primero, luego mayor puntaje, luego la mas antigua. */
const ORDEN_COLA = `
  ORDER BY CASE prioridad WHEN 'CRITICA' THEN 0 WHEN 'ALTA' THEN 1 WHEN 'MEDIA' THEN 2 ELSE 3 END,
           puntaje_prioridad DESC,
           reportada_en ASC`;

/** Implementacion SQLite del puerto EmergenciaRepositorio. */
export class SqliteEmergenciaRepositorio implements EmergenciaRepositorio {
  constructor(private readonly db: BaseDatos) {}

  buscarPorId(id: string): Emergencia | null {
    const fila = this.db.prepare('SELECT * FROM emergencias WHERE id = ?').get(id) as FilaEmergencia | undefined;
    return fila ? aEntidad(fila) : null;
  }

  listar(filtro: FiltroEmergencias): Emergencia[] {
    const condiciones: string[] = [];
    const parametros: Record<string, string> = {};
    if (filtro.estado) {
      condiciones.push('estado = @estado');
      parametros.estado = filtro.estado;
    }
    if (filtro.prioridad) {
      condiciones.push('prioridad = @prioridad');
      parametros.prioridad = filtro.prioridad;
    }
    if (filtro.tipo) {
      condiciones.push('tipo = @tipo');
      parametros.tipo = filtro.tipo;
    }
    const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
    const filas = this.db.prepare(`SELECT * FROM emergencias ${where} ${ORDEN_COLA}`).all(parametros) as FilaEmergencia[];
    return filas.map(aEntidad);
  }

  listarActivasPorTipoDesde(tipo: TipoEmergencia, desde: string): Emergencia[] {
    const filas = this.db
      .prepare(
        `SELECT * FROM emergencias
         WHERE tipo = ? AND reportada_en >= ? AND estado NOT IN ('CERRADA','CANCELADA')
         ${ORDEN_COLA}`,
      )
      .all(tipo, desde) as FilaEmergencia[];
    return filas.map(aEntidad);
  }

  insertar(emergencia: Emergencia): void {
    const columnas = COLUMNAS.join(', ');
    const valores = COLUMNAS.map((c) => `@${c}`).join(', ');
    this.db.prepare(`INSERT INTO emergencias (${columnas}) VALUES (${valores})`).run(aParametros(emergencia));
  }

  actualizar(emergencia: Emergencia): void {
    const parametros = aParametros(emergencia);
    const asignaciones = COLUMNAS.filter((c) => c !== 'id' && c !== 'version')
      .map((c) => `${c} = @${c}`)
      .join(', ');
    const resultado = this.db
      .prepare(`UPDATE emergencias SET ${asignaciones}, version = version + 1 WHERE id = @id AND version = @version`)
      .run(parametros);
    if (resultado.changes === 0) {
      throw new ErrorConflicto(
        'CONFLICTO_VERSION',
        'La emergencia fue modificada por otra operacion; vuelva a consultarla e intente de nuevo (RN-33)',
        { emergenciaId: emergencia.id, versionEsperada: emergencia.version },
      );
    }
    emergencia.marcarPersistida();
  }

  eliminar(id: string): void {
    this.db.prepare('DELETE FROM emergencias WHERE id = ?').run(id);
  }

  siguienteConsecutivo(anio: number): number {
    const prefijo = `EMG-${anio}-`;
    const fila = this.db
      .prepare(`SELECT MAX(CAST(SUBSTR(codigo, ?) AS INTEGER)) AS maximo FROM emergencias WHERE codigo LIKE ?`)
      .get(prefijo.length + 1, `${prefijo}%`) as { maximo: number | null };
    return (fila.maximo ?? 0) + 1;
  }

  registrarHistorial(entrada: HistorialEstadoEmergencia): void {
    this.db
      .prepare(
        `INSERT INTO historial_estados_emergencia
           (id, emergencia_id, estado_anterior, estado_nuevo, usuario_id, motivo, ocurrido_en, secuencia)
         VALUES (@id, @emergenciaId, @estadoAnterior, @estadoNuevo, @usuarioId, @motivo, @ocurridoEn,
           (SELECT COALESCE(MAX(secuencia), 0) + 1 FROM historial_estados_emergencia WHERE emergencia_id = @emergenciaId))`,
      )
      .run(entrada);
  }

  listarHistorial(emergenciaId: string): HistorialEstadoEmergencia[] {
    const filas = this.db
      .prepare('SELECT * FROM historial_estados_emergencia WHERE emergencia_id = ? ORDER BY secuencia ASC')
      .all(emergenciaId) as FilaHistorial[];
    return filas.map((f) => ({
      id: f.id,
      emergenciaId: f.emergencia_id,
      estadoAnterior: f.estado_anterior,
      estadoNuevo: f.estado_nuevo,
      usuarioId: f.usuario_id,
      motivo: f.motivo,
      ocurridoEn: f.ocurrido_en,
    }));
  }
}

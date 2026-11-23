import { HistorialEstadoUnidad } from '../../domain/entities/historial';
import { Ubicacion } from '../../domain/entities/ubicacion';
import { Unidad } from '../../domain/entities/unidad';
import { EstadoUnidad, TipoUnidad } from '../../domain/enums';
import { ErrorConflicto } from '../../domain/errors/errores-dominio';
import { FiltroUnidades, UnidadRepositorio } from '../../domain/ports/repositorios';
import { BaseDatos } from '../database/conexion';

interface FilaUnidad {
  id: string;
  codigo: string;
  nombre: string;
  tipo: TipoUnidad;
  estado: EstadoUnidad;
  activa: number;
  base_nombre: string;
  latitud_base: number;
  longitud_base: number;
  latitud_actual: number;
  longitud_actual: number;
  ubicacion_actualizada_en: string;
  motivo_estado: string | null;
  usuario_responsable_id: string | null;
  creado_en: string;
  actualizado_en: string;
  version: number;
}

interface FilaHistorialUnidad {
  id: string;
  unidad_id: string;
  estado_anterior: EstadoUnidad | null;
  estado_nuevo: EstadoUnidad;
  despacho_id: string | null;
  usuario_id: string | null;
  motivo: string | null;
  ocurrido_en: string;
}

function aEntidad(f: FilaUnidad): Unidad {
  return Unidad.reconstruir({
    id: f.id,
    codigo: f.codigo,
    nombre: f.nombre,
    tipo: f.tipo,
    estado: f.estado,
    activa: f.activa === 1,
    baseNombre: f.base_nombre,
    ubicacionBase: new Ubicacion(f.latitud_base, f.longitud_base),
    ubicacionActual: new Ubicacion(f.latitud_actual, f.longitud_actual),
    ubicacionActualizadaEn: f.ubicacion_actualizada_en,
    motivoEstado: f.motivo_estado,
    usuarioResponsableId: f.usuario_responsable_id,
    creadoEn: f.creado_en,
    actualizadoEn: f.actualizado_en,
    version: f.version,
  });
}

function aParametros(u: Unidad): Record<string, unknown> {
  const p = u.propiedades;
  return {
    id: p.id,
    codigo: p.codigo,
    nombre: p.nombre,
    tipo: p.tipo,
    estado: p.estado,
    activa: p.activa ? 1 : 0,
    base_nombre: p.baseNombre,
    latitud_base: p.ubicacionBase.latitud,
    longitud_base: p.ubicacionBase.longitud,
    latitud_actual: p.ubicacionActual.latitud,
    longitud_actual: p.ubicacionActual.longitud,
    ubicacion_actualizada_en: p.ubicacionActualizadaEn,
    motivo_estado: p.motivoEstado,
    usuario_responsable_id: p.usuarioResponsableId,
    creado_en: p.creadoEn,
    actualizado_en: p.actualizadoEn,
    version: p.version,
  };
}

const COLUMNAS = [
  'id', 'codigo', 'nombre', 'tipo', 'estado', 'activa', 'base_nombre', 'latitud_base', 'longitud_base',
  'latitud_actual', 'longitud_actual', 'ubicacion_actualizada_en', 'motivo_estado', 'usuario_responsable_id',
  'creado_en', 'actualizado_en', 'version',
] as const;

/** Implementacion SQLite del puerto UnidadRepositorio. */
export class SqliteUnidadRepositorio implements UnidadRepositorio {
  constructor(private readonly db: BaseDatos) {}

  buscarPorId(id: string): Unidad | null {
    const fila = this.db.prepare('SELECT * FROM unidades WHERE id = ?').get(id) as FilaUnidad | undefined;
    return fila ? aEntidad(fila) : null;
  }

  buscarPorCodigo(codigo: string): Unidad | null {
    const fila = this.db.prepare('SELECT * FROM unidades WHERE codigo = ?').get(codigo) as FilaUnidad | undefined;
    return fila ? aEntidad(fila) : null;
  }

  listar(filtro: FiltroUnidades): Unidad[] {
    const condiciones: string[] = [];
    const parametros: Record<string, string> = {};
    if (filtro.estado) {
      condiciones.push('estado = @estado');
      parametros.estado = filtro.estado;
    }
    if (filtro.tipo) {
      condiciones.push('tipo = @tipo');
      parametros.tipo = filtro.tipo;
    }
    const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
    const filas = this.db.prepare(`SELECT * FROM unidades ${where} ORDER BY codigo ASC`).all(parametros) as FilaUnidad[];
    return filas.map(aEntidad);
  }

  insertar(unidad: Unidad): void {
    const columnas = COLUMNAS.join(', ');
    const valores = COLUMNAS.map((c) => `@${c}`).join(', ');
    this.db.prepare(`INSERT INTO unidades (${columnas}) VALUES (${valores})`).run(aParametros(unidad));
  }

  actualizar(unidad: Unidad): void {
    const asignaciones = COLUMNAS.filter((c) => c !== 'id' && c !== 'version')
      .map((c) => `${c} = @${c}`)
      .join(', ');
    const resultado = this.db
      .prepare(`UPDATE unidades SET ${asignaciones}, version = version + 1 WHERE id = @id AND version = @version`)
      .run(aParametros(unidad));
    if (resultado.changes === 0) {
      throw new ErrorConflicto(
        'CONFLICTO_VERSION',
        'La unidad fue modificada por otra operacion; vuelva a consultarla e intente de nuevo',
        { unidadId: unidad.id, versionEsperada: unidad.version },
      );
    }
    unidad.marcarPersistida();
  }

  registrarHistorial(entrada: HistorialEstadoUnidad): void {
    this.db
      .prepare(
        `INSERT INTO historial_estados_unidad
           (id, unidad_id, estado_anterior, estado_nuevo, despacho_id, usuario_id, motivo, ocurrido_en, secuencia)
         VALUES (@id, @unidadId, @estadoAnterior, @estadoNuevo, @despachoId, @usuarioId, @motivo, @ocurridoEn,
           (SELECT COALESCE(MAX(secuencia), 0) + 1 FROM historial_estados_unidad WHERE unidad_id = @unidadId))`,
      )
      .run(entrada);
  }

  listarHistorial(unidadId: string): HistorialEstadoUnidad[] {
    const filas = this.db
      .prepare('SELECT * FROM historial_estados_unidad WHERE unidad_id = ? ORDER BY secuencia ASC')
      .all(unidadId) as FilaHistorialUnidad[];
    return filas.map((f) => ({
      id: f.id,
      unidadId: f.unidad_id,
      estadoAnterior: f.estado_anterior,
      estadoNuevo: f.estado_nuevo,
      despachoId: f.despacho_id,
      usuarioId: f.usuario_id,
      motivo: f.motivo,
      ocurridoEn: f.ocurrido_en,
    }));
  }
}

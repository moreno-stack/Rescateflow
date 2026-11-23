import { Despacho } from '../entities/despacho';
import { Emergencia } from '../entities/emergencia';
import { HistorialEstadoEmergencia, HistorialEstadoUnidad } from '../entities/historial';
import { Unidad } from '../entities/unidad';
import { Usuario } from '../entities/usuario';
import { EstadoEmergencia, EstadoUnidad, NivelPrioridad, TipoEmergencia, TipoUnidad } from '../enums';

/**
 * Puertos de persistencia (patron Repository, Fase 1 seccion 6.4).
 * El dominio y la aplicacion dependen de estas interfaces, nunca de SQLite.
 * Son sincronicas porque la implementacion actual (better-sqlite3) lo es y asi
 * las transacciones de UnidadDeTrabajo son atomicas sin intercalado de peticiones.
 */

export interface FiltroEmergencias {
  estado?: EstadoEmergencia;
  prioridad?: NivelPrioridad;
  tipo?: TipoEmergencia;
}

export interface EmergenciaRepositorio {
  buscarPorId(id: string): Emergencia | null;
  listar(filtro: FiltroEmergencias): Emergencia[];
  /** Emergencias activas del mismo tipo registradas desde la fecha dada (RN-05). */
  listarActivasPorTipoDesde(tipo: TipoEmergencia, desde: string): Emergencia[];
  insertar(emergencia: Emergencia): void;
  /** Actualiza con bloqueo optimista (RN-33); lanza CONFLICTO_VERSION si la version cambio. */
  actualizar(emergencia: Emergencia): void;
  eliminar(id: string): void;
  siguienteConsecutivo(anio: number): number;
  registrarHistorial(entrada: HistorialEstadoEmergencia): void;
  listarHistorial(emergenciaId: string): HistorialEstadoEmergencia[];
}

export interface FiltroUnidades {
  estado?: EstadoUnidad;
  tipo?: TipoUnidad;
}

export interface UnidadRepositorio {
  buscarPorId(id: string): Unidad | null;
  buscarPorCodigo(codigo: string): Unidad | null;
  listar(filtro: FiltroUnidades): Unidad[];
  insertar(unidad: Unidad): void;
  actualizar(unidad: Unidad): void;
  registrarHistorial(entrada: HistorialEstadoUnidad): void;
  listarHistorial(unidadId: string): HistorialEstadoUnidad[];
}

export interface DespachoRepositorio {
  buscarPorId(id: string): Despacho | null;
  listarPorEmergencia(emergenciaId: string): Despacho[];
  listarActivosPorEmergencia(emergenciaId: string): Despacho[];
  buscarActivoPorUnidad(unidadId: string): Despacho | null;
  insertar(despacho: Despacho): void;
  actualizar(despacho: Despacho): void;
}

export interface UsuarioRepositorio {
  buscarPorId(id: string): Usuario | null;
  insertar(usuario: Usuario): void;
  listar(): Usuario[];
}

/** Ejecuta una funcion de forma atomica (todo o nada). */
export interface UnidadDeTrabajo {
  ejecutarEnTransaccion<T>(trabajo: () => T): T;
}

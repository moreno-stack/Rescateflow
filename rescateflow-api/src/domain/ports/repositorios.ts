import { Despacho } from '../entities/despacho';
import { Emergencia } from '../entities/emergencia';
import { HistorialEstadoEmergencia, HistorialEstadoUnidad } from '../entities/historial';
import { Unidad } from '../entities/unidad';
import { Usuario } from '../entities/usuario';
import { EstadoEmergencia, EstadoUnidad, NivelPrioridad, TipoEmergencia, TipoUnidad } from '../enums';

/**
 * Puertos de persistencia (patron Repository, Fase 1 seccion 6.4).
 * El dominio y la aplicacion dependen de estas interfaces, nunca de MongoDB.
 * Son asincronas (Promise) porque el acceso a la base de datos es por red.
 */

export interface FiltroEmergencias {
  estado?: EstadoEmergencia;
  prioridad?: NivelPrioridad;
  tipo?: TipoEmergencia;
}

export interface EmergenciaRepositorio {
  buscarPorId(id: string): Promise<Emergencia | null>;
  listar(filtro: FiltroEmergencias): Promise<Emergencia[]>;
  /** Emergencias activas del mismo tipo registradas desde la fecha dada (RN-05). */
  listarActivasPorTipoDesde(tipo: TipoEmergencia, desde: string): Promise<Emergencia[]>;
  insertar(emergencia: Emergencia): Promise<void>;
  /** Actualiza con bloqueo optimista (RN-33); lanza CONFLICTO_VERSION si la version cambio. */
  actualizar(emergencia: Emergencia): Promise<void>;
  eliminar(id: string): Promise<void>;
  siguienteConsecutivo(anio: number): Promise<number>;
  registrarHistorial(entrada: HistorialEstadoEmergencia): Promise<void>;
  listarHistorial(emergenciaId: string): Promise<HistorialEstadoEmergencia[]>;
}

export interface FiltroUnidades {
  estado?: EstadoUnidad;
  tipo?: TipoUnidad;
}

export interface UnidadRepositorio {
  buscarPorId(id: string): Promise<Unidad | null>;
  buscarPorCodigo(codigo: string): Promise<Unidad | null>;
  listar(filtro: FiltroUnidades): Promise<Unidad[]>;
  insertar(unidad: Unidad): Promise<void>;
  actualizar(unidad: Unidad): Promise<void>;
  registrarHistorial(entrada: HistorialEstadoUnidad): Promise<void>;
  listarHistorial(unidadId: string): Promise<HistorialEstadoUnidad[]>;
}

export interface DespachoRepositorio {
  buscarPorId(id: string): Promise<Despacho | null>;
  listarPorEmergencia(emergenciaId: string): Promise<Despacho[]>;
  listarActivosPorEmergencia(emergenciaId: string): Promise<Despacho[]>;
  buscarActivoPorUnidad(unidadId: string): Promise<Despacho | null>;
  insertar(despacho: Despacho): Promise<void>;
  actualizar(despacho: Despacho): Promise<void>;
}

export interface UsuarioRepositorio {
  buscarPorId(id: string): Promise<Usuario | null>;
  insertar(usuario: Usuario): Promise<void>;
  listar(): Promise<Usuario[]>;
}

/** Ejecuta una funcion de forma atomica (todo o nada). */
export interface UnidadDeTrabajo {
  ejecutarEnTransaccion<T>(trabajo: () => Promise<T>): Promise<T>;
}

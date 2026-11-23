import { EstadoEmergencia, EstadoUnidad } from '../enums';

/** Registro de auditoria de un cambio de estado de emergencia (RN-32). */
export interface HistorialEstadoEmergencia {
  id: string;
  emergenciaId: string;
  estadoAnterior: EstadoEmergencia | null;
  estadoNuevo: EstadoEmergencia;
  usuarioId: string | null;
  motivo: string | null;
  ocurridoEn: string;
}

/** Registro de auditoria de un cambio de estado de unidad (RN-51). */
export interface HistorialEstadoUnidad {
  id: string;
  unidadId: string;
  estadoAnterior: EstadoUnidad | null;
  estadoNuevo: EstadoUnidad;
  despachoId: string | null;
  usuarioId: string | null;
  motivo: string | null;
  ocurridoEn: string;
}

/** Cambio de estado producido por un metodo de una entidad; la capa de aplicacion lo convierte en historial. */
export interface CambioEstado<E extends string> {
  estadoAnterior: E | null;
  estadoNuevo: E;
  motivo: string | null;
  ocurridoEn: string;
}

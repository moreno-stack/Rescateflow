/**
 * Tipos del dominio RescateFlow. Reflejan EXACTAMENTE los JSON que devuelve
 * el backend de la Fase 3 (presentadores en rescateflow-api/src/presentation).
 */

export const TIPOS_EMERGENCIA = [
  'INCENDIO',
  'MATERIALES_PELIGROSOS',
  'EMERGENCIA_MEDICA',
  'DESASTRE_NATURAL',
  'ACCIDENTE_TRANSITO',
  'SEGURIDAD',
  'OTRO',
] as const;
export type TipoEmergencia = (typeof TIPOS_EMERGENCIA)[number];

export const NIVELES_PRIORIDAD = ['CRITICA', 'ALTA', 'MEDIA', 'BAJA'] as const;
export type NivelPrioridad = (typeof NIVELES_PRIORIDAD)[number];

export const ESTADOS_EMERGENCIA = ['REPORTADA', 'VALIDADA', 'DESPACHADA', 'EN_ATENCION', 'CERRADA', 'CANCELADA'] as const;
export type EstadoEmergencia = (typeof ESTADOS_EMERGENCIA)[number];

export const MOTIVOS_CANCELACION = [
  'FALSA_ALARMA',
  'DUPLICADA',
  'RESUELTA_SIN_INTERVENCION',
  'FUERA_DE_JURISDICCION',
  'OTRO',
] as const;
export type MotivoCancelacion = (typeof MOTIVOS_CANCELACION)[number];

export const TIPOS_UNIDAD = ['AMBULANCIA', 'BOMBEROS', 'POLICIA', 'RESCATE'] as const;
export type TipoUnidad = (typeof TIPOS_UNIDAD)[number];

export const ESTADOS_UNIDAD = ['DISPONIBLE', 'EN_RUTA', 'OCUPADA', 'FUERA_DE_SERVICIO'] as const;
export type EstadoUnidad = (typeof ESTADOS_UNIDAD)[number];

export type EstadoDespacho = 'ACTIVO' | 'FINALIZADO' | 'CANCELADO';
export type FuenteUbicacion = 'GEOCODIFICACION' | 'MANUAL';

/** Respuesta de GET /api/emergencias (cada item) y de PATCH /estado. */
export interface Emergencia {
  id: string;
  codigo: string;
  tipo: TipoEmergencia;
  descripcion: string;
  direccionReportada: string;
  direccionNormalizada: string | null;
  latitud: number | null;
  longitud: number | null;
  geocodificada: boolean;
  fuenteUbicacion: FuenteUbicacion | null;
  nombreReportante: string | null;
  telefonoReportante: string;
  numeroAfectados: number;
  hayRiesgoVital: boolean;
  hayHeridos: boolean;
  hayRiesgoPropagacion: boolean;
  puntajePrioridad: number;
  prioridad: NivelPrioridad;
  prioridadAjustadaManualmente: boolean;
  justificacionPrioridad: string | null;
  estado: EstadoEmergencia;
  motivoCancelacion: MotivoCancelacion | null;
  detalleCancelacion: string | null;
  emergenciaRelacionadaId: string | null;
  observacionesCierre: string | null;
  operadorId: string | null;
  despachadorId: string | null;
  reportadaEn: string;
  validadaEn: string | null;
  despachadaEn: string | null;
  enAtencionEn: string | null;
  cerradaEn: string | null;
  canceladaEn: string | null;
  creadoEn: string;
  actualizadoEn: string;
  version: number;
  fueraDeSla: boolean;
  transicionesPermitidas: EstadoEmergencia[];
}

/** Respuesta de POST /api/emergencias. */
export interface EmergenciaCreada extends Emergencia {
  advertencias: string[];
  posiblesDuplicados: string[];
}

export interface HistorialEstadoEmergencia {
  id: string;
  emergenciaId: string;
  estadoAnterior: EstadoEmergencia | null;
  estadoNuevo: EstadoEmergencia;
  usuarioId: string | null;
  motivo: string | null;
  ocurridoEn: string;
}

export interface Despacho {
  id: string;
  emergenciaId: string;
  unidadId: string;
  despachadorId: string | null;
  estado: EstadoDespacho;
  distanciaKm: number;
  tiempoEstimadoMin: number;
  asignadoEn: string;
  llegadaEn: string | null;
  liberadoEn: string | null;
  observaciones: string | null;
}

/** Respuesta de GET /api/emergencias/:id. */
export interface EmergenciaDetalle extends Emergencia {
  historial: HistorialEstadoEmergencia[];
  despachos: Array<Despacho & { unidad: { id: string; codigo: string; tipo: TipoUnidad; estado: EstadoUnidad } | null }>;
}

export interface Unidad {
  id: string;
  codigo: string;
  nombre: string;
  tipo: TipoUnidad;
  estado: EstadoUnidad;
  activa: boolean;
  baseNombre: string;
  latitudBase: number;
  longitudBase: number;
  latitudActual: number;
  longitudActual: number;
  ubicacionActualizadaEn: string;
  motivoEstado: string | null;
  usuarioResponsableId: string | null;
  creadoEn: string;
  actualizadoEn: string;
  version: number;
}

/** Item de GET /api/unidades. */
export interface UnidadConEstado extends Unidad {
  ubicacionDesactualizada: boolean;
  despachoActivo: {
    id: string;
    emergenciaId: string;
    codigoEmergencia: string | null;
    prioridadEmergencia: NivelPrioridad | null;
    asignadoEn: string;
    llegadaEn: string | null;
  } | null;
}

export interface UnidadSugerida {
  unidad: Unidad;
  distanciaKm: number;
  tiempoEstimadoMin: number;
  esTipoPrincipal: boolean;
  advertencias: string[];
}

export interface ListaEmergencias {
  total: number;
  filtros: FiltrosEmergencias;
  datos: Emergencia[];
}

export interface ListaUnidades {
  total: number;
  resumenPorEstado: Partial<Record<EstadoUnidad, number>>;
  filtros: { estado?: EstadoUnidad; tipo?: TipoUnidad };
  datos: UnidadConEstado[];
}

export interface ListaSugerencias {
  total: number;
  motivo: string | null;
  datos: UnidadSugerida[];
}

export interface ResultadoAsignacion {
  mensaje: string;
  esRefuerzo: boolean;
  emergencia: Emergencia;
  unidad: Unidad;
  despacho: Despacho;
}

/** Formato uniforme de error del backend. */
export interface CuerpoError {
  statusCode: number;
  error: string;
  message: string;
  timestamp: string;
  path?: string;
  codigo?: string;
  detalles?: unknown;
}

// ------------------------------------------------------------------ peticiones

export interface FiltrosEmergencias {
  estado?: EstadoEmergencia;
  prioridad?: NivelPrioridad;
  tipo?: TipoEmergencia;
}

/** Cuerpo de POST /api/emergencias. */
export interface NuevaEmergencia {
  tipo: TipoEmergencia;
  descripcion: string;
  direccionReportada: string;
  nombreReportante?: string | null;
  telefonoReportante: string;
  numeroAfectados: number;
  hayRiesgoVital: boolean;
  hayHeridos: boolean;
  hayRiesgoPropagacion: boolean;
  latitud?: number;
  longitud?: number;
}

/** Cuerpo de PATCH /api/emergencias/:id/estado. */
export interface CambioEstado {
  estado: EstadoEmergencia;
  motivo?: string;
  prioridad?: NivelPrioridad;
  justificacionPrioridad?: string;
  motivoCancelacion?: MotivoCancelacion;
  detalleCancelacion?: string;
  emergenciaRelacionadaId?: string;
  observacionesCierre?: string;
  unidadId?: string;
}

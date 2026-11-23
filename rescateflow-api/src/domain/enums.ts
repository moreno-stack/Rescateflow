/**
 * Enumeraciones del dominio RescateFlow (Fase 1, seccion 7.2).
 * Se definen como objetos constantes + tipos union para poder usarlas
 * tanto en tiempo de compilacion como en validaciones en tiempo de ejecucion.
 */

export const RolUsuario = {
  OPERADOR: 'OPERADOR',
  DESPACHADOR: 'DESPACHADOR',
  UNIDAD: 'UNIDAD',
  ADMINISTRADOR: 'ADMINISTRADOR',
} as const;
export type RolUsuario = (typeof RolUsuario)[keyof typeof RolUsuario];

export const TipoEmergencia = {
  INCENDIO: 'INCENDIO',
  MATERIALES_PELIGROSOS: 'MATERIALES_PELIGROSOS',
  EMERGENCIA_MEDICA: 'EMERGENCIA_MEDICA',
  DESASTRE_NATURAL: 'DESASTRE_NATURAL',
  ACCIDENTE_TRANSITO: 'ACCIDENTE_TRANSITO',
  SEGURIDAD: 'SEGURIDAD',
  OTRO: 'OTRO',
} as const;
export type TipoEmergencia = (typeof TipoEmergencia)[keyof typeof TipoEmergencia];

export const NivelPrioridad = {
  CRITICA: 'CRITICA',
  ALTA: 'ALTA',
  MEDIA: 'MEDIA',
  BAJA: 'BAJA',
} as const;
export type NivelPrioridad = (typeof NivelPrioridad)[keyof typeof NivelPrioridad];

export const EstadoEmergencia = {
  REPORTADA: 'REPORTADA',
  VALIDADA: 'VALIDADA',
  DESPACHADA: 'DESPACHADA',
  EN_ATENCION: 'EN_ATENCION',
  CERRADA: 'CERRADA',
  CANCELADA: 'CANCELADA',
} as const;
export type EstadoEmergencia = (typeof EstadoEmergencia)[keyof typeof EstadoEmergencia];

export const MotivoCancelacion = {
  FALSA_ALARMA: 'FALSA_ALARMA',
  DUPLICADA: 'DUPLICADA',
  RESUELTA_SIN_INTERVENCION: 'RESUELTA_SIN_INTERVENCION',
  FUERA_DE_JURISDICCION: 'FUERA_DE_JURISDICCION',
  OTRO: 'OTRO',
} as const;
export type MotivoCancelacion = (typeof MotivoCancelacion)[keyof typeof MotivoCancelacion];

export const FuenteUbicacion = {
  GEOCODIFICACION: 'GEOCODIFICACION',
  MANUAL: 'MANUAL',
} as const;
export type FuenteUbicacion = (typeof FuenteUbicacion)[keyof typeof FuenteUbicacion];

export const TipoUnidad = {
  AMBULANCIA: 'AMBULANCIA',
  BOMBEROS: 'BOMBEROS',
  POLICIA: 'POLICIA',
  RESCATE: 'RESCATE',
} as const;
export type TipoUnidad = (typeof TipoUnidad)[keyof typeof TipoUnidad];

export const EstadoUnidad = {
  DISPONIBLE: 'DISPONIBLE',
  EN_RUTA: 'EN_RUTA',
  OCUPADA: 'OCUPADA',
  FUERA_DE_SERVICIO: 'FUERA_DE_SERVICIO',
} as const;
export type EstadoUnidad = (typeof EstadoUnidad)[keyof typeof EstadoUnidad];

export const EstadoDespacho = {
  ACTIVO: 'ACTIVO',
  FINALIZADO: 'FINALIZADO',
  CANCELADO: 'CANCELADO',
} as const;
export type EstadoDespacho = (typeof EstadoDespacho)[keyof typeof EstadoDespacho];

/** Devuelve los valores de una enumeracion como tupla no vacia (util para z.enum). */
export function valoresDe<T extends Record<string, string>>(enumeracion: T): [T[keyof T], ...T[keyof T][]] {
  return Object.values(enumeracion) as [T[keyof T], ...T[keyof T][]];
}

/** Orden de prioridad de mayor a menor (RN-14). */
export const ORDEN_PRIORIDAD: Record<NivelPrioridad, number> = {
  CRITICA: 0,
  ALTA: 1,
  MEDIA: 2,
  BAJA: 3,
};

import { NivelPrioridad } from '../enums';

/** Tiempos objetivo (en minutos) por nivel de prioridad (Fase 1, seccion 4.2). */
export const SLA_MINUTOS: Readonly<Record<NivelPrioridad, { despacho: number; llegada: number }>> = {
  CRITICA: { despacho: 2, llegada: 8 },
  ALTA: { despacho: 5, llegada: 15 },
  MEDIA: { despacho: 15, llegada: 30 },
  BAJA: { despacho: 30, llegada: 60 },
};

/** RN-43: maximo de despachos ACTIVO por emergencia. */
export const MAX_DESPACHOS_ACTIVOS = 5;

/** RN-43: minutos tras los cuales la ubicacion de una unidad se considera desactualizada. */
export const MINUTOS_UBICACION_DESACTUALIZADA = 30;

/** Longitud minima de textos obligatorios (observaciones, justificaciones). */
export const LONGITUD_MINIMA_TEXTO = 10;

/** Minutos transcurridos entre dos fechas ISO o Date. */
export function minutosEntre(desde: Date, hasta: Date): number {
  return (hasta.getTime() - desde.getTime()) / 60000;
}

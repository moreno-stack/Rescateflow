import { NivelPrioridad, ORDEN_PRIORIDAD, TipoEmergencia } from '../enums';
import { ErrorReglaNegocio } from '../errors/errores-dominio';

/** Datos de la emergencia que intervienen en el calculo de prioridad. */
export interface DatosPrioridad {
  tipo: TipoEmergencia;
  numeroAfectados: number;
  hayRiesgoVital: boolean;
  hayHeridos: boolean;
  hayRiesgoPropagacion: boolean;
}

export interface ResultadoPrioridad {
  puntajePrioridad: number;
  prioridad: NivelPrioridad;
  /** Regla de forzado aplicada (RN-13), si la hubo. */
  reglaForzado: string | null;
}

/** RN-10: puntaje base por tipo de emergencia. */
export const PUNTAJE_BASE: Record<TipoEmergencia, number> = {
  INCENDIO: 40,
  MATERIALES_PELIGROSOS: 40,
  EMERGENCIA_MEDICA: 35,
  DESASTRE_NATURAL: 35,
  ACCIDENTE_TRANSITO: 30,
  SEGURIDAD: 25,
  OTRO: 10,
};

/** RN-11: factores agravantes. */
export const AGRAVANTES = {
  RIESGO_VITAL: 45,
  RIESGO_PROPAGACION: 20,
  HERIDOS: 15,
  AFECTADOS_2_A_5: 10,
  AFECTADOS_6_A_20: 20,
  AFECTADOS_MAS_DE_20: 30,
} as const;

function puntosPorAfectados(numeroAfectados: number): number {
  if (numeroAfectados > 20) return AGRAVANTES.AFECTADOS_MAS_DE_20;
  if (numeroAfectados >= 6) return AGRAVANTES.AFECTADOS_6_A_20;
  if (numeroAfectados >= 2) return AGRAVANTES.AFECTADOS_2_A_5;
  return 0;
}

/** RN-12: conversion de puntaje a nivel. */
export function nivelDesdePuntaje(puntaje: number): NivelPrioridad {
  if (puntaje >= 80) return NivelPrioridad.CRITICA;
  if (puntaje >= 55) return NivelPrioridad.ALTA;
  if (puntaje >= 30) return NivelPrioridad.MEDIA;
  return NivelPrioridad.BAJA;
}

function esMasAlta(a: NivelPrioridad, b: NivelPrioridad): boolean {
  return ORDEN_PRIORIDAD[a] < ORDEN_PRIORIDAD[b];
}

/**
 * Servicio de dominio que aplica las reglas RN-10 a RN-13 y RN-16.
 * Es una "fabricacion pura" (GRASP): no tiene estado ni dependencias externas.
 */
export class CalculadoraPrioridad {
  calcular(datos: DatosPrioridad): ResultadoPrioridad {
    let puntaje = PUNTAJE_BASE[datos.tipo];
    if (datos.hayRiesgoVital) puntaje += AGRAVANTES.RIESGO_VITAL;
    if (datos.hayRiesgoPropagacion) puntaje += AGRAVANTES.RIESGO_PROPAGACION;
    if (datos.hayHeridos) puntaje += AGRAVANTES.HERIDOS;
    puntaje += puntosPorAfectados(datos.numeroAfectados);
    puntaje = Math.min(100, puntaje);

    let prioridad = nivelDesdePuntaje(puntaje);
    let reglaForzado: string | null = null;

    // RN-13: reglas de forzado (precedencia sobre el puntaje)
    if (datos.hayRiesgoVital && datos.numeroAfectados >= 3) {
      if (prioridad !== NivelPrioridad.CRITICA) reglaForzado = 'RN-13.1 riesgo vital con 3 o mas afectados';
      prioridad = NivelPrioridad.CRITICA;
    } else if (datos.tipo === TipoEmergencia.MATERIALES_PELIGROSOS && datos.hayRiesgoPropagacion) {
      if (prioridad !== NivelPrioridad.CRITICA) reglaForzado = 'RN-13.2 materiales peligrosos con propagacion';
      prioridad = NivelPrioridad.CRITICA;
    } else if (datos.hayRiesgoVital && esMasAlta(NivelPrioridad.ALTA, prioridad)) {
      reglaForzado = 'RN-13.3 riesgo vital: minimo ALTA';
      prioridad = NivelPrioridad.ALTA;
    }

    return { puntajePrioridad: puntaje, prioridad, reglaForzado };
  }

  /**
   * RN-16: limites del ajuste manual de prioridad.
   * - Con riesgo vital no se puede bajar de ALTA.
   * - Si una regla de forzado exige CRITICA, solo se puede bajar un nivel (ALTA).
   */
  validarAjuste(datos: DatosPrioridad, nivelSolicitado: NivelPrioridad): void {
    if (datos.hayRiesgoVital && esMasAlta(NivelPrioridad.ALTA, nivelSolicitado)) {
      throw new ErrorReglaNegocio(
        'PRIORIDAD_NO_PERMITIDA',
        'Una emergencia con riesgo vital no puede tener prioridad menor que ALTA (RN-16)',
        { nivelSolicitado, minimoPermitido: NivelPrioridad.ALTA },
      );
    }
    const forzadaCritica =
      (datos.hayRiesgoVital && datos.numeroAfectados >= 3) ||
      (datos.tipo === TipoEmergencia.MATERIALES_PELIGROSOS && datos.hayRiesgoPropagacion);
    if (forzadaCritica && esMasAlta(NivelPrioridad.ALTA, nivelSolicitado)) {
      throw new ErrorReglaNegocio(
        'PRIORIDAD_NO_PERMITIDA',
        'Esta emergencia cumple una regla de forzado a CRITICA; solo puede bajarse hasta ALTA (RN-16)',
        { nivelSolicitado, minimoPermitido: NivelPrioridad.ALTA },
      );
    }
  }
}

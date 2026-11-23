import type { NivelPrioridad, TipoEmergencia } from '../types/dominio';

/**
 * Vista previa de la prioridad mientras se llena el formulario.
 * Replica las reglas RN-10 a RN-13 de la Fase 1; la prioridad oficial
 * SIEMPRE la calcula el backend al registrar la emergencia.
 */

const PUNTAJE_BASE: Record<TipoEmergencia, number> = {
  INCENDIO: 40,
  MATERIALES_PELIGROSOS: 40,
  EMERGENCIA_MEDICA: 35,
  DESASTRE_NATURAL: 35,
  ACCIDENTE_TRANSITO: 30,
  SEGURIDAD: 25,
  OTRO: 10,
};

export interface DatosTriaje {
  tipo: TipoEmergencia;
  numeroAfectados: number;
  hayRiesgoVital: boolean;
  hayHeridos: boolean;
  hayRiesgoPropagacion: boolean;
}

export interface Estimacion {
  puntaje: number;
  prioridad: NivelPrioridad;
  razones: string[];
}

export function estimarPrioridad(d: DatosTriaje): Estimacion {
  const razones: string[] = [`Base por tipo: ${PUNTAJE_BASE[d.tipo]}`];
  let puntaje = PUNTAJE_BASE[d.tipo];
  if (d.hayRiesgoVital) { puntaje += 45; razones.push('Riesgo vital +45'); }
  if (d.hayRiesgoPropagacion) { puntaje += 20; razones.push('Riesgo de propagación +20'); }
  if (d.hayHeridos) { puntaje += 15; razones.push('Heridos +15'); }
  const afectados = Number.isFinite(d.numeroAfectados) ? d.numeroAfectados : 0;
  if (afectados > 20) { puntaje += 30; razones.push('Más de 20 afectados +30'); }
  else if (afectados >= 6) { puntaje += 20; razones.push('6 a 20 afectados +20'); }
  else if (afectados >= 2) { puntaje += 10; razones.push('2 a 5 afectados +10'); }
  puntaje = Math.min(100, puntaje);

  let prioridad: NivelPrioridad = puntaje >= 80 ? 'CRITICA' : puntaje >= 55 ? 'ALTA' : puntaje >= 30 ? 'MEDIA' : 'BAJA';
  if (d.hayRiesgoVital && afectados >= 3) {
    if (prioridad !== 'CRITICA') razones.push('Riesgo vital con 3 o más afectados: crítica');
    prioridad = 'CRITICA';
  } else if (d.tipo === 'MATERIALES_PELIGROSOS' && d.hayRiesgoPropagacion) {
    if (prioridad !== 'CRITICA') razones.push('Materiales peligrosos con propagación: crítica');
    prioridad = 'CRITICA';
  } else if (d.hayRiesgoVital && (prioridad === 'MEDIA' || prioridad === 'BAJA')) {
    razones.push('Riesgo vital: mínimo alta');
    prioridad = 'ALTA';
  }
  return { puntaje, prioridad, razones };
}

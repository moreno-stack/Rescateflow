import type {
  EstadoEmergencia,
  EstadoUnidad,
  MotivoCancelacion,
  NivelPrioridad,
  TipoEmergencia,
  TipoUnidad,
} from '../types/dominio';

/** Textos visibles para el usuario. Los valores tecnicos (enums) nunca se muestran crudos. */

export const ETIQUETA_TIPO: Record<TipoEmergencia, string> = {
  INCENDIO: 'Incendio',
  MATERIALES_PELIGROSOS: 'Materiales peligrosos',
  EMERGENCIA_MEDICA: 'Emergencia médica',
  DESASTRE_NATURAL: 'Desastre natural',
  ACCIDENTE_TRANSITO: 'Accidente de tránsito',
  SEGURIDAD: 'Seguridad',
  OTRO: 'Otro',
};

export const ETIQUETA_PRIORIDAD: Record<NivelPrioridad, string> = {
  CRITICA: 'Crítica',
  ALTA: 'Alta',
  MEDIA: 'Media',
  BAJA: 'Baja',
};

export const ETIQUETA_ESTADO: Record<EstadoEmergencia, string> = {
  REPORTADA: 'Reportada',
  VALIDADA: 'Validada',
  DESPACHADA: 'Despachada',
  EN_ATENCION: 'En atención',
  CERRADA: 'Cerrada',
  CANCELADA: 'Cancelada',
};

export const ETIQUETA_TIPO_UNIDAD: Record<TipoUnidad, string> = {
  AMBULANCIA: 'Ambulancia',
  BOMBEROS: 'Bomberos',
  POLICIA: 'Policía',
  RESCATE: 'Rescate',
};

export const ETIQUETA_ESTADO_UNIDAD: Record<EstadoUnidad, string> = {
  DISPONIBLE: 'Disponible',
  EN_RUTA: 'En ruta',
  OCUPADA: 'Ocupada',
  FUERA_DE_SERVICIO: 'Fuera de servicio',
};

export const ETIQUETA_MOTIVO: Record<MotivoCancelacion, string> = {
  FALSA_ALARMA: 'Falsa alarma',
  DUPLICADA: 'Duplicada de otra emergencia',
  RESUELTA_SIN_INTERVENCION: 'Se resolvió sin intervención',
  FUERA_DE_JURISDICCION: 'Fuera de jurisdicción',
  OTRO: 'Otro motivo',
};

/** Nombre del boton para cada transicion de la maquina de estados. */
export const ACCION_TRANSICION: Partial<Record<EstadoEmergencia, string>> = {
  VALIDADA: 'Validar',
  EN_ATENCION: 'Registrar llegada',
  CERRADA: 'Cerrar',
  CANCELADA: 'Cancelar',
};

/** Mensaje de exito coherente con el nombre de la accion. */
export const EXITO_TRANSICION: Partial<Record<EstadoEmergencia, string>> = {
  VALIDADA: 'validada',
  EN_ATENCION: 'en atención: llegada registrada',
  CERRADA: 'cerrada',
  CANCELADA: 'cancelada',
};

/** Textos para las advertencias que devuelve POST /api/emergencias. */
export const TEXTO_ADVERTENCIA: Record<string, string> = {
  GEOCODIFICACION_PENDIENTE:
    'No se encontraron coordenadas para la dirección. Sin ubicación no se podrá despachar: registre la emergencia con coordenadas.',
  POSIBLE_DUPLICADO: 'Hay otra emergencia del mismo tipo a menos de 200 m reportada en los últimos 15 minutos.',
};

export const ESTADOS_ACTIVOS: EstadoEmergencia[] = ['REPORTADA', 'VALIDADA', 'DESPACHADA', 'EN_ATENCION'];

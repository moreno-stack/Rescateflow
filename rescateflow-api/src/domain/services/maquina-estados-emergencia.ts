import { EstadoEmergencia } from '../enums';
import { ErrorTransicionInvalida } from '../errors/errores-dominio';

/**
 * Tabla de transiciones validas de una emergencia (RN-30).
 * Todo lo que no aparece en la tabla es invalido por defecto (RN-31).
 *
 *   REPORTADA  -> VALIDADA | CANCELADA
 *   VALIDADA   -> DESPACHADA | CANCELADA
 *   DESPACHADA -> EN_ATENCION | CANCELADA
 *   EN_ATENCION-> CERRADA
 *   CERRADA, CANCELADA -> (estados finales)
 */
export const TRANSICIONES_EMERGENCIA: Readonly<Record<EstadoEmergencia, readonly EstadoEmergencia[]>> = {
  REPORTADA: [EstadoEmergencia.VALIDADA, EstadoEmergencia.CANCELADA],
  VALIDADA: [EstadoEmergencia.DESPACHADA, EstadoEmergencia.CANCELADA],
  DESPACHADA: [EstadoEmergencia.EN_ATENCION, EstadoEmergencia.CANCELADA],
  EN_ATENCION: [EstadoEmergencia.CERRADA],
  CERRADA: [],
  CANCELADA: [],
};

/** Motivos explicativos de las transiciones invalidas mas comunes (tabla RN-31). */
const MOTIVOS_INVALIDOS: Partial<Record<`${EstadoEmergencia}->${EstadoEmergencia}`, string>> = {
  'REPORTADA->DESPACHADA': 'No se envian recursos sin validar la emergencia',
  'REPORTADA->EN_ATENCION': 'No se puede saltar la validacion y el despacho',
  'REPORTADA->CERRADA': 'No se puede cerrar una emergencia que no ha sido atendida',
  'VALIDADA->EN_ATENCION': 'No puede haber atencion sin unidad despachada',
  'VALIDADA->CERRADA': 'Una emergencia valida no se cierra sin atenderse; si se resolvio sola, cancelela con RESUELTA_SIN_INTERVENCION',
  'VALIDADA->REPORTADA': 'No existen retrocesos en la maquina de estados',
  'DESPACHADA->CERRADA': 'Ninguna unidad ha llegado al sitio; primero registre la llegada (EN_ATENCION)',
  'DESPACHADA->VALIDADA': 'No existen retrocesos en la maquina de estados',
  'EN_ATENCION->CANCELADA': 'Ya hay personal en el sitio; la emergencia debe cerrarse con observaciones',
  'EN_ATENCION->DESPACHADA': 'No existen retrocesos en la maquina de estados',
};

export class MaquinaEstadosEmergencia {
  puedeTransicionar(desde: EstadoEmergencia, hacia: EstadoEmergencia): boolean {
    return TRANSICIONES_EMERGENCIA[desde].includes(hacia);
  }

  validarTransicion(desde: EstadoEmergencia, hacia: EstadoEmergencia): void {
    if (desde === hacia) {
      throw new ErrorTransicionInvalida(
        'Emergencia',
        desde,
        hacia,
        `La emergencia ya se encuentra en estado ${desde}; una transicion siempre cambia de estado`,
      );
    }
    if (TRANSICIONES_EMERGENCIA[desde].length === 0) {
      throw new ErrorTransicionInvalida(
        'Emergencia',
        desde,
        hacia,
        `El estado ${desde} es final; no admite mas transiciones`,
      );
    }
    if (!this.puedeTransicionar(desde, hacia)) {
      const motivo = MOTIVOS_INVALIDOS[`${desde}->${hacia}`];
      throw new ErrorTransicionInvalida(
        'Emergencia',
        desde,
        hacia,
        `No se puede pasar de ${desde} a ${hacia}${motivo ? `: ${motivo}` : ''}`,
      );
    }
  }

  transicionesPermitidas(desde: EstadoEmergencia): readonly EstadoEmergencia[] {
    return TRANSICIONES_EMERGENCIA[desde];
  }
}

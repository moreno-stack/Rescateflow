/**
 * Errores de negocio del dominio. No conocen HTTP: cada error declara un
 * "tipo" y la capa de presentacion lo traduce al codigo HTTP correspondiente
 * (Fase 1, seccion 4.7 y principio de separacion de responsabilidades).
 */

export type TipoErrorDominio =
  | 'VALIDACION' // 400
  | 'NO_ENCONTRADO' // 404
  | 'CONFLICTO' // 409
  | 'REGLA_NEGOCIO' // 422
  | 'SERVICIO_EXTERNO'; // 502

export class ErrorDominio extends Error {
  constructor(
    public readonly tipo: TipoErrorDominio,
    public readonly codigo: string,
    mensaje: string,
    public readonly detalles?: Record<string, unknown>,
  ) {
    super(mensaje);
    this.name = new.target.name;
  }
}

export class ErrorValidacion extends ErrorDominio {
  constructor(mensaje: string, detalles?: Record<string, unknown>) {
    super('VALIDACION', 'VALIDACION_FALLIDA', mensaje, detalles);
  }
}

export class ErrorNoEncontrado extends ErrorDominio {
  constructor(recurso: string, id: string) {
    super('NO_ENCONTRADO', 'RECURSO_NO_ENCONTRADO', `${recurso} con id '${id}' no existe`, { recurso, id });
  }
}

export class ErrorTransicionInvalida extends ErrorDominio {
  constructor(entidad: 'Emergencia' | 'Unidad', estadoActual: string, estadoSolicitado: string, motivo?: string) {
    super(
      'CONFLICTO',
      'TRANSICION_INVALIDA',
      motivo ?? `${entidad}: no se puede pasar de ${estadoActual} a ${estadoSolicitado}`,
      { entidad, estadoActual, estadoSolicitado },
    );
  }
}

export class ErrorConflicto extends ErrorDominio {
  constructor(codigo: string, mensaje: string, detalles?: Record<string, unknown>) {
    super('CONFLICTO', codigo, mensaje, detalles);
  }
}

export class ErrorReglaNegocio extends ErrorDominio {
  constructor(codigo: string, mensaje: string, detalles?: Record<string, unknown>) {
    super('REGLA_NEGOCIO', codigo, mensaje, detalles);
  }
}

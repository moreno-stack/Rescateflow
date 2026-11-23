import {
  EstadoEmergencia,
  FuenteUbicacion,
  MotivoCancelacion,
  NivelPrioridad,
  TipoEmergencia,
} from '../enums';
import { ErrorReglaNegocio, ErrorValidacion } from '../errors/errores-dominio';
import { CalculadoraPrioridad, DatosPrioridad, ResultadoPrioridad } from '../services/calculadora-prioridad';
import { MaquinaEstadosEmergencia } from '../services/maquina-estados-emergencia';
import { LONGITUD_MINIMA_TEXTO, SLA_MINUTOS, minutosEntre } from '../services/reglas';
import { CambioEstado } from './historial';
import { Ubicacion } from './ubicacion';

/** Propiedades persistidas de una emergencia (diccionario de datos, Fase 1 seccion 7.4). */
export interface PropiedadesEmergencia {
  id: string;
  codigo: string;
  tipo: TipoEmergencia;
  descripcion: string;
  direccionReportada: string;
  direccionNormalizada: string | null;
  ubicacion: Ubicacion | null;
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
}

/** Datos de entrada para registrar una emergencia nueva (CU-02). */
export interface DatosRegistroEmergencia {
  tipo: TipoEmergencia;
  descripcion: string;
  direccionReportada: string;
  nombreReportante: string | null;
  telefonoReportante: string;
  numeroAfectados: number;
  hayRiesgoVital: boolean;
  hayHeridos: boolean;
  hayRiesgoPropagacion: boolean;
}

export interface ContextoRegistro {
  id: string;
  codigo: string;
  ahora: Date;
  operadorId: string | null;
  ubicacion: Ubicacion | null;
  direccionNormalizada: string | null;
  fuenteUbicacion: FuenteUbicacion | null;
}

const maquina = new MaquinaEstadosEmergencia();
const calculadora = new CalculadoraPrioridad();

function exigirTexto(valor: string | null | undefined, campo: string): string {
  const texto = (valor ?? '').trim();
  if (texto.length < LONGITUD_MINIMA_TEXTO) {
    throw new ErrorValidacion(`El campo '${campo}' es obligatorio y debe tener al menos ${LONGITUD_MINIMA_TEXTO} caracteres`, {
      campo,
    });
  }
  return texto;
}

/**
 * Entidad Emergencia (<<entity>> en la Vista Logica).
 * Es "experta en informacion" (GRASP): conoce su estado y decide si puede cambiarlo,
 * delegando la tabla de transiciones a MaquinaEstadosEmergencia.
 */
export class Emergencia {
  private constructor(private props: PropiedadesEmergencia) {}

  /** Crea una emergencia en estado REPORTADA con su prioridad calculada (CU-02, T1). */
  static registrar(datos: DatosRegistroEmergencia, contexto: ContextoRegistro): { emergencia: Emergencia; cambio: CambioEstado<EstadoEmergencia> } {
    const resultado: ResultadoPrioridad = calculadora.calcular(datos);
    const ahoraIso = contexto.ahora.toISOString();
    const emergencia = new Emergencia({
      id: contexto.id,
      codigo: contexto.codigo,
      tipo: datos.tipo,
      descripcion: datos.descripcion.trim(),
      direccionReportada: datos.direccionReportada.trim(),
      direccionNormalizada: contexto.direccionNormalizada,
      ubicacion: contexto.ubicacion,
      geocodificada: contexto.ubicacion !== null,
      fuenteUbicacion: contexto.ubicacion !== null ? contexto.fuenteUbicacion : null,
      nombreReportante: datos.nombreReportante?.trim() || null,
      telefonoReportante: datos.telefonoReportante,
      numeroAfectados: datos.numeroAfectados,
      hayRiesgoVital: datos.hayRiesgoVital,
      hayHeridos: datos.hayHeridos,
      hayRiesgoPropagacion: datos.hayRiesgoPropagacion,
      puntajePrioridad: resultado.puntajePrioridad,
      prioridad: resultado.prioridad,
      prioridadAjustadaManualmente: false,
      justificacionPrioridad: null,
      estado: EstadoEmergencia.REPORTADA,
      motivoCancelacion: null,
      detalleCancelacion: null,
      emergenciaRelacionadaId: null,
      observacionesCierre: null,
      operadorId: contexto.operadorId,
      despachadorId: null,
      reportadaEn: ahoraIso,
      validadaEn: null,
      despachadaEn: null,
      enAtencionEn: null,
      cerradaEn: null,
      canceladaEn: null,
      creadoEn: ahoraIso,
      actualizadoEn: ahoraIso,
      version: 1,
    });
    const cambio: CambioEstado<EstadoEmergencia> = {
      estadoAnterior: null,
      estadoNuevo: EstadoEmergencia.REPORTADA,
      motivo: resultado.reglaForzado ? `Prioridad forzada por ${resultado.reglaForzado}` : null,
      ocurridoEn: ahoraIso,
    };
    return { emergencia, cambio };
  }

  /** Reconstruye la entidad desde la persistencia. */
  static reconstruir(props: PropiedadesEmergencia): Emergencia {
    return new Emergencia({ ...props });
  }

  // ---------------------------------------------------------------- lectura
  get id(): string { return this.props.id; }
  get codigo(): string { return this.props.codigo; }
  get tipo(): TipoEmergencia { return this.props.tipo; }
  get estado(): EstadoEmergencia { return this.props.estado; }
  get prioridad(): NivelPrioridad { return this.props.prioridad; }
  get puntajePrioridad(): number { return this.props.puntajePrioridad; }
  get ubicacion(): Ubicacion | null { return this.props.ubicacion; }
  get version(): number { return this.props.version; }
  get reportadaEn(): string { return this.props.reportadaEn; }

  /** Copia de solo lectura de todas las propiedades (para persistir o serializar). */
  get propiedades(): Readonly<PropiedadesEmergencia> {
    return { ...this.props };
  }

  get datosPrioridad(): DatosPrioridad {
    return {
      tipo: this.props.tipo,
      numeroAfectados: this.props.numeroAfectados,
      hayRiesgoVital: this.props.hayRiesgoVital,
      hayHeridos: this.props.hayHeridos,
      hayRiesgoPropagacion: this.props.hayRiesgoPropagacion,
    };
  }

  /** Se puede eliminar fisicamente solo si esta REPORTADA o CANCELADA. */
  puedeEliminarse(): boolean {
    return this.props.estado === EstadoEmergencia.REPORTADA || this.props.estado === EstadoEmergencia.CANCELADA;
  }

  tieneUbicacion(): boolean {
    return this.props.ubicacion !== null;
  }

  /** RN-17: campo calculado, no persistido. */
  estaFueraDeSla(ahora: Date): boolean {
    const sla = SLA_MINUTOS[this.props.prioridad];
    const { estado } = this.props;
    if (estado === EstadoEmergencia.REPORTADA || estado === EstadoEmergencia.VALIDADA) {
      return minutosEntre(new Date(this.props.reportadaEn), ahora) > sla.despacho;
    }
    if (estado === EstadoEmergencia.DESPACHADA && this.props.despachadaEn) {
      return minutosEntre(new Date(this.props.despachadaEn), ahora) > sla.llegada;
    }
    return false;
  }

  // -------------------------------------------------------------- comandos
  private transicionar(hacia: EstadoEmergencia, ahora: Date, motivo: string | null): CambioEstado<EstadoEmergencia> {
    const desde = this.props.estado;
    maquina.validarTransicion(desde, hacia);
    const ahoraIso = ahora.toISOString();
    this.props.estado = hacia;
    this.props.actualizadoEn = ahoraIso;
    return { estadoAnterior: desde, estadoNuevo: hacia, motivo, ocurridoEn: ahoraIso };
  }

  /** T2: REPORTADA -> VALIDADA, con ajuste manual opcional de prioridad (RN-15/RN-16). */
  validar(despachadorId: string | null, ahora: Date, ajuste?: { prioridad: NivelPrioridad; justificacion: string }): CambioEstado<EstadoEmergencia> {
    // Primero la maquina de estados: una transicion invalida responde 409 antes que cualquier otra regla.
    maquina.validarTransicion(this.props.estado, EstadoEmergencia.VALIDADA);
    if (ajuste) {
      this.ajustarPrioridad(ajuste.prioridad, ajuste.justificacion, ahora);
    }
    const cambio = this.transicionar(EstadoEmergencia.VALIDADA, ahora, ajuste ? `Prioridad ajustada a ${ajuste.prioridad}: ${ajuste.justificacion}` : null);
    this.props.validadaEn = cambio.ocurridoEn;
    this.props.despachadorId = despachadorId;
    return cambio;
  }

  /** RN-15: solo en REPORTADA o VALIDADA, con justificacion obligatoria. */
  ajustarPrioridad(nivel: NivelPrioridad, justificacion: string, ahora: Date): void {
    if (this.props.estado !== EstadoEmergencia.REPORTADA && this.props.estado !== EstadoEmergencia.VALIDADA) {
      throw new ErrorReglaNegocio(
        'PRIORIDAD_NO_PERMITIDA',
        'La prioridad solo puede ajustarse en estado REPORTADA o VALIDADA (RN-15)',
        { estadoActual: this.props.estado },
      );
    }
    const texto = exigirTexto(justificacion, 'justificacionPrioridad');
    calculadora.validarAjuste(this.datosPrioridad, nivel);
    this.props.prioridad = nivel;
    this.props.prioridadAjustadaManualmente = true;
    this.props.justificacionPrioridad = texto;
    this.props.actualizadoEn = ahora.toISOString();
  }

  /** RN-24: ingreso o correccion manual de coordenadas. */
  asignarUbicacion(ubicacion: Ubicacion, fuente: FuenteUbicacion, direccionNormalizada: string | null, ahora: Date): void {
    this.props.ubicacion = ubicacion;
    this.props.geocodificada = true;
    this.props.fuenteUbicacion = fuente;
    if (direccionNormalizada) this.props.direccionNormalizada = direccionNormalizada;
    this.props.actualizadoEn = ahora.toISOString();
  }

  /**
   * T3: VALIDADA -> DESPACHADA al asignar la primera unidad.
   * Si ya esta DESPACHADA o EN_ATENCION se trata de un refuerzo (RN-34) y no cambia el estado.
   */
  registrarDespacho(ahora: Date): CambioEstado<EstadoEmergencia> | null {
    if (this.props.estado === EstadoEmergencia.DESPACHADA || this.props.estado === EstadoEmergencia.EN_ATENCION) {
      this.props.actualizadoEn = ahora.toISOString();
      return null;
    }
    if (!this.tieneUbicacion()) {
      throw new ErrorReglaNegocio(
        'EMERGENCIA_SIN_UBICACION',
        'No se puede despachar una emergencia sin latitud y longitud (RN-24)',
        { emergenciaId: this.props.id },
      );
    }
    const cambio = this.transicionar(EstadoEmergencia.DESPACHADA, ahora, 'Primera unidad asignada');
    this.props.despachadaEn = cambio.ocurridoEn;
    return cambio;
  }

  /** T4: DESPACHADA -> EN_ATENCION cuando la primera unidad llega al sitio. */
  iniciarAtencion(ahora: Date, motivo: string | null): CambioEstado<EstadoEmergencia> {
    const cambio = this.transicionar(EstadoEmergencia.EN_ATENCION, ahora, motivo ?? 'Unidad en el sitio');
    this.props.enAtencionEn = cambio.ocurridoEn;
    return cambio;
  }

  /** T5: EN_ATENCION -> CERRADA con observaciones obligatorias. */
  cerrar(observacionesCierre: string, ahora: Date): CambioEstado<EstadoEmergencia> {
    const texto = exigirTexto(observacionesCierre, 'observacionesCierre');
    const cambio = this.transicionar(EstadoEmergencia.CERRADA, ahora, texto);
    this.props.observacionesCierre = texto;
    this.props.cerradaEn = cambio.ocurridoEn;
    return cambio;
  }

  /** T6/T7/T8: -> CANCELADA con motivo (RN-38). */
  cancelar(
    motivo: MotivoCancelacion,
    detalle: string | null,
    emergenciaRelacionadaId: string | null,
    ahora: Date,
  ): CambioEstado<EstadoEmergencia> {
    if (motivo === MotivoCancelacion.OTRO && !(detalle ?? '').trim()) {
      throw new ErrorValidacion("El motivo OTRO exige 'detalleCancelacion' (RN-38)", { campo: 'detalleCancelacion' });
    }
    if (motivo === MotivoCancelacion.DUPLICADA) {
      if (!emergenciaRelacionadaId) {
        throw new ErrorValidacion("El motivo DUPLICADA exige 'emergenciaRelacionadaId' (RN-38)", { campo: 'emergenciaRelacionadaId' });
      }
      if (emergenciaRelacionadaId === this.props.id) {
        throw new ErrorValidacion('Una emergencia no puede ser duplicada de si misma', { campo: 'emergenciaRelacionadaId' });
      }
    }
    const cambio = this.transicionar(EstadoEmergencia.CANCELADA, ahora, detalle ? `${motivo}: ${detalle}` : motivo);
    this.props.motivoCancelacion = motivo;
    this.props.detalleCancelacion = detalle?.trim() || null;
    this.props.emergenciaRelacionadaId = motivo === MotivoCancelacion.DUPLICADA ? emergenciaRelacionadaId : null;
    this.props.canceladaEn = cambio.ocurridoEn;
    return cambio;
  }

  /** Incrementa la version tras persistir (bloqueo optimista, RN-33). */
  marcarPersistida(): void {
    this.props.version += 1;
  }
}

import { EstadoDespacho } from '../enums';
import { ErrorConflicto } from '../errors/errores-dominio';

/** Propiedades persistidas de un despacho (asignacion unidad-emergencia). */
export interface PropiedadesDespacho {
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

/** Entidad Despacho: vincula una Unidad con una Emergencia (composicion de Emergencia). */
export class Despacho {
  private constructor(private props: PropiedadesDespacho) {}

  static crear(datos: {
    id: string;
    emergenciaId: string;
    unidadId: string;
    despachadorId: string | null;
    distanciaKm: number;
    tiempoEstimadoMin: number;
    ahora: Date;
  }): Despacho {
    return new Despacho({
      id: datos.id,
      emergenciaId: datos.emergenciaId,
      unidadId: datos.unidadId,
      despachadorId: datos.despachadorId,
      estado: EstadoDespacho.ACTIVO,
      distanciaKm: datos.distanciaKm,
      tiempoEstimadoMin: datos.tiempoEstimadoMin,
      asignadoEn: datos.ahora.toISOString(),
      llegadaEn: null,
      liberadoEn: null,
      observaciones: null,
    });
  }

  static reconstruir(props: PropiedadesDespacho): Despacho {
    return new Despacho({ ...props });
  }

  get id(): string { return this.props.id; }
  get emergenciaId(): string { return this.props.emergenciaId; }
  get unidadId(): string { return this.props.unidadId; }
  get estado(): EstadoDespacho { return this.props.estado; }
  get llegadaEn(): string | null { return this.props.llegadaEn; }

  get propiedades(): Readonly<PropiedadesDespacho> {
    return { ...this.props };
  }

  estaActivo(): boolean {
    return this.props.estado === EstadoDespacho.ACTIVO;
  }

  private exigirActivo(): void {
    if (!this.estaActivo()) {
      throw new ErrorConflicto('DESPACHO_NO_ACTIVO', `El despacho ${this.props.id} ya esta ${this.props.estado}`, {
        despachoId: this.props.id,
        estado: this.props.estado,
      });
    }
  }

  /** CU-05: registra la llegada de la unidad al sitio. */
  registrarLlegada(ahora: Date): void {
    this.exigirActivo();
    if (this.props.llegadaEn) {
      throw new ErrorConflicto('LLEGADA_YA_REGISTRADA', 'La llegada de esta unidad ya fue registrada', {
        despachoId: this.props.id,
      });
    }
    this.props.llegadaEn = ahora.toISOString();
  }

  /** CU-06: finaliza la atencion de la unidad. */
  finalizar(observaciones: string | null, ahora: Date): void {
    this.exigirActivo();
    this.props.estado = EstadoDespacho.FINALIZADO;
    this.props.liberadoEn = ahora.toISOString();
    if (observaciones) this.props.observaciones = observaciones;
  }

  /** CU-07: anula la asignacion antes de terminar. */
  cancelar(motivo: string, ahora: Date): void {
    this.exigirActivo();
    this.props.estado = EstadoDespacho.CANCELADO;
    this.props.liberadoEn = ahora.toISOString();
    this.props.observaciones = motivo;
  }
}

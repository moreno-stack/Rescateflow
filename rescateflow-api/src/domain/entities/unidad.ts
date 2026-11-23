import { EstadoUnidad, TipoEmergencia, TipoUnidad } from '../enums';
import { ErrorConflicto, ErrorReglaNegocio, ErrorValidacion } from '../errors/errores-dominio';
import { esCompatible } from '../services/compatibilidad';
import { MaquinaEstadosUnidad } from '../services/maquina-estados-unidad';
import { CambioEstado } from './historial';
import { Ubicacion } from './ubicacion';

/** Propiedades persistidas de una unidad de respuesta (Fase 1, seccion 7.4). */
export interface PropiedadesUnidad {
  id: string;
  codigo: string;
  nombre: string;
  tipo: TipoUnidad;
  estado: EstadoUnidad;
  activa: boolean;
  baseNombre: string;
  ubicacionBase: Ubicacion;
  ubicacionActual: Ubicacion;
  ubicacionActualizadaEn: string;
  motivoEstado: string | null;
  usuarioResponsableId: string | null;
  creadoEn: string;
  actualizadoEn: string;
  version: number;
}

const maquina = new MaquinaEstadosUnidad();

/**
 * Entidad Unidad ("Unidad de Respuesta"): ambulancia, carro de bomberos, patrulla o rescate.
 * Protege la invariante RN-53: solo pasa a EN_RUTA/OCUPADA a traves de un despacho.
 */
export class Unidad {
  private constructor(private props: PropiedadesUnidad) {}

  static reconstruir(props: PropiedadesUnidad): Unidad {
    return new Unidad({ ...props });
  }

  static crear(datos: {
    id: string;
    codigo: string;
    nombre: string;
    tipo: TipoUnidad;
    baseNombre: string;
    ubicacionBase: Ubicacion;
    usuarioResponsableId: string | null;
    ahora: Date;
  }): { unidad: Unidad; cambio: CambioEstado<EstadoUnidad> } {
    const ahoraIso = datos.ahora.toISOString();
    const unidad = new Unidad({
      id: datos.id,
      codigo: datos.codigo,
      nombre: datos.nombre,
      tipo: datos.tipo,
      estado: EstadoUnidad.DISPONIBLE,
      activa: true,
      baseNombre: datos.baseNombre,
      ubicacionBase: datos.ubicacionBase,
      ubicacionActual: datos.ubicacionBase,
      ubicacionActualizadaEn: ahoraIso,
      motivoEstado: null,
      usuarioResponsableId: datos.usuarioResponsableId,
      creadoEn: ahoraIso,
      actualizadoEn: ahoraIso,
      version: 1,
    });
    return {
      unidad,
      cambio: { estadoAnterior: null, estadoNuevo: EstadoUnidad.DISPONIBLE, motivo: 'Unidad creada', ocurridoEn: ahoraIso },
    };
  }

  get id(): string { return this.props.id; }
  get codigo(): string { return this.props.codigo; }
  get tipo(): TipoUnidad { return this.props.tipo; }
  get estado(): EstadoUnidad { return this.props.estado; }
  get activa(): boolean { return this.props.activa; }
  get ubicacionActual(): Ubicacion { return this.props.ubicacionActual; }
  get ubicacionActualizadaEn(): string { return this.props.ubicacionActualizadaEn; }
  get version(): number { return this.props.version; }

  get propiedades(): Readonly<PropiedadesUnidad> {
    return { ...this.props };
  }

  /** RN-40 (puntos 1 a 3): disponible, activa y de tipo compatible. */
  esElegiblePara(tipoEmergencia: TipoEmergencia): boolean {
    return this.props.activa && this.props.estado === EstadoUnidad.DISPONIBLE && esCompatible(tipoEmergencia, this.props.tipo);
  }

  private transicionar(hacia: EstadoUnidad, ahora: Date, motivo: string | null): CambioEstado<EstadoUnidad> {
    const desde = this.props.estado;
    maquina.validarTransicion(desde, hacia);
    const ahoraIso = ahora.toISOString();
    this.props.estado = hacia;
    this.props.actualizadoEn = ahoraIso;
    return { estadoAnterior: desde, estadoNuevo: hacia, motivo, ocurridoEn: ahoraIso };
  }

  /** DISPONIBLE -> EN_RUTA al ser despachada (CU-04). */
  asignar(tipoEmergencia: TipoEmergencia, ahora: Date, codigoEmergencia: string): CambioEstado<EstadoUnidad> {
    if (!this.props.activa) {
      throw new ErrorConflicto('UNIDAD_NO_DISPONIBLE', `La unidad ${this.props.codigo} esta dada de baja (RN-52)`, {
        unidadId: this.props.id,
      });
    }
    if (this.props.estado !== EstadoUnidad.DISPONIBLE) {
      throw new ErrorConflicto(
        'UNIDAD_NO_DISPONIBLE',
        `La unidad ${this.props.codigo} no esta DISPONIBLE (estado actual: ${this.props.estado})`,
        { unidadId: this.props.id, estadoActual: this.props.estado },
      );
    }
    if (!esCompatible(tipoEmergencia, this.props.tipo)) {
      throw new ErrorReglaNegocio(
        'TIPO_UNIDAD_INCOMPATIBLE',
        `Una unidad de tipo ${this.props.tipo} no puede atender una emergencia de tipo ${tipoEmergencia} (RN-41)`,
        { tipoUnidad: this.props.tipo, tipoEmergencia },
      );
    }
    return this.transicionar(EstadoUnidad.EN_RUTA, ahora, `Despachada a ${codigoEmergencia}`);
  }

  /** EN_RUTA -> OCUPADA al llegar al sitio (CU-05). */
  registrarLlegada(ahora: Date, codigoEmergencia: string): CambioEstado<EstadoUnidad> {
    return this.transicionar(EstadoUnidad.OCUPADA, ahora, `En el sitio de ${codigoEmergencia}`);
  }

  /** EN_RUTA|OCUPADA -> DISPONIBLE al cerrar/cancelar (RN-36). */
  liberar(ahora: Date, motivo: string): CambioEstado<EstadoUnidad> {
    return this.transicionar(EstadoUnidad.DISPONIBLE, ahora, motivo);
  }

  /** DISPONIBLE -> FUERA_DE_SERVICIO (solo administrador, CU-08). */
  ponerFueraDeServicio(motivo: string, ahora: Date): CambioEstado<EstadoUnidad> {
    if (!motivo.trim()) {
      throw new ErrorValidacion("Poner una unidad FUERA_DE_SERVICIO exige 'motivoEstado'", { campo: 'motivoEstado' });
    }
    if (this.props.estado === EstadoUnidad.EN_RUTA || this.props.estado === EstadoUnidad.OCUPADA) {
      throw new ErrorConflicto('UNIDAD_CON_DESPACHO_ACTIVO', 'La unidad tiene un despacho activo; primero debe liberarse', {
        unidadId: this.props.id,
        estadoActual: this.props.estado,
      });
    }
    const cambio = this.transicionar(EstadoUnidad.FUERA_DE_SERVICIO, ahora, motivo.trim());
    this.props.motivoEstado = motivo.trim();
    return cambio;
  }

  /** FUERA_DE_SERVICIO -> DISPONIBLE. */
  reactivar(ahora: Date): CambioEstado<EstadoUnidad> {
    const cambio = this.transicionar(EstadoUnidad.DISPONIBLE, ahora, 'Unidad reactivada');
    this.props.motivoEstado = null;
    return cambio;
  }

  actualizarUbicacion(ubicacion: Ubicacion, ahora: Date): void {
    this.props.ubicacionActual = ubicacion;
    this.props.ubicacionActualizadaEn = ahora.toISOString();
    this.props.actualizadoEn = this.props.ubicacionActualizadaEn;
  }

  marcarPersistida(): void {
    this.props.version += 1;
  }
}

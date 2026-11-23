import { Despacho } from '../../domain/entities/despacho';
import { DatosRegistroEmergencia, Emergencia } from '../../domain/entities/emergencia';
import { CambioEstado, HistorialEstadoEmergencia, HistorialEstadoUnidad } from '../../domain/entities/historial';
import { Ubicacion } from '../../domain/entities/ubicacion';
import { Unidad } from '../../domain/entities/unidad';
import {
  EstadoEmergencia,
  EstadoUnidad,
  FuenteUbicacion,
  MotivoCancelacion,
  NivelPrioridad,
} from '../../domain/enums';
import {
  ErrorConflicto,
  ErrorNoEncontrado,
  ErrorReglaNegocio,
  ErrorValidacion,
} from '../../domain/errors/errores-dominio';
import { FiltroEmergencias } from '../../domain/ports/repositorios';
import { esTipoPrincipal } from '../../domain/services/compatibilidad';
import { MaquinaEstadosEmergencia } from '../../domain/services/maquina-estados-emergencia';
import { MAX_DESPACHOS_ACTIVOS, MINUTOS_UBICACION_DESACTUALIZADA, minutosEntre } from '../../domain/services/reglas';
import { DependenciasAplicacion } from '../dependencias';

/** RN-05: radio y ventana de tiempo para detectar posibles duplicados. */
const RADIO_DUPLICADO_KM = 0.2;
const MINUTOS_DUPLICADO = 15;

export interface SolicitudRegistro extends DatosRegistroEmergencia {
  /** Coordenadas opcionales: si llegan, se usan como ubicacion MANUAL y no se geocodifica. */
  latitud?: number;
  longitud?: number;
}

export interface ResultadoRegistro {
  emergencia: Emergencia;
  advertencias: string[];
  posiblesDuplicados: string[];
}

export interface SolicitudCambioEstado {
  estado: EstadoEmergencia;
  motivo?: string;
  prioridad?: NivelPrioridad;
  justificacionPrioridad?: string;
  motivoCancelacion?: MotivoCancelacion;
  detalleCancelacion?: string;
  emergenciaRelacionadaId?: string;
  observacionesCierre?: string;
  unidadId?: string;
}

export interface DetalleEmergencia {
  emergencia: Emergencia;
  historial: HistorialEstadoEmergencia[];
  despachos: Array<{ despacho: Despacho; unidad: Unidad | null }>;
}

export interface ResultadoAsignacion {
  emergencia: Emergencia;
  despacho: Despacho;
  unidad: Unidad;
  esRefuerzo: boolean;
}

export interface UnidadSugerida {
  unidad: Unidad;
  distanciaKm: number;
  tiempoEstimadoMin: number;
  esTipoPrincipal: boolean;
  advertencias: string[];
}

/**
 * Servicio de aplicacion de emergencias. Orquesta los casos de uso CU-02 a CU-07:
 * carga entidades, aplica las reglas del dominio y persiste todo en una sola transaccion.
 */
export class EmergenciasServicio {
  private readonly maquina = new MaquinaEstadosEmergencia();

  constructor(private readonly dep: DependenciasAplicacion) {}

  // ================================================================ consultas

  listar(filtro: FiltroEmergencias): Emergencia[] {
    return this.dep.emergencias.listar(filtro);
  }

  obtenerDetalle(id: string): DetalleEmergencia {
    const emergencia = this.buscarOFallar(id);
    const despachos = this.dep.despachos.listarPorEmergencia(id).map((despacho) => ({
      despacho,
      unidad: this.dep.unidades.buscarPorId(despacho.unidadId),
    }));
    return { emergencia, historial: this.dep.emergencias.listarHistorial(id), despachos };
  }

  /** RN-40 a RN-42: unidades elegibles ordenadas por tipo principal y distancia. */
  sugerirUnidades(id: string): UnidadSugerida[] {
    const emergencia = this.buscarOFallar(id);
    const ubicacion = emergencia.ubicacion;
    if (!ubicacion) {
      throw new ErrorReglaNegocio('EMERGENCIA_SIN_UBICACION', 'La emergencia no tiene coordenadas; no se pueden calcular distancias (RN-24)', {
        emergenciaId: id,
      });
    }
    const ahora = this.dep.tiempo.ahora();
    const yaAsignadas = new Set(this.dep.despachos.listarActivosPorEmergencia(id).map((d) => d.unidadId));
    return this.dep.unidades
      .listar({ estado: EstadoUnidad.DISPONIBLE })
      .filter((u) => u.esElegiblePara(emergencia.tipo) && !yaAsignadas.has(u.id))
      .map((unidad) => {
        const distanciaKm = unidad.ubicacionActual.distanciaKmA(ubicacion);
        const advertencias: string[] = [];
        if (minutosEntre(new Date(unidad.ubicacionActualizadaEn), ahora) > MINUTOS_UBICACION_DESACTUALIZADA) {
          advertencias.push('UBICACION_DESACTUALIZADA');
        }
        return {
          unidad,
          distanciaKm,
          tiempoEstimadoMin: this.tiempoEstimado(distanciaKm),
          esTipoPrincipal: esTipoPrincipal(emergencia.tipo, unidad.tipo),
          advertencias,
        };
      })
      .sort((a, b) => Number(b.esTipoPrincipal) - Number(a.esTipoPrincipal) || a.distanciaKm - b.distanciaKm);
  }

  // ================================================================ comandos

  /** CU-02: registrar emergencia (estado REPORTADA). */
  async registrar(solicitud: SolicitudRegistro, usuarioId: string | null): Promise<ResultadoRegistro> {
    const advertencias: string[] = [];
    let ubicacion: Ubicacion | null = null;
    let direccionNormalizada: string | null = null;
    let fuente: FuenteUbicacion | null = null;

    if (solicitud.latitud !== undefined && solicitud.longitud !== undefined) {
      ubicacion = new Ubicacion(solicitud.latitud, solicitud.longitud);
      fuente = FuenteUbicacion.MANUAL;
    } else {
      // Se llama al servicio externo FUERA de la transaccion (puede tardar hasta 5 s).
      const resultado = await this.dep.geocodificacion.geocodificar(solicitud.direccionReportada);
      if (resultado) {
        ubicacion = new Ubicacion(resultado.latitud, resultado.longitud);
        direccionNormalizada = resultado.direccionNormalizada;
        fuente = FuenteUbicacion.GEOCODIFICACION;
      } else {
        advertencias.push('GEOCODIFICACION_PENDIENTE');
      }
    }

    if (ubicacion && !ubicacion.estaDentroDe(this.dep.areaCobertura)) {
      throw new ErrorReglaNegocio('FUERA_DE_COBERTURA', 'Las coordenadas estan fuera del area de cobertura del servicio (RN-21)', {
        latitud: ubicacion.latitud,
        longitud: ubicacion.longitud,
        areaCobertura: this.dep.areaCobertura,
      });
    }

    return this.dep.unidadDeTrabajo.ejecutarEnTransaccion(() => {
      const ahora = this.dep.tiempo.ahora();
      const anio = ahora.getUTCFullYear();
      const consecutivo = this.dep.emergencias.siguienteConsecutivo(anio);
      const codigo = `EMG-${anio}-${String(consecutivo).padStart(6, '0')}`;

      const { emergencia, cambio } = Emergencia.registrar(
        {
          tipo: solicitud.tipo,
          descripcion: solicitud.descripcion,
          direccionReportada: solicitud.direccionReportada,
          nombreReportante: solicitud.nombreReportante,
          telefonoReportante: solicitud.telefonoReportante,
          numeroAfectados: solicitud.numeroAfectados,
          hayRiesgoVital: solicitud.hayRiesgoVital,
          hayHeridos: solicitud.hayHeridos,
          hayRiesgoPropagacion: solicitud.hayRiesgoPropagacion,
        },
        {
          id: this.dep.generadorId.nuevoId(),
          codigo,
          ahora,
          operadorId: usuarioId,
          ubicacion,
          direccionNormalizada,
          fuenteUbicacion: fuente,
        },
      );

      const posiblesDuplicados = this.detectarDuplicados(emergencia, ahora);
      if (posiblesDuplicados.length > 0) advertencias.push('POSIBLE_DUPLICADO');

      this.dep.emergencias.insertar(emergencia);
      this.registrarHistorialEmergencia(emergencia.id, cambio, usuarioId);
      return { emergencia, advertencias, posiblesDuplicados };
    });
  }

  /** PATCH /estado: aplica la maquina de estados (RN-30/RN-31) y sus efectos sobre despachos y unidades. */
  cambiarEstado(id: string, solicitud: SolicitudCambioEstado, usuarioId: string | null): Emergencia {
    return this.dep.unidadDeTrabajo.ejecutarEnTransaccion(() => {
      const emergencia = this.buscarOFallar(id);
      const ahora = this.dep.tiempo.ahora();
      const destino = solicitud.estado;

      // 1) Maquina de estados primero: cualquier transicion invalida responde 409 (RN-31)
      //    antes de validar datos especificos de cada destino.
      this.maquina.validarTransicion(emergencia.estado, destino);

      switch (destino) {
        case EstadoEmergencia.VALIDADA: {
          const ajuste =
            solicitud.prioridad !== undefined
              ? { prioridad: solicitud.prioridad, justificacion: solicitud.justificacionPrioridad ?? '' }
              : undefined;
          const cambio = emergencia.validar(usuarioId, ahora, ajuste);
          this.persistir(emergencia, cambio, usuarioId, solicitud.motivo);
          break;
        }

        case EstadoEmergencia.DESPACHADA: {
          // La transicion VALIDADA -> DESPACHADA existe, pero exige una unidad: se hace con /asignar-unidad.
          throw new ErrorReglaNegocio(
            'UNIDAD_REQUERIDA',
            `Para despachar use POST /api/emergencias/${id}/asignar-unidad indicando la unidad (CU-04)`,
            { endpoint: `/api/emergencias/${id}/asignar-unidad` },
          );
        }

        case EstadoEmergencia.EN_ATENCION: {
          const activos = this.dep.despachos.listarActivosPorEmergencia(id);
          const objetivo = solicitud.unidadId ? activos.filter((d) => d.unidadId === solicitud.unidadId) : activos.filter((d) => !d.llegadaEn);
          if (solicitud.unidadId && objetivo.length === 0) {
            throw new ErrorReglaNegocio('UNIDAD_NO_ASIGNADA', 'La unidad indicada no tiene un despacho activo en esta emergencia', {
              unidadId: solicitud.unidadId,
            });
          }
          if (objetivo.length === 0) {
            throw new ErrorConflicto('SIN_DESPACHOS_ACTIVOS', 'La emergencia no tiene unidades en ruta para registrar llegada');
          }
          for (const despacho of objetivo) {
            const unidad = this.unidadOFallar(despacho.unidadId);
            despacho.registrarLlegada(ahora);
            const cambioUnidad = unidad.registrarLlegada(ahora, emergencia.codigo);
            this.dep.despachos.actualizar(despacho);
            this.persistirUnidad(unidad, cambioUnidad, despacho.id, usuarioId);
          }
          const codigos = objetivo.map((d) => this.unidadOFallar(d.unidadId).codigo).join(', ');
          const cambio = emergencia.iniciarAtencion(ahora, solicitud.motivo ?? `Llegada al sitio: ${codigos}`);
          this.persistir(emergencia, cambio, usuarioId);
          break;
        }

        case EstadoEmergencia.CERRADA: {
          const cambio = emergencia.cerrar(solicitud.observacionesCierre ?? '', ahora);
          this.liberarDespachos(emergencia, 'FINALIZAR', ahora, usuarioId, `Emergencia ${emergencia.codigo} cerrada`);
          this.persistir(emergencia, cambio, usuarioId);
          break;
        }

        case EstadoEmergencia.CANCELADA: {
          if (!solicitud.motivoCancelacion) {
            throw new ErrorValidacion("Cancelar exige 'motivoCancelacion' (RN-38)", { campo: 'motivoCancelacion' });
          }
          if (solicitud.motivoCancelacion === MotivoCancelacion.DUPLICADA && solicitud.emergenciaRelacionadaId) {
            this.buscarOFallar(solicitud.emergenciaRelacionadaId);
          }
          const cambio = emergencia.cancelar(
            solicitud.motivoCancelacion,
            solicitud.detalleCancelacion ?? null,
            solicitud.emergenciaRelacionadaId ?? null,
            ahora,
          );
          this.liberarDespachos(emergencia, 'CANCELAR', ahora, usuarioId, `Emergencia ${emergencia.codigo} cancelada`);
          this.persistir(emergencia, cambio, usuarioId);
          break;
        }

        case EstadoEmergencia.REPORTADA: {
          // Inalcanzable: ninguna transicion lleva a REPORTADA y la maquina ya respondio 409 arriba.
          break;
        }
      }
      return emergencia;
    });
  }

  /** CU-04: asigna una unidad DISPONIBLE (-> EN_RUTA) y pasa la emergencia a DESPACHADA. */
  asignarUnidad(id: string, unidadId: string, usuarioId: string | null): ResultadoAsignacion {
    return this.dep.unidadDeTrabajo.ejecutarEnTransaccion(() => {
      const emergencia = this.buscarOFallar(id);
      const unidad = this.unidadOFallar(unidadId);
      const ahora = this.dep.tiempo.ahora();

      const esRefuerzo = emergencia.estado === EstadoEmergencia.DESPACHADA || emergencia.estado === EstadoEmergencia.EN_ATENCION;
      if (!esRefuerzo) {
        // Valida VALIDADA -> DESPACHADA; desde REPORTADA, CERRADA o CANCELADA responde 409.
        this.maquina.validarTransicion(emergencia.estado, EstadoEmergencia.DESPACHADA);
      }
      if (!emergencia.tieneUbicacion()) {
        throw new ErrorReglaNegocio('EMERGENCIA_SIN_UBICACION', 'No se puede despachar una emergencia sin latitud y longitud (RN-24)', {
          emergenciaId: id,
        });
      }
      const activos = this.dep.despachos.listarActivosPorEmergencia(id);
      if (activos.some((d) => d.unidadId === unidadId)) {
        throw new ErrorConflicto('UNIDAD_YA_ASIGNADA', `La unidad ${unidad.codigo} ya esta asignada a esta emergencia`, { unidadId });
      }
      if (activos.length >= MAX_DESPACHOS_ACTIVOS) {
        throw new ErrorReglaNegocio(
          'LIMITE_DESPACHOS_ALCANZADO',
          `Una emergencia admite como maximo ${MAX_DESPACHOS_ACTIVOS} despachos activos (RN-43)`,
          { despachosActivos: activos.length },
        );
      }

      // La entidad Unidad valida DISPONIBLE (409) y compatibilidad de tipo (422).
      const cambioUnidad = unidad.asignar(emergencia.tipo, ahora, emergencia.codigo);
      const distanciaKm = unidad.ubicacionActual.distanciaKmA(emergencia.ubicacion as Ubicacion);
      const despacho = Despacho.crear({
        id: this.dep.generadorId.nuevoId(),
        emergenciaId: emergencia.id,
        unidadId: unidad.id,
        despachadorId: usuarioId,
        distanciaKm,
        tiempoEstimadoMin: this.tiempoEstimado(distanciaKm),
        ahora,
      });
      const cambioEmergencia = emergencia.registrarDespacho(ahora);

      this.dep.despachos.insertar(despacho);
      this.persistirUnidad(unidad, cambioUnidad, despacho.id, usuarioId);
      this.dep.emergencias.actualizar(emergencia);
      if (cambioEmergencia) {
        this.registrarHistorialEmergencia(emergencia.id, cambioEmergencia, usuarioId, `Unidad ${unidad.codigo} asignada`);
      }
      return { emergencia, despacho, unidad, esRefuerzo };
    });
  }

  /** DELETE: solo REPORTADA o CANCELADA; en otro estado responde 409. */
  eliminar(id: string): void {
    this.dep.unidadDeTrabajo.ejecutarEnTransaccion(() => {
      const emergencia = this.buscarOFallar(id);
      if (!emergencia.puedeEliminarse()) {
        throw new ErrorConflicto(
          'ELIMINACION_NO_PERMITIDA',
          `Solo se pueden eliminar emergencias REPORTADA o CANCELADA (estado actual: ${emergencia.estado})`,
          { estadoActual: emergencia.estado, estadosPermitidos: [EstadoEmergencia.REPORTADA, EstadoEmergencia.CANCELADA] },
        );
      }
      const activos = this.dep.despachos.listarActivosPorEmergencia(id);
      if (activos.length > 0) {
        throw new ErrorConflicto('ELIMINACION_NO_PERMITIDA', 'La emergencia aun tiene despachos activos', {
          despachosActivos: activos.length,
        });
      }
      this.dep.emergencias.eliminar(id);
    });
  }

  // ================================================================ auxiliares

  private buscarOFallar(id: string): Emergencia {
    const emergencia = this.dep.emergencias.buscarPorId(id);
    if (!emergencia) throw new ErrorNoEncontrado('Emergencia', id);
    return emergencia;
  }

  private unidadOFallar(id: string): Unidad {
    const unidad = this.dep.unidades.buscarPorId(id);
    if (!unidad) throw new ErrorNoEncontrado('Unidad', id);
    return unidad;
  }

  private tiempoEstimado(distanciaKm: number): number {
    return Math.max(1, Math.ceil((distanciaKm / this.dep.velocidadPromedioKmH) * 60));
  }

  /** RN-05: misma clase de emergencia, activa, a <= 200 m y registrada hace <= 15 min. */
  private detectarDuplicados(nueva: Emergencia, ahora: Date): string[] {
    const ubicacion = nueva.ubicacion;
    if (!ubicacion) return [];
    const desde = new Date(ahora.getTime() - MINUTOS_DUPLICADO * 60000).toISOString();
    return this.dep.emergencias
      .listarActivasPorTipoDesde(nueva.tipo, desde)
      .filter((otra) => otra.ubicacion !== null && otra.ubicacion.distanciaKmA(ubicacion) <= RADIO_DUPLICADO_KM)
      .map((otra) => otra.codigo);
  }

  /** RN-36: al cerrar/cancelar, todos los despachos activos terminan y sus unidades quedan DISPONIBLE. */
  private liberarDespachos(emergencia: Emergencia, accion: 'FINALIZAR' | 'CANCELAR', ahora: Date, usuarioId: string | null, motivo: string): void {
    for (const despacho of this.dep.despachos.listarActivosPorEmergencia(emergencia.id)) {
      const unidad = this.unidadOFallar(despacho.unidadId);
      if (accion === 'FINALIZAR') despacho.finalizar(motivo, ahora);
      else despacho.cancelar(motivo, ahora);
      this.dep.despachos.actualizar(despacho);
      if (unidad.estado === EstadoUnidad.EN_RUTA || unidad.estado === EstadoUnidad.OCUPADA) {
        const cambio = unidad.liberar(ahora, motivo);
        this.persistirUnidad(unidad, cambio, despacho.id, usuarioId);
      }
    }
  }

  private persistir(emergencia: Emergencia, cambio: CambioEstado<EstadoEmergencia>, usuarioId: string | null, motivoExtra?: string): void {
    this.dep.emergencias.actualizar(emergencia);
    this.registrarHistorialEmergencia(emergencia.id, cambio, usuarioId, motivoExtra);
  }

  private registrarHistorialEmergencia(
    emergenciaId: string,
    cambio: CambioEstado<EstadoEmergencia>,
    usuarioId: string | null,
    motivoExtra?: string,
  ): void {
    const motivo = [cambio.motivo, motivoExtra].filter((m): m is string => Boolean(m && m.trim())).join(' | ') || null;
    this.dep.emergencias.registrarHistorial({
      id: this.dep.generadorId.nuevoId(),
      emergenciaId,
      estadoAnterior: cambio.estadoAnterior,
      estadoNuevo: cambio.estadoNuevo,
      usuarioId,
      motivo,
      ocurridoEn: cambio.ocurridoEn,
    });
  }

  private persistirUnidad(unidad: Unidad, cambio: CambioEstado<EstadoUnidad>, despachoId: string | null, usuarioId: string | null): void {
    this.dep.unidades.actualizar(unidad);
    const entrada: HistorialEstadoUnidad = {
      id: this.dep.generadorId.nuevoId(),
      unidadId: unidad.id,
      estadoAnterior: cambio.estadoAnterior,
      estadoNuevo: cambio.estadoNuevo,
      despachoId,
      usuarioId,
      motivo: cambio.motivo,
      ocurridoEn: cambio.ocurridoEn,
    };
    this.dep.unidades.registrarHistorial(entrada);
  }
}

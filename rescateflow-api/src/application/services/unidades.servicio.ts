import { Despacho } from '../../domain/entities/despacho';
import { Emergencia } from '../../domain/entities/emergencia';
import { HistorialEstadoUnidad } from '../../domain/entities/historial';
import { Unidad } from '../../domain/entities/unidad';
import { ErrorNoEncontrado } from '../../domain/errors/errores-dominio';
import { FiltroUnidades } from '../../domain/ports/repositorios';
import { MINUTOS_UBICACION_DESACTUALIZADA, minutosEntre } from '../../domain/services/reglas';
import { DependenciasAplicacion } from '../dependencias';

export interface UnidadConContexto {
  unidad: Unidad;
  despachoActivo: Despacho | null;
  emergenciaActiva: Emergencia | null;
  ubicacionDesactualizada: boolean;
}

export interface DetalleUnidad extends UnidadConContexto {
  historial: HistorialEstadoUnidad[];
}

/** Servicio de aplicacion de unidades de respuesta (consulta de estado actual, CU-11). */
export class UnidadesServicio {
  constructor(private readonly dep: DependenciasAplicacion) {}

  listar(filtro: FiltroUnidades): UnidadConContexto[] {
    const ahora = this.dep.tiempo.ahora();
    return this.dep.unidades.listar(filtro).map((unidad) => this.conContexto(unidad, ahora));
  }

  obtener(id: string): DetalleUnidad {
    const unidad = this.dep.unidades.buscarPorId(id);
    if (!unidad) throw new ErrorNoEncontrado('Unidad', id);
    return { ...this.conContexto(unidad, this.dep.tiempo.ahora()), historial: this.dep.unidades.listarHistorial(id) };
  }

  private conContexto(unidad: Unidad, ahora: Date): UnidadConContexto {
    const despachoActivo = this.dep.despachos.buscarActivoPorUnidad(unidad.id);
    const emergenciaActiva = despachoActivo ? this.dep.emergencias.buscarPorId(despachoActivo.emergenciaId) : null;
    return {
      unidad,
      despachoActivo,
      emergenciaActiva,
      ubicacionDesactualizada: minutosEntre(new Date(unidad.ubicacionActualizadaEn), ahora) > MINUTOS_UBICACION_DESACTUALIZADA,
    };
  }
}

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

  async listar(filtro: FiltroUnidades): Promise<UnidadConContexto[]> {
    const ahora = this.dep.tiempo.ahora();
    const unidades = await this.dep.unidades.listar(filtro);
    return Promise.all(unidades.map((unidad) => this.conContexto(unidad, ahora)));
  }

  async obtener(id: string): Promise<DetalleUnidad> {
    const unidad = await this.dep.unidades.buscarPorId(id);
    if (!unidad) throw new ErrorNoEncontrado('Unidad', id);
    return { ...(await this.conContexto(unidad, this.dep.tiempo.ahora())), historial: await this.dep.unidades.listarHistorial(id) };
  }

  private async conContexto(unidad: Unidad, ahora: Date): Promise<UnidadConContexto> {
    const despachoActivo = await this.dep.despachos.buscarActivoPorUnidad(unidad.id);
    const emergenciaActiva = despachoActivo ? await this.dep.emergencias.buscarPorId(despachoActivo.emergenciaId) : null;
    return {
      unidad,
      despachoActivo,
      emergenciaActiva,
      ubicacionDesactualizada: minutosEntre(new Date(unidad.ubicacionActualizadaEn), ahora) > MINUTOS_UBICACION_DESACTUALIZADA,
    };
  }
}

import { Request, Response } from 'express';
import { UnidadesServicio } from '../../application/services/unidades.servicio';
import { FiltroUnidadesDto } from '../dtos/unidad.dtos';
import { presentarDetalleUnidad, presentarUnidadConContexto } from '../presenters/presentadores';

/** UnidadesControlador (<<controller>>): consulta de unidades de respuesta y su estado actual. */
export class UnidadesControlador {
  constructor(private readonly servicio: UnidadesServicio) {}

  /** GET /api/unidades?estado=&tipo= */
  listar = async (_req: Request, res: Response): Promise<void> => {
    const filtro = res.locals.consulta as FiltroUnidadesDto;
    const unidades = (await this.servicio.listar(filtro)).map(presentarUnidadConContexto);
    const resumen = unidades.reduce<Record<string, number>>((acc, u) => {
      acc[u.estado] = (acc[u.estado] ?? 0) + 1;
      return acc;
    }, {});
    res.json({ total: unidades.length, resumenPorEstado: resumen, filtros: filtro, datos: unidades });
  };

  /** GET /api/unidades/:id (incluye historial de estados) */
  obtener = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    res.json(presentarDetalleUnidad(await this.servicio.obtener(req.params.id)));
  };
}

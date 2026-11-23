import { Request, Response } from 'express';
import { UnidadesServicio } from '../../application/services/unidades.servicio';
import { FiltroUnidadesDto } from '../dtos/unidad.dtos';
import { presentarDetalleUnidad, presentarUnidadConContexto } from '../presenters/presentadores';

/** UnidadesControlador (<<controller>>): consulta de unidades de respuesta y su estado actual. */
export class UnidadesControlador {
  constructor(private readonly servicio: UnidadesServicio) {}

  /** GET /api/unidades?estado=&tipo= */
  listar = (_req: Request, res: Response): void => {
    const filtro = res.locals.consulta as FiltroUnidadesDto;
    const unidades = this.servicio.listar(filtro).map(presentarUnidadConContexto);
    const resumen = unidades.reduce<Record<string, number>>((acc, u) => {
      acc[u.estado] = (acc[u.estado] ?? 0) + 1;
      return acc;
    }, {});
    res.json({ total: unidades.length, resumenPorEstado: resumen, filtros: filtro, datos: unidades });
  };

  /** GET /api/unidades/:id (incluye historial de estados) */
  obtener = (req: Request<{ id: string }>, res: Response): void => {
    res.json(presentarDetalleUnidad(this.servicio.obtener(req.params.id)));
  };
}

import { z } from 'zod';
import { EstadoUnidad, TipoUnidad, valoresDe } from '../../domain/enums';

/** Filtros de GET /api/unidades. */
export const FiltroUnidadesDto = z.object({
  estado: z
    .enum(valoresDe(EstadoUnidad), { error: `Debe ser uno de: ${valoresDe(EstadoUnidad).join(', ')}` })
    .optional(),
  tipo: z.enum(valoresDe(TipoUnidad), { error: `Debe ser uno de: ${valoresDe(TipoUnidad).join(', ')}` }).optional(),
});
export type FiltroUnidadesDto = z.infer<typeof FiltroUnidadesDto>;

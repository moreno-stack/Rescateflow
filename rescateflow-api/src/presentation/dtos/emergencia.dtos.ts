import { z } from 'zod';
import {
  EstadoEmergencia,
  MotivoCancelacion,
  NivelPrioridad,
  TipoEmergencia,
  valoresDe,
} from '../../domain/enums';

const lista = (valores: readonly string[]) => valores.join(', ');

const tipoEmergencia = z.enum(valoresDe(TipoEmergencia), {
  error: `Debe ser uno de: ${lista(valoresDe(TipoEmergencia))}`,
});
const estadoEmergencia = z.enum(valoresDe(EstadoEmergencia), {
  error: `Debe ser uno de: ${lista(valoresDe(EstadoEmergencia))}`,
});
const nivelPrioridad = z.enum(valoresDe(NivelPrioridad), {
  error: `Debe ser uno de: ${lista(valoresDe(NivelPrioridad))}`,
});
const motivoCancelacion = z.enum(valoresDe(MotivoCancelacion), {
  error: `Debe ser uno de: ${lista(valoresDe(MotivoCancelacion))}`,
});

const booleano = (campo: string) => z.boolean({ error: `'${campo}' es obligatorio y debe ser true o false` });

/** DTO de POST /api/emergencias (RN-01). */
export const CrearEmergenciaDto = z
  .strictObject({
    tipo: tipoEmergencia,
    descripcion: z
      .string({ error: "'descripcion' es obligatoria" })
      .trim()
      .min(10, 'La descripcion debe tener al menos 10 caracteres')
      .max(1000, 'La descripcion no puede superar 1000 caracteres'),
    direccionReportada: z
      .string({ error: "'direccionReportada' es obligatoria" })
      .trim()
      .min(5, 'La direccion debe tener al menos 5 caracteres')
      .max(250, 'La direccion no puede superar 250 caracteres'),
    nombreReportante: z.string().trim().max(120, 'El nombre no puede superar 120 caracteres').nullable().optional(),
    telefonoReportante: z
      .string({ error: "'telefonoReportante' es obligatorio" })
      .transform((t) => t.replace(/[\s-]/g, ''))
      .pipe(z.string().regex(/^\+?\d{7,15}$/, 'El telefono debe tener entre 7 y 15 digitos (se permite + al inicio)')),
    numeroAfectados: z
      .number({ error: "'numeroAfectados' es obligatorio y debe ser numerico" })
      .int('numeroAfectados debe ser un entero')
      .min(0, 'numeroAfectados no puede ser negativo')
      .max(500, 'numeroAfectados no puede superar 500'),
    hayRiesgoVital: booleano('hayRiesgoVital'),
    hayHeridos: booleano('hayHeridos'),
    hayRiesgoPropagacion: booleano('hayRiesgoPropagacion'),
    latitud: z.number().min(-90).max(90).optional(),
    longitud: z.number().min(-180).max(180).optional(),
  })
  .refine((d) => (d.latitud === undefined) === (d.longitud === undefined), {
    message: 'latitud y longitud deben enviarse juntas',
    path: ['latitud'],
  });
export type CrearEmergenciaDto = z.infer<typeof CrearEmergenciaDto>;

/** DTO de PATCH /api/emergencias/:id/estado. */
export const CambiarEstadoDto = z
  .strictObject({
    estado: estadoEmergencia,
    motivo: z.string().trim().max(500).optional(),
    prioridad: nivelPrioridad.optional(),
    justificacionPrioridad: z.string().trim().max(500).optional(),
    motivoCancelacion: motivoCancelacion.optional(),
    detalleCancelacion: z.string().trim().max(500).optional(),
    emergenciaRelacionadaId: z.uuid('emergenciaRelacionadaId debe ser un UUID').optional(),
    observacionesCierre: z.string().trim().max(2000).optional(),
    unidadId: z.uuid('unidadId debe ser un UUID').optional(),
  })
  .refine((d) => d.prioridad === undefined || d.estado === EstadoEmergencia.VALIDADA, {
    message: "'prioridad' solo puede ajustarse al validar (estado = VALIDADA)",
    path: ['prioridad'],
  })
  .refine((d) => d.prioridad === undefined || (d.justificacionPrioridad?.length ?? 0) >= 10, {
    message: "Ajustar la prioridad exige 'justificacionPrioridad' de al menos 10 caracteres (RN-15)",
    path: ['justificacionPrioridad'],
  });
export type CambiarEstadoDto = z.infer<typeof CambiarEstadoDto>;

/** DTO de POST /api/emergencias/:id/asignar-unidad. */
export const AsignarUnidadDto = z.strictObject({
  unidadId: z.uuid('unidadId debe ser un UUID valido'),
});
export type AsignarUnidadDto = z.infer<typeof AsignarUnidadDto>;

/** Filtros de GET /api/emergencias. */
export const FiltroEmergenciasDto = z.object({
  estado: estadoEmergencia.optional(),
  prioridad: nivelPrioridad.optional(),
  tipo: tipoEmergencia.optional(),
});
export type FiltroEmergenciasDto = z.infer<typeof FiltroEmergenciasDto>;

import { Request, Response } from 'express';
import { EmergenciasServicio } from '../../application/services/emergencias.servicio';
import { ProveedorTiempo } from '../../domain/ports/proveedores';
import { AsignarUnidadDto, CambiarEstadoDto, CrearEmergenciaDto, FiltroEmergenciasDto } from '../dtos/emergencia.dtos';
import {
  presentarDespacho,
  presentarDetalleEmergencia,
  presentarEmergencia,
  presentarSugerencia,
  presentarUnidad,
} from '../presenters/presentadores';

type ParamsId = { id: string };

/**
 * EmergenciasControlador (<<controller>> en la Vista de Componentes).
 * Solo traduce HTTP <-> servicio de aplicacion; no contiene reglas de negocio.
 */
export class EmergenciasControlador {
  constructor(
    private readonly servicio: EmergenciasServicio,
    private readonly tiempo: ProveedorTiempo,
  ) {}

  /** GET /api/emergencias?estado=&prioridad=&tipo= */
  listar = (_req: Request, res: Response): void => {
    const filtro = res.locals.consulta as FiltroEmergenciasDto;
    const ahora = this.tiempo.ahora();
    const emergencias = this.servicio.listar(filtro).map((e) => presentarEmergencia(e, ahora));
    res.json({ total: emergencias.length, filtros: filtro, datos: emergencias });
  };

  /** GET /api/emergencias/:id (incluye historial de estados y despachos) */
  obtener = (req: Request<ParamsId>, res: Response): void => {
    const detalle = this.servicio.obtenerDetalle(req.params.id);
    res.json(presentarDetalleEmergencia(detalle, this.tiempo.ahora()));
  };

  /** GET /api/emergencias/:id/unidades-sugeridas */
  unidadesSugeridas = (req: Request<ParamsId>, res: Response): void => {
    const sugerencias = this.servicio.sugerirUnidades(req.params.id).map(presentarSugerencia);
    res.json({
      total: sugerencias.length,
      motivo: sugerencias.length === 0 ? 'SIN_UNIDADES_DISPONIBLES' : null,
      datos: sugerencias,
    });
  };

  /** POST /api/emergencias */
  crear = async (_req: Request, res: Response): Promise<void> => {
    const dto = res.locals.cuerpo as CrearEmergenciaDto;
    const resultado = await this.servicio.registrar(
      {
        tipo: dto.tipo,
        descripcion: dto.descripcion,
        direccionReportada: dto.direccionReportada,
        nombreReportante: dto.nombreReportante ?? null,
        telefonoReportante: dto.telefonoReportante,
        numeroAfectados: dto.numeroAfectados,
        hayRiesgoVital: dto.hayRiesgoVital,
        hayHeridos: dto.hayHeridos,
        hayRiesgoPropagacion: dto.hayRiesgoPropagacion,
        latitud: dto.latitud,
        longitud: dto.longitud,
      },
      res.locals.usuarioId as string | null,
    );
    res
      .status(201)
      .location(`/api/emergencias/${resultado.emergencia.id}`)
      .json({
        ...presentarEmergencia(resultado.emergencia, this.tiempo.ahora()),
        advertencias: resultado.advertencias,
        posiblesDuplicados: resultado.posiblesDuplicados,
      });
  };

  /** PATCH /api/emergencias/:id/estado */
  cambiarEstado = (req: Request<ParamsId>, res: Response): void => {
    const dto = res.locals.cuerpo as CambiarEstadoDto;
    const emergencia = this.servicio.cambiarEstado(req.params.id, dto, res.locals.usuarioId as string | null);
    res.json(presentarEmergencia(emergencia, this.tiempo.ahora()));
  };

  /** POST /api/emergencias/:id/asignar-unidad */
  asignarUnidad = (req: Request<ParamsId>, res: Response): void => {
    const dto = res.locals.cuerpo as AsignarUnidadDto;
    const resultado = this.servicio.asignarUnidad(req.params.id, dto.unidadId, res.locals.usuarioId as string | null);
    res.status(201).json({
      mensaje: resultado.esRefuerzo
        ? `Unidad ${resultado.unidad.codigo} asignada como refuerzo`
        : `Unidad ${resultado.unidad.codigo} asignada; emergencia DESPACHADA`,
      esRefuerzo: resultado.esRefuerzo,
      emergencia: presentarEmergencia(resultado.emergencia, this.tiempo.ahora()),
      unidad: presentarUnidad(resultado.unidad),
      despacho: presentarDespacho(resultado.despacho),
    });
  };

  /** DELETE /api/emergencias/:id */
  eliminar = (req: Request<ParamsId>, res: Response): void => {
    this.servicio.eliminar(req.params.id);
    res.status(204).send();
  };
}

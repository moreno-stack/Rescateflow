import { Router } from 'express';
import { EmergenciasControlador } from '../controllers/emergencias.controlador';
import { UnidadesControlador } from '../controllers/unidades.controlador';
import { AsignarUnidadDto, CambiarEstadoDto, CrearEmergenciaDto, FiltroEmergenciasDto } from '../dtos/emergencia.dtos';
import { FiltroUnidadesDto } from '../dtos/unidad.dtos';
import { validarConsulta, validarCuerpo } from '../middlewares/validar';

/** Rutas REST de la API (prefijo /api). */
export function crearRutas(emergencias: EmergenciasControlador, unidades: UnidadesControlador): Router {
  const router = Router();

  router.get('/salud', (_req, res) => {
    res.json({ estado: 'OK', servicio: 'RescateFlow API', marcaTiempo: new Date().toISOString() });
  });

  // Emergencias
  router.get('/emergencias', validarConsulta(FiltroEmergenciasDto), emergencias.listar);
  router.post('/emergencias', validarCuerpo(CrearEmergenciaDto), emergencias.crear);
  router.get('/emergencias/:id', emergencias.obtener);
  router.get('/emergencias/:id/unidades-sugeridas', emergencias.unidadesSugeridas);
  router.patch('/emergencias/:id/estado', validarCuerpo(CambiarEstadoDto), emergencias.cambiarEstado);
  router.post('/emergencias/:id/asignar-unidad', validarCuerpo(AsignarUnidadDto), emergencias.asignarUnidad);
  router.delete('/emergencias/:id', emergencias.eliminar);

  // Unidades de respuesta
  router.get('/unidades', validarConsulta(FiltroUnidadesDto), unidades.listar);
  router.get('/unidades/:id', unidades.obtener);

  return router;
}

import cors from 'cors';
import express, { Express } from 'express';
import { Contenedor } from './contenedor';
import { EmergenciasControlador } from './presentation/controllers/emergencias.controlador';
import { UnidadesControlador } from './presentation/controllers/unidades.controlador';
import { identificarUsuario } from './presentation/middlewares/identificar-usuario';
import { manejadorErrores, rutaNoEncontrada } from './presentation/middlewares/manejador-errores';
import { registroPeticiones } from './presentation/middlewares/registro-peticiones';
import { crearRutas } from './presentation/routes/rutas';

export interface OpcionesApp {
  corsOrigen: string;
  registrarPeticiones?: boolean;
}

/** Construye la aplicacion Express (sin abrir el puerto, para poder probarla con supertest). */
export function crearApp(contenedor: Contenedor, opciones: OpcionesApp): Express {
  const app = express();
  app.disable('x-powered-by');

  app.use(cors({ origin: opciones.corsOrigen.split(',').map((o) => o.trim()) }));
  app.use(express.json({ limit: '100kb' }));
  if (opciones.registrarPeticiones !== false) app.use(registroPeticiones);
  app.use(identificarUsuario(contenedor.dependencias.usuarios));

  const emergencias = new EmergenciasControlador(contenedor.emergenciasServicio, contenedor.dependencias.tiempo);
  const unidades = new UnidadesControlador(contenedor.unidadesServicio);
  app.use('/api', crearRutas(emergencias, unidades));

  app.use(rutaNoEncontrada);
  app.use(manejadorErrores);
  return app;
}

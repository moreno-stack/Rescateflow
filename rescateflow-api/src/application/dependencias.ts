import { AreaCobertura } from '../domain/entities/ubicacion';
import { GeneradorId, ProveedorTiempo } from '../domain/ports/proveedores';
import {
  DespachoRepositorio,
  EmergenciaRepositorio,
  UnidadDeTrabajo,
  UnidadRepositorio,
  UsuarioRepositorio,
} from '../domain/ports/repositorios';
import { ServicioGeocodificacion } from '../domain/ports/servicio-geocodificacion';

/**
 * Dependencias que reciben los servicios de aplicacion. Todas son interfaces (puertos):
 * la capa de aplicacion nunca conoce SQLite, Express ni Nominatim (bajo acoplamiento).
 */
export interface DependenciasAplicacion {
  emergencias: EmergenciaRepositorio;
  unidades: UnidadRepositorio;
  despachos: DespachoRepositorio;
  usuarios: UsuarioRepositorio;
  unidadDeTrabajo: UnidadDeTrabajo;
  geocodificacion: ServicioGeocodificacion;
  tiempo: ProveedorTiempo;
  generadorId: GeneradorId;
  areaCobertura: AreaCobertura;
  velocidadPromedioKmH: number;
}

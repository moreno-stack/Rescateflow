import { DependenciasAplicacion } from './application/dependencias';
import { EmergenciasServicio } from './application/services/emergencias.servicio';
import { UnidadesServicio } from './application/services/unidades.servicio';
import { Configuracion } from './config/entorno';
import { GeneradorId, ProveedorTiempo } from './domain/ports/proveedores';
import { ServicioGeocodificacion } from './domain/ports/servicio-geocodificacion';
import { BaseDatos } from './infrastructure/database/conexion';
import { NominatimGeocodificacionAdapter } from './infrastructure/geocoding/nominatim-geocodificacion.adapter';
import { SimuladoGeocodificacionAdapter } from './infrastructure/geocoding/simulado-geocodificacion.adapter';
import { GeneradorIdUuid, ProveedorTiempoSistema } from './infrastructure/providers/proveedores-sistema';
import { SqliteDespachoRepositorio } from './infrastructure/repositories/sqlite-despacho.repositorio';
import { SqliteEmergenciaRepositorio } from './infrastructure/repositories/sqlite-emergencia.repositorio';
import { SqliteUnidadDeTrabajo } from './infrastructure/repositories/sqlite-unidad-de-trabajo';
import { SqliteUnidadRepositorio } from './infrastructure/repositories/sqlite-unidad.repositorio';
import { SqliteUsuarioRepositorio } from './infrastructure/repositories/sqlite-usuario.repositorio';

export interface Contenedor {
  dependencias: DependenciasAplicacion;
  emergenciasServicio: EmergenciasServicio;
  unidadesServicio: UnidadesServicio;
}

export interface Reemplazos {
  geocodificacion?: ServicioGeocodificacion;
  tiempo?: ProveedorTiempo;
  generadorId?: GeneradorId;
}

/**
 * Raiz de composicion: el unico lugar que conoce las implementaciones concretas.
 * Cambiar SQLite por otra base o Nominatim por otro proveedor solo toca este archivo.
 */
export function crearContenedor(db: BaseDatos, config: Configuracion, reemplazos: Reemplazos = {}): Contenedor {
  const geocodificacion =
    reemplazos.geocodificacion ??
    (config.proveedorGeocodificacion === 'NOMINATIM'
      ? new NominatimGeocodificacionAdapter()
      : new SimuladoGeocodificacionAdapter());

  const dependencias: DependenciasAplicacion = {
    emergencias: new SqliteEmergenciaRepositorio(db),
    unidades: new SqliteUnidadRepositorio(db),
    despachos: new SqliteDespachoRepositorio(db),
    usuarios: new SqliteUsuarioRepositorio(db),
    unidadDeTrabajo: new SqliteUnidadDeTrabajo(db),
    geocodificacion,
    tiempo: reemplazos.tiempo ?? new ProveedorTiempoSistema(),
    generadorId: reemplazos.generadorId ?? new GeneradorIdUuid(),
    areaCobertura: config.areaCobertura,
    velocidadPromedioKmH: config.velocidadPromedioKmH,
  };

  return {
    dependencias,
    emergenciasServicio: new EmergenciasServicio(dependencias),
    unidadesServicio: new UnidadesServicio(dependencias),
  };
}

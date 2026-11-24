import { DependenciasAplicacion } from './application/dependencias';
import { EmergenciasServicio } from './application/services/emergencias.servicio';
import { UnidadesServicio } from './application/services/unidades.servicio';
import { Configuracion } from './config/entorno';
import { GeneradorId, ProveedorTiempo } from './domain/ports/proveedores';
import { ServicioGeocodificacion } from './domain/ports/servicio-geocodificacion';
import { ConexionMongo } from './infrastructure/database/conexion';
import { NominatimGeocodificacionAdapter } from './infrastructure/geocoding/nominatim-geocodificacion.adapter';
import { SimuladoGeocodificacionAdapter } from './infrastructure/geocoding/simulado-geocodificacion.adapter';
import { GeneradorIdUuid, ProveedorTiempoSistema } from './infrastructure/providers/proveedores-sistema';
import { MongoDespachoRepositorio } from './infrastructure/repositories/mongo-despacho.repositorio';
import { MongoEmergenciaRepositorio } from './infrastructure/repositories/mongo-emergencia.repositorio';
import { MongoUnidadDeTrabajo } from './infrastructure/repositories/mongo-unidad-de-trabajo';
import { MongoUnidadRepositorio } from './infrastructure/repositories/mongo-unidad.repositorio';
import { MongoUsuarioRepositorio } from './infrastructure/repositories/mongo-usuario.repositorio';

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
 * Cambiar MongoDB por otra base o Nominatim por otro proveedor solo toca este archivo.
 */
export function crearContenedor(conexion: ConexionMongo, config: Configuracion, reemplazos: Reemplazos = {}): Contenedor {
  const geocodificacion =
    reemplazos.geocodificacion ??
    (config.proveedorGeocodificacion === 'NOMINATIM'
      ? new NominatimGeocodificacionAdapter()
      : new SimuladoGeocodificacionAdapter());

  const dependencias: DependenciasAplicacion = {
    emergencias: new MongoEmergenciaRepositorio(conexion.db),
    unidades: new MongoUnidadRepositorio(conexion.db),
    despachos: new MongoDespachoRepositorio(conexion.db),
    usuarios: new MongoUsuarioRepositorio(conexion.db),
    unidadDeTrabajo: new MongoUnidadDeTrabajo(conexion),
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

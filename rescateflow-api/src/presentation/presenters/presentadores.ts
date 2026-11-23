import { DetalleEmergencia, UnidadSugerida } from '../../application/services/emergencias.servicio';
import { DetalleUnidad, UnidadConContexto } from '../../application/services/unidades.servicio';
import { Despacho } from '../../domain/entities/despacho';
import { Emergencia } from '../../domain/entities/emergencia';
import { Unidad } from '../../domain/entities/unidad';
import { MaquinaEstadosEmergencia } from '../../domain/services/maquina-estados-emergencia';

/**
 * Presentadores: convierten entidades de dominio en DTOs de respuesta JSON.
 * Las entidades nunca se exponen directamente (patron DTO, Fase 1 seccion 6.6).
 */

const maquina = new MaquinaEstadosEmergencia();

export function presentarEmergencia(e: Emergencia, ahora: Date) {
  const { ubicacion, ...resto } = e.propiedades;
  return {
    ...resto,
    latitud: ubicacion?.latitud ?? null,
    longitud: ubicacion?.longitud ?? null,
    fueraDeSla: e.estaFueraDeSla(ahora),
    transicionesPermitidas: maquina.transicionesPermitidas(e.estado),
  };
}

export function presentarUnidad(u: Unidad) {
  const { ubicacionBase, ubicacionActual, ...resto } = u.propiedades;
  return {
    ...resto,
    latitudBase: ubicacionBase.latitud,
    longitudBase: ubicacionBase.longitud,
    latitudActual: ubicacionActual.latitud,
    longitudActual: ubicacionActual.longitud,
  };
}

export function presentarDespacho(d: Despacho) {
  return { ...d.propiedades };
}

export function presentarDetalleEmergencia(detalle: DetalleEmergencia, ahora: Date) {
  return {
    ...presentarEmergencia(detalle.emergencia, ahora),
    historial: detalle.historial,
    despachos: detalle.despachos.map(({ despacho, unidad }) => ({
      ...presentarDespacho(despacho),
      unidad: unidad ? { id: unidad.id, codigo: unidad.codigo, tipo: unidad.tipo, estado: unidad.estado } : null,
    })),
  };
}

export function presentarUnidadConContexto(item: UnidadConContexto) {
  return {
    ...presentarUnidad(item.unidad),
    ubicacionDesactualizada: item.ubicacionDesactualizada,
    despachoActivo: item.despachoActivo
      ? {
          id: item.despachoActivo.id,
          emergenciaId: item.despachoActivo.emergenciaId,
          codigoEmergencia: item.emergenciaActiva?.codigo ?? null,
          prioridadEmergencia: item.emergenciaActiva?.prioridad ?? null,
          asignadoEn: item.despachoActivo.propiedades.asignadoEn,
          llegadaEn: item.despachoActivo.llegadaEn,
        }
      : null,
  };
}

export function presentarDetalleUnidad(detalle: DetalleUnidad) {
  return { ...presentarUnidadConContexto(detalle), historial: detalle.historial };
}

export function presentarSugerencia(s: UnidadSugerida) {
  return {
    unidad: presentarUnidad(s.unidad),
    distanciaKm: s.distanciaKm,
    tiempoEstimadoMin: s.tiempoEstimadoMin,
    esTipoPrincipal: s.esTipoPrincipal,
    advertencias: s.advertencias,
  };
}

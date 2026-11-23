import { useEffect, useState } from 'react';
import { PERFILES } from '../../context/SesionContext';
import { ApiError, apiService } from '../../services/apiService';
import type { EmergenciaDetalle } from '../../types/dominio';
import {
  ETIQUETA_ESTADO,
  ETIQUETA_MOTIVO,
  ETIQUETA_PRIORIDAD,
  ETIQUETA_TIPO,
} from '../../utils/etiquetas';
import { coordenadas, fechaHora, kilometros } from '../../utils/formato';
import { separarDescripcion } from '../../utils/titulo';
import { InsigniaEstado, InsigniaPrioridad, InsigniaUnidad } from '../comunes/Insignias';
import { Modal } from '../comunes/Modal';
import { Spinner } from '../comunes/Spinner';

function nombreUsuario(id: string | null): string {
  if (!id) return 'Sin usuario';
  return PERFILES.find((p) => p.id === id)?.nombre ?? `Usuario ${id.slice(-4)}`;
}

/** Detalle de una emergencia con su historial de cambios de estado (GET /api/emergencias/:id). */
export function DetalleEmergencia({ id, alCerrar }: { id: string; alCerrar: () => void }) {
  const [detalle, setDetalle] = useState<EmergenciaDetalle | null>(null);
  const [error, setError] = useState<ApiError | null>(null);

  useEffect(() => {
    const controlador = new AbortController();
    apiService
      .obtenerEmergencia(id, controlador.signal)
      .then(setDetalle)
      .catch((e: unknown) => {
        if (!controlador.signal.aborted) setError(e instanceof ApiError ? e : new ApiError(0, 'ERROR', 'No se pudo cargar el detalle'));
      });
    return () => controlador.abort();
  }, [id]);

  const textos = detalle ? separarDescripcion(detalle.descripcion) : null;

  return (
    <Modal
      abierto
      ancho="amplio"
      titulo={detalle ? `${detalle.codigo}: ${textos?.titulo}` : 'Detalle de la emergencia'}
      subtitulo={detalle ? ETIQUETA_TIPO[detalle.tipo] : undefined}
      alCerrar={alCerrar}
    >
      {!detalle && !error && (
        <p className="vacio"><Spinner /> Cargando detalle</p>
      )}
      {error && <div className="alerta-error" role="alert"><p>{error.message}</p></div>}
      {detalle && (
        <div className="detalle">
          <div className="detalle__insignias">
            <InsigniaPrioridad prioridad={detalle.prioridad} />
            <InsigniaEstado estado={detalle.estado} />
            <span className="detalle__puntaje">{detalle.puntajePrioridad} puntos de triaje</span>
          </div>
          {textos?.detalle && <p className="detalle__descripcion">{textos.detalle}</p>}

          <dl className="detalle__datos">
            <div><dt>Dirección reportada</dt><dd>{detalle.direccionReportada}</dd></div>
            {detalle.direccionNormalizada && <div><dt>Dirección encontrada</dt><dd>{detalle.direccionNormalizada}</dd></div>}
            <div>
              <dt>Coordenadas</dt>
              <dd>
                {coordenadas(detalle.latitud, detalle.longitud) ?? 'Sin coordenadas'}
                {detalle.fuenteUbicacion && ` (${detalle.fuenteUbicacion === 'MANUAL' ? 'manual' : 'geocodificada'})`}
              </dd>
            </div>
            <div><dt>Reportante</dt><dd>{detalle.nombreReportante ?? 'Anónimo'}, {detalle.telefonoReportante}</dd></div>
            <div><dt>Afectados</dt><dd>{detalle.numeroAfectados}</dd></div>
            <div>
              <dt>Factores</dt>
              <dd>
                {[detalle.hayRiesgoVital && 'riesgo vital', detalle.hayHeridos && 'heridos', detalle.hayRiesgoPropagacion && 'propagación']
                  .filter(Boolean)
                  .join(', ') || 'Ninguno'}
              </dd>
            </div>
            {detalle.prioridadAjustadaManualmente && (
              <div><dt>Ajuste de prioridad</dt><dd>{ETIQUETA_PRIORIDAD[detalle.prioridad]}: {detalle.justificacionPrioridad}</dd></div>
            )}
            {detalle.observacionesCierre && <div><dt>Cierre</dt><dd>{detalle.observacionesCierre}</dd></div>}
            {detalle.motivoCancelacion && (
              <div>
                <dt>Cancelación</dt>
                <dd>{ETIQUETA_MOTIVO[detalle.motivoCancelacion]}{detalle.detalleCancelacion ? `: ${detalle.detalleCancelacion}` : ''}</dd>
              </div>
            )}
          </dl>

          <h3 className="detalle__subtitulo">Historial de estados</h3>
          <ol className="linea-tiempo">
            {detalle.historial.map((h) => (
              <li key={h.id} className={`linea-tiempo__paso estado-${h.estadoNuevo.toLowerCase()}`}>
                <p className="linea-tiempo__estado">
                  {h.estadoAnterior ? `${ETIQUETA_ESTADO[h.estadoAnterior]} a ${ETIQUETA_ESTADO[h.estadoNuevo]}` : `Registrada como ${ETIQUETA_ESTADO[h.estadoNuevo].toLowerCase()}`}
                </p>
                <p className="linea-tiempo__meta">
                  {fechaHora(h.ocurridoEn)}, {nombreUsuario(h.usuarioId)}
                </p>
                {h.motivo && <p className="linea-tiempo__motivo">{h.motivo}</p>}
              </li>
            ))}
          </ol>

          <h3 className="detalle__subtitulo">Unidades despachadas</h3>
          {detalle.despachos.length === 0 ? (
            <p className="vacio vacio--compacto">Aún no se ha asignado ninguna unidad.</p>
          ) : (
            <table className="tabla">
              <thead>
                <tr>
                  <th scope="col">Unidad</th>
                  <th scope="col">Despacho</th>
                  <th scope="col">Distancia</th>
                  <th scope="col">Asignada</th>
                  <th scope="col">Llegada</th>
                  <th scope="col">Liberada</th>
                </tr>
              </thead>
              <tbody>
                {detalle.despachos.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <strong>{d.unidad?.codigo ?? d.unidadId.slice(0, 8)}</strong>{' '}
                      {d.unidad && <InsigniaUnidad estado={d.unidad.estado} />}
                    </td>
                    <td>{d.estado === 'ACTIVO' ? 'Activo' : d.estado === 'FINALIZADO' ? 'Finalizado' : 'Cancelado'}</td>
                    <td>{kilometros(d.distanciaKm)}, {d.tiempoEstimadoMin} min</td>
                    <td>{fechaHora(d.asignadoEn)}</td>
                    <td>{d.llegadaEn ? fechaHora(d.llegadaEn) : 'Pendiente'}</td>
                    <td>{d.liberadoEn ? fechaHora(d.liberadoEn) : 'En curso'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </Modal>
  );
}

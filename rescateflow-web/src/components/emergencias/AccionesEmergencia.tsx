import { useEffect, useId, useState } from 'react';
import { usePanelContext } from '../../context/PanelContext';
import { useAccion } from '../../hooks/useAccion';
import { ApiError, apiService } from '../../services/apiService';
import type { Emergencia, EstadoEmergencia, UnidadSugerida } from '../../types/dominio';
import { ACCION_TRANSICION, ETIQUETA_TIPO_UNIDAD, EXITO_TRANSICION } from '../../utils/etiquetas';
import { kilometros } from '../../utils/formato';
import { Icono } from '../comunes/Icono';
import { Spinner } from '../comunes/Spinner';

export type ModoDialogo = 'ajustar' | 'cerrar' | 'cancelar' | 'eliminar';

interface Props {
  emergencia: Emergencia;
  alAbrirDialogo: (modo: ModoDialogo) => void;
  alVerDetalle: () => void;
}

const ESTADOS_ASIGNABLES: EstadoEmergencia[] = ['VALIDADA', 'DESPACHADA', 'EN_ATENCION'];

/**
 * Acciones directas de una emergencia:
 *  - asignar una unidad libre (POST /asignar-unidad) desde un desplegable;
 *  - avanzar el estado con botones que solo muestran las transiciones validas
 *    que informa el backend (transicionesPermitidas);
 *  - eliminar (solo REPORTADA o CANCELADA) y ver el historial.
 */
export function AccionesEmergencia({ emergencia, alAbrirDialogo, alVerDetalle }: Props) {
  const { unidades } = usePanelContext();
  const { ejecutar, cargando } = useAccion();
  const [accionEnCurso, setAccionEnCurso] = useState<string | null>(null);
  const [sugerencias, setSugerencias] = useState<UnidadSugerida[]>([]);
  const [cargandoSugerencias, setCargandoSugerencias] = useState(false);
  const [errorSugerencias, setErrorSugerencias] = useState<string | null>(null);
  const [unidadElegida, setUnidadElegida] = useState('');
  const idSelector = useId();

  const puedeAsignar = ESTADOS_ASIGNABLES.includes(emergencia.estado);
  const esRefuerzo = emergencia.estado !== 'VALIDADA';
  // Cambia cuando alguna unidad cambia de estado: se vuelven a pedir las sugerencias.
  const firmaUnidades = unidades.map((u) => `${u.id}:${u.estado}`).join('|');

  useEffect(() => {
    if (!puedeAsignar) return;
    const controlador = new AbortController();
    setCargandoSugerencias(true);
    apiService
      .unidadesSugeridas(emergencia.id, controlador.signal)
      .then((r) => {
        setSugerencias(r.datos);
        setErrorSugerencias(null);
        setUnidadElegida((actual) => (r.datos.some((s) => s.unidad.id === actual) ? actual : (r.datos[0]?.unidad.id ?? '')));
      })
      .catch((e: unknown) => {
        if (controlador.signal.aborted) return;
        setSugerencias([]);
        setErrorSugerencias(
          e instanceof ApiError && e.codigo === 'EMERGENCIA_SIN_UBICACION'
            ? 'Sin coordenadas: no se puede despachar.'
            : e instanceof ApiError ? e.message : 'No se pudieron consultar las unidades.',
        );
      })
      .finally(() => {
        if (!controlador.signal.aborted) setCargandoSugerencias(false);
      });
    return () => controlador.abort();
  }, [emergencia.id, puedeAsignar, firmaUnidades]);

  async function asignar() {
    if (!unidadElegida) return;
    setAccionEnCurso('asignar');
    await ejecutar(() => apiService.asignarUnidad(emergencia.id, unidadElegida), { exito: (r) => r.mensaje });
    setAccionEnCurso(null);
  }

  async function avanzar(estado: EstadoEmergencia) {
    setAccionEnCurso(estado);
    await ejecutar(() => apiService.cambiarEstado(emergencia.id, { estado }), {
      exito: (e) => `${e.codigo} ${EXITO_TRANSICION[estado] ?? 'actualizada'}`,
    });
    setAccionEnCurso(null);
  }

  const transiciones = emergencia.transicionesPermitidas.filter((t) => t !== 'DESPACHADA');
  const puedeEliminar = emergencia.estado === 'REPORTADA' || emergencia.estado === 'CANCELADA';

  return (
    <div className="acciones">
      {puedeAsignar && (
        <div className="asignacion">
          <label htmlFor={idSelector} className="solo-lectores">
            Unidad para {emergencia.codigo}
          </label>
          <select
            id={idSelector}
            value={unidadElegida}
            onChange={(e) => setUnidadElegida(e.target.value)}
            disabled={cargandoSugerencias || sugerencias.length === 0 || cargando}
          >
            {cargandoSugerencias && sugerencias.length === 0 && <option value="">Buscando unidades libres</option>}
            {!cargandoSugerencias && sugerencias.length === 0 && (
              <option value="">{errorSugerencias ?? 'No hay unidades compatibles libres'}</option>
            )}
            {sugerencias.map((s) => (
              <option key={s.unidad.id} value={s.unidad.id}>
                {s.unidad.codigo} {ETIQUETA_TIPO_UNIDAD[s.unidad.tipo]}, {kilometros(s.distanciaKm)} ({s.tiempoEstimadoMin} min)
                {s.esTipoPrincipal ? ', recomendada' : ''}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="boton boton--primario"
            onClick={() => void asignar()}
            disabled={!unidadElegida || cargando}
          >
            {accionEnCurso === 'asignar' ? <Spinner etiqueta="Asignando" /> : <Icono nombre="despacho" tamano={16} />}
            {esRefuerzo ? 'Enviar refuerzo' : 'Asignar unidad'}
          </button>
        </div>
      )}

      {emergencia.estado === 'REPORTADA' && (
        <p className="acciones__nota">Valide la emergencia para poder asignarle una unidad.</p>
      )}

      <div className="acciones__botones">
        {transiciones.map((estado) => {
          const conDialogo = estado === 'CERRADA' || estado === 'CANCELADA';
          const peligro = estado === 'CANCELADA';
          return (
            <button
              key={estado}
              type="button"
              className={`boton ${peligro ? 'boton--peligro' : estado === 'VALIDADA' ? 'boton--confirmar' : 'boton--secundario'}`}
              disabled={cargando}
              onClick={() => (conDialogo ? alAbrirDialogo(estado === 'CERRADA' ? 'cerrar' : 'cancelar') : void avanzar(estado))}
            >
              {accionEnCurso === estado && <Spinner etiqueta="Procesando" />}
              {ACCION_TRANSICION[estado]}
            </button>
          );
        })}
        {emergencia.transicionesPermitidas.includes('VALIDADA') && (
          <button type="button" className="boton boton--secundario" disabled={cargando} onClick={() => alAbrirDialogo('ajustar')}>
            Validar con otra prioridad
          </button>
        )}
        <span className="acciones__separador" />
        <button type="button" className="boton boton--texto" onClick={alVerDetalle}>
          <Icono nombre="historial" tamano={16} /> Historial
        </button>
        {puedeEliminar && (
          <button
            type="button"
            className="boton-icono boton-icono--peligro"
            onClick={() => alAbrirDialogo('eliminar')}
            aria-label={`Eliminar ${emergencia.codigo}`}
            title="Eliminar"
            disabled={cargando}
          >
            <Icono nombre="basura" tamano={17} />
          </button>
        )}
      </div>
    </div>
  );
}

import { useState, type FormEvent } from 'react';
import { lineasDeDetalle, tituloDeError, useAccion } from '../../hooks/useAccion';
import { ApiError, apiService } from '../../services/apiService';
import { MOTIVOS_CANCELACION, NIVELES_PRIORIDAD, type Emergencia, type MotivoCancelacion, type NivelPrioridad } from '../../types/dominio';
import { ESTADOS_ACTIVOS, ETIQUETA_MOTIVO, ETIQUETA_PRIORIDAD } from '../../utils/etiquetas';
import { separarDescripcion } from '../../utils/titulo';
import { Modal } from '../comunes/Modal';
import { Spinner } from '../comunes/Spinner';
import type { ModoDialogo } from './AccionesEmergencia';

interface Props {
  modo: ModoDialogo;
  emergencia: Emergencia;
  todas: Emergencia[];
  alCerrar: () => void;
}

const TITULOS: Record<ModoDialogo, string> = {
  ajustar: 'Validar con otra prioridad',
  cerrar: 'Cerrar emergencia',
  cancelar: 'Cancelar emergencia',
  eliminar: 'Eliminar emergencia',
};

/**
 * Dialogo para las acciones que piden datos extra:
 *  - ajustar: VALIDADA con prioridad manual + justificacion (RN-15/RN-16)
 *  - cerrar: CERRADA con observaciones de cierre
 *  - cancelar: CANCELADA con motivo (RN-38)
 *  - eliminar: DELETE (solo REPORTADA o CANCELADA)
 * Los errores 400/409/422 del backend se muestran dentro del dialogo.
 */
export function DialogoAccion({ modo, emergencia, todas, alCerrar }: Props) {
  const { ejecutar, cargando } = useAccion();
  const [error, setError] = useState<ApiError | null>(null);
  const [prioridad, setPrioridad] = useState<NivelPrioridad>(emergencia.prioridad);
  const [justificacion, setJustificacion] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [motivo, setMotivo] = useState<MotivoCancelacion>('FALSA_ALARMA');
  const [detalleCancelacion, setDetalleCancelacion] = useState('');
  const [relacionada, setRelacionada] = useState('');

  const { titulo } = separarDescripcion(emergencia.descripcion);
  const candidatasDuplicado = todas.filter(
    (e) => e.id !== emergencia.id && e.tipo === emergencia.tipo && ESTADOS_ACTIVOS.includes(e.estado),
  );

  async function confirmar(evento: FormEvent) {
    evento.preventDefault();
    setError(null);
    const codigo = emergencia.codigo;
    let resultado;
    switch (modo) {
      case 'ajustar':
        resultado = await ejecutar(
          () => apiService.cambiarEstado(emergencia.id, { estado: 'VALIDADA', prioridad, justificacionPrioridad: justificacion.trim() }),
          { exito: (e) => `${codigo} validada con prioridad ${ETIQUETA_PRIORIDAD[e.prioridad].toLowerCase()}`, notificarError: false },
        );
        break;
      case 'cerrar':
        resultado = await ejecutar(
          () => apiService.cambiarEstado(emergencia.id, { estado: 'CERRADA', observacionesCierre: observaciones.trim() }),
          { exito: () => `${codigo} cerrada; unidades liberadas`, notificarError: false },
        );
        break;
      case 'cancelar':
        resultado = await ejecutar(
          () =>
            apiService.cambiarEstado(emergencia.id, {
              estado: 'CANCELADA',
              motivoCancelacion: motivo,
              ...(detalleCancelacion.trim() ? { detalleCancelacion: detalleCancelacion.trim() } : {}),
              ...(motivo === 'DUPLICADA' && relacionada ? { emergenciaRelacionadaId: relacionada } : {}),
            }),
          { exito: () => `${codigo} cancelada`, notificarError: false },
        );
        break;
      case 'eliminar':
        resultado = await ejecutar(() => apiService.eliminarEmergencia(emergencia.id), {
          exito: () => `${codigo} eliminada`,
          notificarError: false,
        });
        break;
    }
    if (resultado.ok) alCerrar();
    else setError(resultado.error);
  }

  const idFormulario = `dialogo-${modo}`;
  const textoBoton: Record<ModoDialogo, string> = {
    ajustar: 'Validar emergencia',
    cerrar: 'Cerrar emergencia',
    cancelar: 'Cancelar emergencia',
    eliminar: 'Eliminar definitivamente',
  };

  return (
    <Modal
      abierto
      titulo={TITULOS[modo]}
      subtitulo={`${emergencia.codigo}: ${titulo}`}
      alCerrar={alCerrar}
      pie={
        <>
          <button type="button" className="boton boton--texto" onClick={alCerrar}>Volver</button>
          <button
            type="submit"
            form={idFormulario}
            className={`boton ${modo === 'eliminar' || modo === 'cancelar' ? 'boton--peligro-solido' : 'boton--primario'}`}
            disabled={cargando}
          >
            {cargando && <Spinner etiqueta="Procesando" />}
            {textoBoton[modo]}
          </button>
        </>
      }
    >
      <form id={idFormulario} className="formulario" onSubmit={confirmar} noValidate>
        {modo === 'ajustar' && (
          <>
            <p className="texto-ayuda">
              El sistema calculó prioridad {ETIQUETA_PRIORIDAD[emergencia.prioridad].toLowerCase()} ({emergencia.puntajePrioridad} puntos).
              Con riesgo vital no puede quedar por debajo de alta.
            </p>
            <div className="campo">
              <label htmlFor="d-prioridad">Nueva prioridad</label>
              <select id="d-prioridad" value={prioridad} onChange={(e) => setPrioridad(e.target.value as NivelPrioridad)}>
                {NIVELES_PRIORIDAD.map((p) => <option key={p} value={p}>{ETIQUETA_PRIORIDAD[p]}</option>)}
              </select>
            </div>
            <div className="campo">
              <label htmlFor="d-justificacion">Justificación</label>
              <textarea
                id="d-justificacion"
                rows={3}
                value={justificacion}
                onChange={(e) => setJustificacion(e.target.value)}
                placeholder="Por qué se cambia la prioridad (mínimo 10 caracteres)"
              />
            </div>
          </>
        )}

        {modo === 'cerrar' && (
          <>
            <p className="texto-ayuda">Al cerrar, todas las unidades asignadas quedan disponibles.</p>
            <div className="campo">
              <label htmlFor="d-observaciones">Observaciones de cierre</label>
              <textarea
                id="d-observaciones"
                rows={4}
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Resultado de la atención (mínimo 10 caracteres)"
              />
            </div>
          </>
        )}

        {modo === 'cancelar' && (
          <>
            <p className="texto-ayuda">Las unidades en ruta se liberan. Una emergencia con unidades en el sitio no se puede cancelar: debe cerrarse.</p>
            <div className="campo">
              <label htmlFor="d-motivo">Motivo</label>
              <select id="d-motivo" value={motivo} onChange={(e) => setMotivo(e.target.value as MotivoCancelacion)}>
                {MOTIVOS_CANCELACION.map((m) => <option key={m} value={m}>{ETIQUETA_MOTIVO[m]}</option>)}
              </select>
            </div>
            {motivo === 'DUPLICADA' && (
              <div className="campo">
                <label htmlFor="d-relacionada">Duplicada de</label>
                <select id="d-relacionada" value={relacionada} onChange={(e) => setRelacionada(e.target.value)}>
                  <option value="">Seleccione la emergencia original</option>
                  {candidatasDuplicado.map((e) => (
                    <option key={e.id} value={e.id}>{e.codigo}: {separarDescripcion(e.descripcion).titulo}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="campo">
              <label htmlFor="d-detalle">
                Detalle {motivo !== 'OTRO' && <span className="campo__opcional">(opcional)</span>}
              </label>
              <textarea id="d-detalle" rows={3} value={detalleCancelacion} onChange={(e) => setDetalleCancelacion(e.target.value)} />
            </div>
          </>
        )}

        {modo === 'eliminar' && (
          <p className="texto-ayuda">
            Se borrará la emergencia y su historial. Esta acción no se puede deshacer. Solo se permite para emergencias reportadas o canceladas.
          </p>
        )}

        {error && (
          <div className="alerta-error" role="alert">
            <p className="alerta-error__titulo">
              {tituloDeError(error)}
              {error.statusCode > 0 && <span className="alerta-error__codigo"> (HTTP {error.statusCode})</span>}
            </p>
            <p>{error.message}</p>
            {lineasDeDetalle(error).length > 0 && (
              <ul>{lineasDeDetalle(error).map((l) => <li key={l}>{l}</li>)}</ul>
            )}
          </div>
        )}
      </form>
    </Modal>
  );
}

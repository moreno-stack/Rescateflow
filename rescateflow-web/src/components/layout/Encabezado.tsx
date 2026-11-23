import { usePanelContext } from '../../context/PanelContext';
import { PERFILES, useSesion } from '../../context/SesionContext';
import { useAhora } from '../../hooks/useAhora';
import { tiempoTranscurrido } from '../../utils/formato';
import { Icono } from '../comunes/Icono';
import { Spinner } from '../comunes/Spinner';

/** Barra superior: identidad, estado de conexion con la API, perfil que actua y recarga manual. */
export function Encabezado() {
  const { actualizando, error, ultimaActualizacion, recargar } = usePanelContext();
  const { perfil, cambiarPerfil } = useSesion();
  const ahora = useAhora(10_000);
  const conectado = !error || error.statusCode !== 0;

  return (
    <header className="encabezado">
      <div className="encabezado__marca">
        <span className="marca__etiqueta" aria-hidden="true">
          <span className="marca__perforacion" />
        </span>
        <div>
          <h1 className="marca__nombre">RescateFlow</h1>
          <p className="marca__lugar">Centro de despacho de emergencias, Pasto</p>
        </div>
      </div>

      <div className="encabezado__herramientas">
        <p className={`conexion ${conectado && !error ? 'conexion--ok' : 'conexion--caida'}`} aria-live="polite">
          <span className="conexion__punto" aria-hidden="true" />
          {error
            ? error.statusCode === 0 || error.statusCode >= 500
              ? 'API sin conexión'
              : 'Error al consultar la API'
            : ultimaActualizacion
              ? `En línea, actualizado ${tiempoTranscurrido(ultimaActualizacion.toISOString(), ahora)}`
              : 'Conectando con la API'}
        </p>

        <label className="campo-perfil">
          <span className="campo-perfil__etiqueta">Actúa como</span>
          <select
            value={perfil.id ?? ''}
            onChange={(e) => cambiarPerfil(e.target.value || null)}
            aria-describedby="perfil-ayuda"
          >
            {PERFILES.map((p) => (
              <option key={p.id ?? 'ninguno'} value={p.id ?? ''}>
                {p.nombre}
              </option>
            ))}
          </select>
          <span id="perfil-ayuda" className="solo-lectores">
            Queda registrado en el historial de cada cambio de estado
          </span>
        </label>

        <button type="button" className="boton boton--secundario" onClick={() => void recargar()} disabled={actualizando}>
          {actualizando ? <Spinner etiqueta="Actualizando" /> : <Icono nombre="recargar" tamano={16} />}
          Actualizar
        </button>
      </div>
    </header>
  );
}

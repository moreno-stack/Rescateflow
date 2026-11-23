import { useNotificaciones } from '../../context/NotificacionesContext';
import { Icono } from './Icono';

/** Pila de notificaciones (exito, aviso y error de la API) anunciada a lectores de pantalla. */
export function Notificaciones() {
  const { notificaciones, descartar } = useNotificaciones();
  return (
    <div className="notificaciones" aria-live="polite" aria-relevant="additions">
      {notificaciones.map((n) => (
        <div key={n.id} className={`notificacion notificacion--${n.tipo}`} role={n.tipo === 'error' ? 'alert' : 'status'}>
          <div className="notificacion__texto">
            <p className="notificacion__titulo">{n.titulo}</p>
            {n.mensaje && <p className="notificacion__mensaje">{n.mensaje}</p>}
            {n.detalles && n.detalles.length > 0 && (
              <ul className="notificacion__detalles">
                {n.detalles.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            )}
          </div>
          <button type="button" className="boton-icono" onClick={() => descartar(n.id)} aria-label="Descartar aviso">
            <Icono nombre="cerrar" tamano={16} />
          </button>
        </div>
      ))}
    </div>
  );
}

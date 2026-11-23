import type { EstadoEmergencia, EstadoUnidad, NivelPrioridad } from '../../types/dominio';
import { ETIQUETA_ESTADO, ETIQUETA_ESTADO_UNIDAD, ETIQUETA_PRIORIDAD } from '../../utils/etiquetas';

/** Insignia de prioridad: color solido de triaje. */
export function InsigniaPrioridad({ prioridad }: { prioridad: NivelPrioridad }) {
  return <span className={`insignia insignia--prioridad prioridad-${prioridad.toLowerCase()}`}>{ETIQUETA_PRIORIDAD[prioridad]}</span>;
}

/** Insignia de estado de emergencia: contorno con punto de color. */
export function InsigniaEstado({ estado }: { estado: EstadoEmergencia }) {
  return (
    <span className={`insignia insignia--estado estado-${estado.toLowerCase()}`}>
      <span className="insignia__punto" aria-hidden="true" />
      {ETIQUETA_ESTADO[estado]}
    </span>
  );
}

/** Insignia de estado de unidad. */
export function InsigniaUnidad({ estado }: { estado: EstadoUnidad }) {
  return (
    <span className={`insignia insignia--estado unidad-${estado.toLowerCase()}`}>
      <span className="insignia__punto" aria-hidden="true" />
      {ETIQUETA_ESTADO_UNIDAD[estado]}
    </span>
  );
}

import { ESTADOS_EMERGENCIA, NIVELES_PRIORIDAD, type FiltrosEmergencias as Filtros } from '../../types/dominio';
import { ETIQUETA_ESTADO, ETIQUETA_PRIORIDAD } from '../../utils/etiquetas';

interface Props {
  filtros: Filtros;
  alCambiar: (filtros: Filtros) => void;
  busqueda: string;
  alBuscar: (texto: string) => void;
}

/**
 * Filtros por estado y prioridad. Cada cambio vuelve a consultar
 * GET /api/emergencias?estado=&prioridad= de inmediato.
 */
export function FiltrosEmergencias({ filtros, alCambiar, busqueda, alBuscar }: Props) {
  const hayFiltros = Boolean(filtros.estado || filtros.prioridad || busqueda);

  return (
    <div className="filtros">
      <fieldset className="filtros__grupo">
        <legend className="filtros__leyenda">Prioridad</legend>
        <div className="segmentado">
          <button
            type="button"
            className="segmentado__opcion"
            aria-pressed={!filtros.prioridad}
            onClick={() => alCambiar({ ...filtros, prioridad: undefined })}
          >
            Todas
          </button>
          {NIVELES_PRIORIDAD.map((p) => (
            <button
              key={p}
              type="button"
              className={`segmentado__opcion segmentado__opcion--${p.toLowerCase()}`}
              aria-pressed={filtros.prioridad === p}
              onClick={() => alCambiar({ ...filtros, prioridad: filtros.prioridad === p ? undefined : p })}
            >
              {ETIQUETA_PRIORIDAD[p]}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="filtros__fila">
        <label className="filtros__campo">
          <span className="filtros__leyenda">Estado</span>
          <select
            value={filtros.estado ?? ''}
            onChange={(e) => alCambiar({ ...filtros, estado: (e.target.value || undefined) as Filtros['estado'] })}
          >
            <option value="">Todos los estados</option>
            {ESTADOS_EMERGENCIA.map((estado) => (
              <option key={estado} value={estado}>{ETIQUETA_ESTADO[estado]}</option>
            ))}
          </select>
        </label>

        <label className="filtros__campo filtros__campo--busqueda">
          <span className="filtros__leyenda">Buscar</span>
          <input
            type="search"
            value={busqueda}
            placeholder="Código, título o dirección"
            onChange={(e) => alBuscar(e.target.value)}
          />
        </label>

        {hayFiltros && (
          <button
            type="button"
            className="boton boton--texto"
            onClick={() => {
              alCambiar({});
              alBuscar('');
            }}
          >
            Quitar filtros
          </button>
        )}
      </div>
    </div>
  );
}

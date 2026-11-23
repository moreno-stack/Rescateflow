import type { Emergencia, UnidadConEstado } from '../../types/dominio';
import { ETIQUETA_MOTIVO, ETIQUETA_PRIORIDAD, ETIQUETA_TIPO } from '../../utils/etiquetas';
import { tiempoTranscurrido } from '../../utils/formato';
import { separarDescripcion } from '../../utils/titulo';
import { ICONO_TIPO, ICONO_UNIDAD, Icono } from '../comunes/Icono';
import { InsigniaEstado } from '../comunes/Insignias';
import { AccionesEmergencia, type ModoDialogo } from './AccionesEmergencia';

interface Props {
  emergencia: Emergencia;
  unidadesAsignadas: UnidadConEstado[];
  ahora: number;
  alAbrirDialogo: (modo: ModoDialogo) => void;
  alVerDetalle: () => void;
}

/**
 * Tarjeta de una emergencia. A la izquierda, la "etiqueta de triaje": franja del
 * color de la prioridad con el puntaje calculado por el backend.
 */
export function TarjetaEmergencia({ emergencia: e, unidadesAsignadas, ahora, alAbrirDialogo, alVerDetalle }: Props) {
  const { titulo, detalle } = separarDescripcion(e.descripcion);
  const finalizada = e.estado === 'CERRADA' || e.estado === 'CANCELADA';

  return (
    <article
      className={`emergencia prioridad-${e.prioridad.toLowerCase()} ${finalizada ? 'emergencia--finalizada' : ''}`}
      aria-label={`${e.codigo}, prioridad ${ETIQUETA_PRIORIDAD[e.prioridad]}`}
    >
      <div className="triaje-etiqueta" title={`Puntaje de triaje ${e.puntajePrioridad} de 100`}>
        <span className="triaje-etiqueta__perforacion" aria-hidden="true" />
        <span className="triaje-etiqueta__puntaje">{e.puntajePrioridad}</span>
        <span className="triaje-etiqueta__nivel">{ETIQUETA_PRIORIDAD[e.prioridad]}</span>
        {e.prioridadAjustadaManualmente && <span className="triaje-etiqueta__ajuste">ajustada</span>}
      </div>

      <div className="emergencia__cuerpo">
        <header className="emergencia__cabecera">
          <span className="emergencia__codigo">{e.codigo}</span>
          <span className="emergencia__tipo">
            <Icono nombre={ICONO_TIPO[e.tipo]} tamano={16} />
            {ETIQUETA_TIPO[e.tipo]}
          </span>
          <InsigniaEstado estado={e.estado} />
          {e.fueraDeSla && <span className="demora">Fuera del tiempo objetivo</span>}
          <span className="emergencia__tiempo" title={new Date(e.reportadaEn).toLocaleString('es-CO')}>
            <Icono nombre="reloj" tamano={14} />
            {tiempoTranscurrido(e.reportadaEn, ahora)}
          </span>
        </header>

        <h3 className="emergencia__titulo">{titulo}</h3>
        {detalle && <p className="emergencia__detalle">{detalle}</p>}

        <ul className="emergencia__datos">
          <li>
            <Icono nombre="pin" tamano={15} />
            {e.direccionNormalizada ?? e.direccionReportada}
            {e.latitud === null && <span className="sin-ubicacion">sin coordenadas</span>}
          </li>
          <li>
            <Icono nombre="personas" tamano={15} />
            {e.numeroAfectados === 1 ? '1 afectado' : `${e.numeroAfectados} afectados`}
          </li>
          {e.hayRiesgoVital && <li className="dato-riesgo">Riesgo vital</li>}
          {e.hayHeridos && <li className="dato-riesgo">Heridos</li>}
          {e.hayRiesgoPropagacion && <li className="dato-riesgo">Puede propagarse</li>}
        </ul>

        {unidadesAsignadas.length > 0 && (
          <ul className="emergencia__unidades" aria-label="Unidades asignadas">
            {unidadesAsignadas.map((u) => (
              <li key={u.id} className={`chip-unidad unidad-${u.estado.toLowerCase()}`}>
                <Icono nombre={ICONO_UNIDAD[u.tipo]} tamano={15} />
                {u.codigo} {u.estado === 'OCUPADA' ? 'en el sitio' : 'en ruta'}
              </li>
            ))}
          </ul>
        )}

        {e.estado === 'CERRADA' && e.observacionesCierre && <p className="emergencia__cierre">Cierre: {e.observacionesCierre}</p>}
        {e.estado === 'CANCELADA' && (
          <p className="emergencia__cierre">
            Cancelada{e.motivoCancelacion ? ` por ${ETIQUETA_MOTIVO[e.motivoCancelacion].toLowerCase()}` : ''}
            {e.detalleCancelacion ? `: ${e.detalleCancelacion}` : ''}
          </p>
        )}

        <AccionesEmergencia emergencia={e} alAbrirDialogo={alAbrirDialogo} alVerDetalle={alVerDetalle} />
      </div>
    </article>
  );
}

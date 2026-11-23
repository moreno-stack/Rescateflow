import { usePanelContext } from '../../context/PanelContext';
import { useAhora } from '../../hooks/useAhora';
import { ESTADOS_UNIDAD, type EstadoUnidad } from '../../types/dominio';
import { ETIQUETA_ESTADO_UNIDAD, ETIQUETA_TIPO_UNIDAD } from '../../utils/etiquetas';
import { tiempoTranscurrido } from '../../utils/formato';
import { ICONO_UNIDAD, Icono } from '../comunes/Icono';
import { InsigniaUnidad } from '../comunes/Insignias';

/** Panel lateral con el estado actual de las unidades de respuesta (GET /api/unidades). */
export function PanelUnidades() {
  const { unidades, cargandoInicial } = usePanelContext();
  const ahora = useAhora();

  const conteo = ESTADOS_UNIDAD.reduce<Record<EstadoUnidad, number>>(
    (acc, estado) => ({ ...acc, [estado]: unidades.filter((u) => u.estado === estado).length }),
    { DISPONIBLE: 0, EN_RUTA: 0, OCUPADA: 0, FUERA_DE_SERVICIO: 0 },
  );

  return (
    <section className="panel panel--unidades" aria-labelledby="titulo-unidades">
      <header className="panel__encabezado">
        <h2 id="titulo-unidades" className="panel__titulo">Unidades de respuesta</h2>
      </header>

      {unidades.length > 0 && (
        <div className="barra-estados" role="img" aria-label={ESTADOS_UNIDAD.map((e) => `${ETIQUETA_ESTADO_UNIDAD[e]}: ${conteo[e]}`).join(', ')}>
          {ESTADOS_UNIDAD.filter((e) => conteo[e] > 0).map((e) => (
            <span key={e} className={`barra-estados__tramo unidad-${e.toLowerCase()}`} style={{ flexGrow: conteo[e] }} />
          ))}
        </div>
      )}
      <dl className="leyenda-estados">
        {ESTADOS_UNIDAD.map((e) => (
          <div key={e} className={`leyenda-estados__item unidad-${e.toLowerCase()}`}>
            <dt>{ETIQUETA_ESTADO_UNIDAD[e]}</dt>
            <dd>{conteo[e]}</dd>
          </div>
        ))}
      </dl>

      {cargandoInicial ? (
        <p className="vacio">Cargando unidades</p>
      ) : unidades.length === 0 ? (
        <p className="vacio">No hay unidades registradas. Ejecute npm run seed en el backend para cargar las de prueba.</p>
      ) : (
        <ul className="lista-unidades">
          {unidades.map((u) => (
            <li key={u.id} className={`unidad unidad--${u.estado.toLowerCase()}`}>
              <span className="unidad__icono" aria-hidden="true">
                <Icono nombre={ICONO_UNIDAD[u.tipo]} tamano={22} />
              </span>
              <div className="unidad__datos">
                <p className="unidad__fila">
                  <strong className="unidad__codigo">{u.codigo}</strong>
                  <InsigniaUnidad estado={u.estado} />
                </p>
                <p className="unidad__nombre">
                  {u.nombre}
                  <span className="unidad__tipo">{ETIQUETA_TIPO_UNIDAD[u.tipo]}</span>
                </p>
                {u.despachoActivo ? (
                  <p className="unidad__asignacion">
                    <span className={`punto-prioridad prioridad-${(u.despachoActivo.prioridadEmergencia ?? 'baja').toLowerCase()}`} aria-hidden="true" />
                    {u.despachoActivo.llegadaEn ? 'Atendiendo' : 'Rumbo a'} {u.despachoActivo.codigoEmergencia}
                    <span className="unidad__tiempo">
                      {u.despachoActivo.llegadaEn ? 'llegó' : 'asignada'}{' '}
                      {tiempoTranscurrido(u.despachoActivo.llegadaEn ?? u.despachoActivo.asignadoEn, ahora)}
                    </span>
                  </p>
                ) : (
                  <p className="unidad__base">
                    <Icono nombre="pin" tamano={14} /> {u.baseNombre}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

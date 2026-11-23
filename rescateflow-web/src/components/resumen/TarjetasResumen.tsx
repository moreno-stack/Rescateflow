import { usePanelContext } from '../../context/PanelContext';
import { ESTADOS_ACTIVOS } from '../../utils/etiquetas';

/** Tarjetas de resumen rapido calculadas sobre TODAS las emergencias y unidades. */
export function TarjetasResumen() {
  const { todas, unidades, cargandoInicial } = usePanelContext();

  const activas = todas.filter((e) => ESTADOS_ACTIVOS.includes(e.estado));
  const criticasActivas = activas.filter((e) => e.prioridad === 'CRITICA');
  const criticasSinDespacho = criticasActivas.filter((e) => e.estado === 'REPORTADA' || e.estado === 'VALIDADA');
  const fueraDeTiempo = activas.filter((e) => e.fueraDeSla);
  const disponibles = unidades.filter((u) => u.estado === 'DISPONIBLE');
  const valor = (n: number) => (cargandoInicial ? '–' : n);

  return (
    <section className="resumen" aria-label="Resumen operativo">
      <article className="resumen__tarjeta">
        <p className="resumen__etiqueta">Total de emergencias</p>
        <p className="resumen__valor">{valor(todas.length)}</p>
        <p className="resumen__nota">{cargandoInicial ? 'Cargando' : `${activas.length} activas en este momento`}</p>
      </article>

      <article className={`resumen__tarjeta resumen__tarjeta--critica ${criticasActivas.length > 0 ? 'con-alerta' : ''}`}>
        <p className="resumen__etiqueta">Críticas activas</p>
        <p className="resumen__valor">{valor(criticasActivas.length)}</p>
        <p className="resumen__nota">
          {cargandoInicial
            ? 'Cargando'
            : criticasSinDespacho.length > 0
              ? `${criticasSinDespacho.length} esperando unidad`
              : 'Todas con unidad asignada'}
        </p>
      </article>

      <article className="resumen__tarjeta resumen__tarjeta--unidades">
        <p className="resumen__etiqueta">Unidades disponibles</p>
        <p className="resumen__valor">
          {valor(disponibles.length)}
          {!cargandoInicial && <span className="resumen__total"> de {unidades.length}</span>}
        </p>
        <p className="resumen__nota">
          {cargandoInicial ? 'Cargando' : `${unidades.length - disponibles.length} en ruta, ocupadas o fuera de servicio`}
        </p>
      </article>

      <article className={`resumen__tarjeta ${fueraDeTiempo.length > 0 ? 'resumen__tarjeta--demora' : ''}`}>
        <p className="resumen__etiqueta">Fuera del tiempo objetivo</p>
        <p className="resumen__valor">{valor(fueraDeTiempo.length)}</p>
        <p className="resumen__nota">{cargandoInicial ? 'Cargando' : 'Despacho o llegada demorados'}</p>
      </article>
    </section>
  );
}

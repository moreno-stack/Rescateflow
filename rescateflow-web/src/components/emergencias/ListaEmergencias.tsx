import { useMemo, useState } from 'react';
import { usePanelContext } from '../../context/PanelContext';
import { useAhora } from '../../hooks/useAhora';
import type { Emergencia, FiltrosEmergencias as Filtros, UnidadConEstado } from '../../types/dominio';
import { Spinner } from '../comunes/Spinner';
import type { ModoDialogo } from './AccionesEmergencia';
import { DetalleEmergencia } from './DetalleEmergencia';
import { DialogoAccion } from './DialogoAccion';
import { FiltrosEmergencias } from './FiltrosEmergencias';
import { TarjetaEmergencia } from './TarjetaEmergencia';

function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

interface Props {
  filtros: Filtros;
  alCambiarFiltros: (f: Filtros) => void;
}

/** Cola de emergencias: filtros, tarjetas con acciones, dialogos y detalle. */
export function ListaEmergencias({ filtros, alCambiarFiltros }: Props) {
  const { filtradas, todas, unidades, cargandoInicial, actualizando, error, recargar } = usePanelContext();
  const [busqueda, setBusqueda] = useState('');
  const [dialogo, setDialogo] = useState<{ modo: ModoDialogo; emergencia: Emergencia } | null>(null);
  const [detalleId, setDetalleId] = useState<string | null>(null);
  const ahora = useAhora();

  const visibles = useMemo(() => {
    const texto = normalizar(busqueda.trim());
    if (!texto) return filtradas;
    return filtradas.filter((e) =>
      normalizar(`${e.codigo} ${e.descripcion} ${e.direccionReportada} ${e.direccionNormalizada ?? ''}`).includes(texto),
    );
  }, [filtradas, busqueda]);

  const unidadesPorEmergencia = useMemo(() => {
    const mapa = new Map<string, UnidadConEstado[]>();
    for (const u of unidades) {
      const id = u.despachoActivo?.emergenciaId;
      if (id) mapa.set(id, [...(mapa.get(id) ?? []), u]);
    }
    return mapa;
  }, [unidades]);

  return (
    <section className="panel panel--cola" aria-labelledby="titulo-cola">
      <header className="panel__encabezado">
        <h2 id="titulo-cola" className="panel__titulo">
          Cola de emergencias
          <span className="panel__contador">{cargandoInicial ? '' : visibles.length}</span>
        </h2>
        {actualizando && !cargandoInicial && <Spinner etiqueta="Actualizando lista" />}
      </header>

      <FiltrosEmergencias filtros={filtros} alCambiar={alCambiarFiltros} busqueda={busqueda} alBuscar={setBusqueda} />

      {error && (
        <div className="alerta-error" role="alert">
          <p className="alerta-error__titulo">No se pudo cargar la información</p>
          <p>{error.message}</p>
          <button type="button" className="boton boton--secundario" onClick={() => void recargar()}>
            Reintentar
          </button>
        </div>
      )}

      {cargandoInicial ? (
        <div className="cargando-lista">
          <Spinner tamano={22} etiqueta="Cargando emergencias" />
          <p>Cargando emergencias</p>
        </div>
      ) : visibles.length === 0 && !error ? (
        <p className="vacio">
          {todas.length === 0
            ? 'No hay emergencias registradas. Use el formulario para registrar la primera.'
            : 'Ninguna emergencia coincide con los filtros. Quite los filtros para ver toda la cola.'}
        </p>
      ) : (
        <div className="lista-emergencias">
          {visibles.map((e) => (
            <TarjetaEmergencia
              key={e.id}
              emergencia={e}
              unidadesAsignadas={unidadesPorEmergencia.get(e.id) ?? []}
              ahora={ahora}
              alAbrirDialogo={(modo) => setDialogo({ modo, emergencia: e })}
              alVerDetalle={() => setDetalleId(e.id)}
            />
          ))}
        </div>
      )}

      {dialogo && (
        <DialogoAccion modo={dialogo.modo} emergencia={dialogo.emergencia} todas={todas} alCerrar={() => setDialogo(null)} />
      )}
      {detalleId && <DetalleEmergencia id={detalleId} alCerrar={() => setDetalleId(null)} />}
    </section>
  );
}

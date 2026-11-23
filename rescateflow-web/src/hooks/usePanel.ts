import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, apiService } from '../services/apiService';
import type { Emergencia, FiltrosEmergencias, UnidadConEstado } from '../types/dominio';

const INTERVALO_SEGUNDOS = Number(import.meta.env.VITE_INTERVALO_ACTUALIZACION) || 15;

export interface EstadoPanel {
  /** Todas las emergencias (para las tarjetas de resumen). */
  todas: Emergencia[];
  /** Emergencias segun los filtros de estado y prioridad (consultadas al backend). */
  filtradas: Emergencia[];
  unidades: UnidadConEstado[];
  cargandoInicial: boolean;
  actualizando: boolean;
  error: ApiError | null;
  ultimaActualizacion: Date | null;
  recargar: () => Promise<void>;
}

function hayFiltros(f: FiltrosEmergencias): boolean {
  return Boolean(f.estado || f.prioridad || f.tipo);
}

/**
 * Carga emergencias y unidades desde la API, vuelve a consultar cuando cambian los
 * filtros y se actualiza sola cada N segundos (pausado si la pestana esta oculta).
 */
export function usePanel(filtros: FiltrosEmergencias): EstadoPanel {
  const [todas, setTodas] = useState<Emergencia[]>([]);
  const [filtradas, setFiltradas] = useState<Emergencia[]>([]);
  const [unidades, setUnidades] = useState<UnidadConEstado[]>([]);
  const [cargandoInicial, setCargandoInicial] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [ultimaActualizacion, setUltimaActualizacion] = useState<Date | null>(null);

  const filtrosRef = useRef(filtros);
  filtrosRef.current = filtros;
  const peticionActual = useRef<AbortController | null>(null);

  const recargar = useCallback(async () => {
    peticionActual.current?.abort();
    const controlador = new AbortController();
    peticionActual.current = controlador;
    const f = filtrosRef.current;
    setActualizando(true);
    try {
      const [listaTodas, listaUnidades, listaFiltrada] = await Promise.all([
        apiService.listarEmergencias({}, controlador.signal),
        apiService.listarUnidades(controlador.signal),
        hayFiltros(f) ? apiService.listarEmergencias(f, controlador.signal) : Promise.resolve(null),
      ]);
      if (controlador.signal.aborted) return;
      setTodas(listaTodas.datos);
      setFiltradas(listaFiltrada ? listaFiltrada.datos : listaTodas.datos);
      setUnidades(listaUnidades.datos);
      setError(null);
      setUltimaActualizacion(new Date());
    } catch (e) {
      if (controlador.signal.aborted) return;
      setError(e instanceof ApiError ? e : new ApiError(0, 'ERROR_DESCONOCIDO', 'No se pudieron cargar los datos del panel'));
    } finally {
      if (peticionActual.current === controlador) {
        setActualizando(false);
        setCargandoInicial(false);
      }
    }
  }, []);

  // Recarga inmediata cuando cambian los filtros ("tiempo real").
  useEffect(() => {
    void recargar();
  }, [filtros.estado, filtros.prioridad, filtros.tipo, recargar]);

  // Actualizacion automatica periodica.
  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') void recargar();
    }, INTERVALO_SEGUNDOS * 1000);
    const alVolver = () => {
      if (document.visibilityState === 'visible') void recargar();
    };
    document.addEventListener('visibilitychange', alVolver);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', alVolver);
    };
  }, [recargar]);

  useEffect(() => () => peticionActual.current?.abort(), []);

  return { todas, filtradas, unidades, cargandoInicial, actualizando, error, ultimaActualizacion, recargar };
}

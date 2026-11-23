import { createContext, useContext, type ReactNode } from 'react';
import { usePanel, type EstadoPanel } from '../hooks/usePanel';
import type { FiltrosEmergencias } from '../types/dominio';

/** Expone los datos del panel (emergencias, unidades) y la funcion recargar a todos los componentes. */
const PanelContext = createContext<EstadoPanel | null>(null);

export function PanelProvider({ filtros, children }: { filtros: FiltrosEmergencias; children: ReactNode }) {
  const panel = usePanel(filtros);
  return <PanelContext.Provider value={panel}>{children}</PanelContext.Provider>;
}

export function usePanelContext(): EstadoPanel {
  const valor = useContext(PanelContext);
  if (!valor) throw new Error('usePanelContext debe usarse dentro de PanelProvider');
  return valor;
}

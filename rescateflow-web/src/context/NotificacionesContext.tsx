import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';

export type TipoNotificacion = 'exito' | 'error' | 'aviso';

export interface Notificacion {
  id: number;
  tipo: TipoNotificacion;
  titulo: string;
  mensaje?: string;
  detalles?: string[];
}

interface ValorNotificaciones {
  notificaciones: Notificacion[];
  notificar: (n: Omit<Notificacion, 'id'>) => void;
  descartar: (id: number) => void;
}

const DURACION_MS: Record<TipoNotificacion, number> = { exito: 4500, aviso: 8000, error: 9000 };

const NotificacionesContext = createContext<ValorNotificaciones | null>(null);

export function NotificacionesProvider({ children }: { children: ReactNode }) {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const siguienteId = useRef(1);

  const descartar = useCallback((id: number) => {
    setNotificaciones((actuales) => actuales.filter((n) => n.id !== id));
  }, []);

  const notificar = useCallback(
    (n: Omit<Notificacion, 'id'>) => {
      const id = siguienteId.current++;
      setNotificaciones((actuales) => [...actuales.slice(-3), { ...n, id }]);
      window.setTimeout(() => descartar(id), DURACION_MS[n.tipo]);
    },
    [descartar],
  );

  const valor = useMemo(() => ({ notificaciones, notificar, descartar }), [notificaciones, notificar, descartar]);
  return <NotificacionesContext.Provider value={valor}>{children}</NotificacionesContext.Provider>;
}

export function useNotificaciones(): ValorNotificaciones {
  const valor = useContext(NotificacionesContext);
  if (!valor) throw new Error('useNotificaciones debe usarse dentro de NotificacionesProvider');
  return valor;
}

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { establecerUsuarioActual } from '../services/apiService';

/**
 * Usuario que actua en el panel. El backend no tiene login en esta fase:
 * el id se envia en el encabezado X-Usuario-Id y queda en la auditoria.
 * Los ids corresponden a los usuarios precargados por "npm run seed".
 */
export interface PerfilOperativo {
  id: string | null;
  nombre: string;
  rol: string;
}

export const PERFILES: PerfilOperativo[] = [
  { id: '00000000-0000-4000-8000-000000000003', nombre: 'Carlos Despachador', rol: 'Despachador' },
  { id: '00000000-0000-4000-8000-000000000002', nombre: 'Laura Operadora', rol: 'Operadora de llamadas' },
  { id: '00000000-0000-4000-8000-000000000001', nombre: 'Administrador', rol: 'Administrador' },
  { id: null, nombre: 'Sin identificar', rol: 'Sin auditoría de usuario' },
];

const CLAVE_ALMACENAMIENTO = 'rescateflow.perfil';

interface ValorSesion {
  perfil: PerfilOperativo;
  cambiarPerfil: (id: string | null) => void;
}

const SesionContext = createContext<ValorSesion | null>(null);

function leerPerfilGuardado(): PerfilOperativo {
  try {
    const guardado = window.localStorage.getItem(CLAVE_ALMACENAMIENTO);
    const encontrado = PERFILES.find((p) => (p.id ?? 'ninguno') === guardado);
    if (encontrado) return encontrado;
  } catch {
    // localStorage no disponible: se usa el perfil por defecto
  }
  return PERFILES[0];
}

export function SesionProvider({ children }: { children: ReactNode }) {
  const [perfil, setPerfil] = useState<PerfilOperativo>(leerPerfilGuardado);

  // Se sincroniza antes de cualquier peticion del primer render.
  establecerUsuarioActual(perfil.id);

  useEffect(() => {
    try {
      window.localStorage.setItem(CLAVE_ALMACENAMIENTO, perfil.id ?? 'ninguno');
    } catch {
      // sin persistencia: no es critico
    }
  }, [perfil]);

  const cambiarPerfil = useCallback((id: string | null) => {
    const nuevo = PERFILES.find((p) => p.id === id) ?? PERFILES[0];
    establecerUsuarioActual(nuevo.id);
    setPerfil(nuevo);
  }, []);

  const valor = useMemo(() => ({ perfil, cambiarPerfil }), [perfil, cambiarPerfil]);
  return <SesionContext.Provider value={valor}>{children}</SesionContext.Provider>;
}

export function useSesion(): ValorSesion {
  const valor = useContext(SesionContext);
  if (!valor) throw new Error('useSesion debe usarse dentro de SesionProvider');
  return valor;
}

import { useEffect, useState } from 'react';

/** Devuelve Date.now() actualizado cada `intervaloMs` (para tiempos relativos y SLA). */
export function useAhora(intervaloMs = 30_000): number {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setAhora(Date.now()), intervaloMs);
    return () => window.clearInterval(id);
  }, [intervaloMs]);
  return ahora;
}

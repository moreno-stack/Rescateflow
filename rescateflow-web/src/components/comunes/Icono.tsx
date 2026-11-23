import type { TipoEmergencia, TipoUnidad } from '../../types/dominio';

/** Iconos lineales propios (SVG en linea, sin dependencias). */
const TRAZOS = {
  fuego: 'M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2.2 1.2-3.7 2.4-4.8.2 1.8 1 2.8 2.1 3.3C11 9 11.5 6 12 3z',
  quimico: 'M9 3h6M10 3v6l-5.2 9a2 2 0 0 0 1.7 3h11a2 2 0 0 0 1.7-3L14 9V3M7.5 15h9',
  medico: 'M10 4h4v6h6v4h-6v6h-4v-6H4v-4h6z',
  onda: 'M3 12h3l2-5 3 10 3-12 2 7h5',
  auto: 'M5 16V12l2-5h10l2 5v4M5 16h14M5 16v2M19 16v2M7.5 13.5h.01M16.5 13.5h.01M6 12h12',
  escudo: 'M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6z',
  alerta: 'M12 4l9 16H3zM12 10v4M12 17h.01',
  ambulancia: 'M3 7h10v9H3zM13 10h4l3 3v3h-7M7 9.5v4M5 11.5h4M7 18a1.5 1.5 0 1 0 0-.01M17 18a1.5 1.5 0 1 0 0-.01',
  bomberos: 'M3 9h12v7H3zM15 11h3l3 3v2h-6M4 6h8M5 6l-1 3M7 18a1.5 1.5 0 1 0 0-.01M17 18a1.5 1.5 0 1 0 0-.01',
  policia: 'M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6zM12 8l1.2 2.4 2.6.4-1.9 1.8.5 2.6L12 14l-2.4 1.2.5-2.6-1.9-1.8 2.6-.4z',
  rescate: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM5.6 5.6l3.6 3.6M14.8 14.8l3.6 3.6M18.4 5.6l-3.6 3.6M9.2 14.8l-3.6 3.6',
  pin: 'M12 21s-6-5.2-6-10a6 6 0 1 1 12 0c0 4.8-6 10-6 10zM12 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  personas: 'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 5.5a3 3 0 0 1 0 5.5M18 14.5c1.8.8 3 2.6 3 4.5',
  reloj: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  telefono: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z',
  recargar: 'M20 11a8 8 0 0 0-14.6-4.5L4 8M4 4v4h4M4 13a8 8 0 0 0 14.6 4.5L20 16M20 20v-4h-4',
  mas: 'M12 5v14M5 12h14',
  cerrar: 'M6 6l12 12M18 6L6 18',
  historial: 'M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 2',
  basura: 'M4 7h16M10 11v6M14 11v6M5 7l1 13h12l1-13M9 7V4h6v3',
  despacho: 'M4 12h11M11 7l5 5-5 5M20 5v14',
  check: 'M5 12l5 5 9-10',
} as const;

export type NombreIcono = keyof typeof TRAZOS;

export function Icono({ nombre, tamano = 18, titulo }: { nombre: NombreIcono; tamano?: number; titulo?: string }) {
  return (
    <svg
      className="icono"
      width={tamano}
      height={tamano}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={titulo ? undefined : true}
      role={titulo ? 'img' : undefined}
    >
      {titulo && <title>{titulo}</title>}
      <path d={TRAZOS[nombre]} />
    </svg>
  );
}

export const ICONO_TIPO: Record<TipoEmergencia, NombreIcono> = {
  INCENDIO: 'fuego',
  MATERIALES_PELIGROSOS: 'quimico',
  EMERGENCIA_MEDICA: 'medico',
  DESASTRE_NATURAL: 'onda',
  ACCIDENTE_TRANSITO: 'auto',
  SEGURIDAD: 'escudo',
  OTRO: 'alerta',
};

export const ICONO_UNIDAD: Record<TipoUnidad, NombreIcono> = {
  AMBULANCIA: 'ambulancia',
  BOMBEROS: 'bomberos',
  POLICIA: 'policia',
  RESCATE: 'rescate',
};

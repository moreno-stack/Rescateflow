import { TipoEmergencia, TipoUnidad } from '../enums';

interface ReglaCompatibilidad {
  principal: TipoUnidad;
  permitidos: readonly TipoUnidad[];
}

/** RN-41: compatibilidad TipoEmergencia -> TipoUnidad. */
export const COMPATIBILIDAD: Readonly<Record<TipoEmergencia, ReglaCompatibilidad>> = {
  INCENDIO: { principal: 'BOMBEROS', permitidos: ['AMBULANCIA', 'RESCATE', 'POLICIA'] },
  MATERIALES_PELIGROSOS: { principal: 'BOMBEROS', permitidos: ['RESCATE', 'POLICIA', 'AMBULANCIA'] },
  EMERGENCIA_MEDICA: { principal: 'AMBULANCIA', permitidos: ['RESCATE'] },
  ACCIDENTE_TRANSITO: { principal: 'AMBULANCIA', permitidos: ['POLICIA', 'RESCATE', 'BOMBEROS'] },
  SEGURIDAD: { principal: 'POLICIA', permitidos: ['AMBULANCIA'] },
  DESASTRE_NATURAL: { principal: 'RESCATE', permitidos: ['BOMBEROS', 'AMBULANCIA', 'POLICIA'] },
  OTRO: { principal: 'RESCATE', permitidos: ['POLICIA', 'BOMBEROS', 'AMBULANCIA'] },
};

export function esTipoPrincipal(tipoEmergencia: TipoEmergencia, tipoUnidad: TipoUnidad): boolean {
  return COMPATIBILIDAD[tipoEmergencia].principal === tipoUnidad;
}

export function esCompatible(tipoEmergencia: TipoEmergencia, tipoUnidad: TipoUnidad): boolean {
  const regla = COMPATIBILIDAD[tipoEmergencia];
  return regla.principal === tipoUnidad || regla.permitidos.includes(tipoUnidad);
}

export function tiposCompatibles(tipoEmergencia: TipoEmergencia): TipoUnidad[] {
  const regla = COMPATIBILIDAD[tipoEmergencia];
  return [regla.principal, ...regla.permitidos];
}

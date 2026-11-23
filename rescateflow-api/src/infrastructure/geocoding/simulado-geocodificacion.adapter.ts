import { ResultadoGeocodificacion, ServicioGeocodificacion } from '../../domain/ports/servicio-geocodificacion';

interface PuntoConocido {
  claves: string[];
  latitud: number;
  longitud: number;
  direccionNormalizada: string;
}

/**
 * Diccionario fijo de lugares de Pasto. Permite que la API funcione sin internet
 * y que las pruebas (Postman/automaticas) sean deterministas.
 */
const PUNTOS_PASTO: PuntoConocido[] = [
  { claves: ['plaza de narino', 'plaza narino', 'calle 19 # 25'], latitud: 1.214472, longitud: -77.278611, direccionNormalizada: 'Plaza de Narino, Centro, Pasto, Narino' },
  { claves: ['unicentro', 'cra 22 # 2'], latitud: 1.200917, longitud: -77.278150, direccionNormalizada: 'Centro Comercial Unicentro, Pasto, Narino' },
  { claves: ['hospital departamental', 'calle 22 # 7'], latitud: 1.219780, longitud: -77.285830, direccionNormalizada: 'Hospital Universitario Departamental de Narino, Pasto' },
  { claves: ['terminal de transportes', 'terminal pasto', 'calle 18 # 1'], latitud: 1.205370, longitud: -77.263950, direccionNormalizada: 'Terminal de Transportes, Pasto, Narino' },
  { claves: ['universidad cooperativa', 'ucc pasto', 'calle 18 # 47'], latitud: 1.215830, longitud: -77.293130, direccionNormalizada: 'Universidad Cooperativa de Colombia, Torobajo, Pasto' },
  { claves: ['universidad de narino', 'udenar', 'torobajo'], latitud: 1.233250, longitud: -77.292580, direccionNormalizada: 'Universidad de Narino, Torobajo, Pasto' },
  { claves: ['parque bolivar', 'avenida boyaca'], latitud: 1.206190, longitud: -77.270820, direccionNormalizada: 'Parque Bolivar, Pasto, Narino' },
  { claves: ['estadio libertad', 'barrio la carolina'], latitud: 1.200470, longitud: -77.255810, direccionNormalizada: 'Estadio Departamental Libertad, Pasto' },
  { claves: ['avenida panamericana', 'panamericana'], latitud: 1.220950, longitud: -77.281940, direccionNormalizada: 'Avenida Panamericana, Pasto, Narino' },
  { claves: ['barrio obrero', 'calle 12 # 3'], latitud: 1.208910, longitud: -77.267180, direccionNormalizada: 'Barrio Obrero, Pasto, Narino' },
  { claves: ['san andresito', 'calle 17 # 22'], latitud: 1.211710, longitud: -77.277260, direccionNormalizada: 'San Andresito, Centro, Pasto' },
  { claves: ['barrio corazon de jesus', 'corazon de jesus'], latitud: 1.222170, longitud: -77.275050, direccionNormalizada: 'Barrio Corazon de Jesus, Pasto' },
];

function normalizarTexto(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export class SimuladoGeocodificacionAdapter implements ServicioGeocodificacion {
  async geocodificar(direccion: string): Promise<ResultadoGeocodificacion | null> {
    const texto = normalizarTexto(direccion);
    const punto = PUNTOS_PASTO.find((p) => p.claves.some((clave) => texto.includes(clave)));
    if (!punto) return null;
    return {
      latitud: punto.latitud,
      longitud: punto.longitud,
      direccionNormalizada: punto.direccionNormalizada,
      confianza: 0.9,
      proveedor: 'SIMULADO',
    };
  }
}

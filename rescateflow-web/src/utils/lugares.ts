/**
 * Lugares de Pasto que reconoce el geocodificador SIMULADO del backend
 * (simulado-geocodificacion.adapter.ts). Se ofrecen como sugerencias en el
 * campo de direccion para que la emergencia quede con coordenadas.
 */
export const LUGARES_CONOCIDOS = [
  'Plaza de Nariño',
  'Centro Comercial Unicentro',
  'Hospital Departamental',
  'Terminal de Transportes',
  'Universidad Cooperativa, calle 18 # 47',
  'Universidad de Nariño, Torobajo',
  'Parque Bolívar',
  'Estadio Libertad, barrio La Carolina',
  'Avenida Panamericana',
  'Barrio Obrero, calle 12 # 3',
  'San Andresito, calle 17 # 22',
  'Barrio Corazón de Jesús',
];

/** Area de cobertura por defecto del backend (perimetro urbano de Pasto). */
export const COBERTURA = { latMin: 1.15, latMax: 1.26, lonMin: -77.33, lonMax: -77.23 };

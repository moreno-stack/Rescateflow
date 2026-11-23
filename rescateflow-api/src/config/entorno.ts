import fs from 'node:fs';
import path from 'node:path';
import { AreaCobertura } from '../domain/entities/ubicacion';

/**
 * Configuracion de la aplicacion. Lee el archivo .env (si existe) con el
 * cargador nativo de Node y aplica valores por defecto para correr sin configurar nada.
 */
const rutaEnv = path.resolve(process.cwd(), '.env');
if (fs.existsSync(rutaEnv) && typeof process.loadEnvFile === 'function') {
  process.loadEnvFile(rutaEnv);
}

export type ProveedorGeocodificacion = 'SIMULADO' | 'NOMINATIM';

export interface Configuracion {
  puerto: number;
  rutaBaseDatos: string;
  proveedorGeocodificacion: ProveedorGeocodificacion;
  areaCobertura: AreaCobertura;
  velocidadPromedioKmH: number;
  corsOrigen: string;
}

function leerNumero(nombre: string, porDefecto: number): number {
  const valor = process.env[nombre];
  if (valor === undefined || valor.trim() === '') return porDefecto;
  const numero = Number(valor);
  if (!Number.isFinite(numero) || numero <= 0) {
    throw new Error(`La variable de entorno ${nombre} debe ser un numero positivo (valor actual: '${valor}')`);
  }
  return numero;
}

function leerArea(valor: string | undefined): AreaCobertura {
  const texto = valor?.trim() || '1.1500,-77.3300,1.2600,-77.2300';
  const partes = texto.split(',').map((p) => Number(p.trim()));
  if (partes.length !== 4 || partes.some((p) => !Number.isFinite(p))) {
    throw new Error(`AREA_COBERTURA debe tener el formato latMin,lonMin,latMax,lonMax (valor actual: '${texto}')`);
  }
  const [latitudMinima, longitudMinima, latitudMaxima, longitudMaxima] = partes as [number, number, number, number];
  if (latitudMinima >= latitudMaxima || longitudMinima >= longitudMaxima) {
    throw new Error('AREA_COBERTURA: los minimos deben ser menores que los maximos');
  }
  return { latitudMinima, longitudMinima, latitudMaxima, longitudMaxima };
}

function leerProveedor(valor: string | undefined): ProveedorGeocodificacion {
  const texto = (valor ?? 'SIMULADO').trim().toUpperCase();
  if (texto !== 'SIMULADO' && texto !== 'NOMINATIM') {
    throw new Error(`GEOCODIFICACION_PROVEEDOR debe ser SIMULADO o NOMINATIM (valor actual: '${valor}')`);
  }
  return texto;
}

export function cargarConfiguracion(): Configuracion {
  return {
    puerto: leerNumero('PUERTO', 3000),
    rutaBaseDatos: process.env.RUTA_BASE_DATOS?.trim() || './data/rescateflow.db',
    proveedorGeocodificacion: leerProveedor(process.env.GEOCODIFICACION_PROVEEDOR),
    areaCobertura: leerArea(process.env.AREA_COBERTURA),
    velocidadPromedioKmH: leerNumero('VELOCIDAD_PROMEDIO_KMH', 30),
    corsOrigen: process.env.CORS_ORIGEN?.trim() || 'http://localhost:5173',
  };
}

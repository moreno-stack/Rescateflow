import { MongoMemoryReplSet } from 'mongodb-memory-server-core';
import { ConexionMongo, conectarBaseDatos } from '../src/infrastructure/database/conexion';

/**
 * Base de datos para las pruebas automaticas.
 * - Si existe MONGODB_URI_PRUEBAS, usa ese servidor (base "rescateflow_pruebas").
 * - Si no, levanta un MongoDB en memoria como replica set (con transacciones). La primera vez
 *   descarga el binario de mongod (~100 MB) y lo deja en cache para las siguientes ejecuciones.
 */
let servidorMemoria: MongoMemoryReplSet | null = null;

export async function abrirBaseDatosPruebas(): Promise<ConexionMongo> {
  let uri = process.env.MONGODB_URI_PRUEBAS?.trim();
  if (!uri) {
    servidorMemoria = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
    uri = servidorMemoria.getUri();
  }
  return conectarBaseDatos(uri, 'rescateflow_pruebas');
}

export async function cerrarBaseDatosPruebas(conexion: ConexionMongo | undefined): Promise<void> {
  await conexion?.db.dropDatabase().catch(() => undefined);
  await conexion?.cerrar();
  await servidorMemoria?.stop();
  servidorMemoria = null;
}

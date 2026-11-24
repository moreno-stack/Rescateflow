import { Db, MongoClient } from 'mongodb';
import { aplicarEsquema } from './esquema';

/** Conexion abierta a MongoDB y capacidades detectadas del servidor. */
export interface ConexionMongo {
  cliente: MongoClient;
  db: Db;
  /** true si el servidor es un replica set o un cluster (las transacciones solo funcionan ahi). */
  soportaTransacciones: boolean;
  cerrar(): Promise<void>;
}

/**
 * Conecta con MongoDB, detecta si admite transacciones y aplica el esquema (validadores + indices).
 * Falla en 5 s con un mensaje claro si el servidor no esta encendido.
 */
export async function conectarBaseDatos(uri: string, nombreBaseDatos: string): Promise<ConexionMongo> {
  const cliente = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
  try {
    await cliente.connect();
  } catch (error) {
    await cliente.close().catch(() => undefined);
    const detalle = error instanceof Error ? error.message : String(error);
    throw new Error(
      `No se pudo conectar a MongoDB en ${uri}. Verifique que el servicio MongoDB este encendido ` +
        `(Windows: servicio "MongoDB Server") o ajuste MONGODB_URI en el archivo .env. Detalle: ${detalle}`,
    );
  }
  const db = cliente.db(nombreBaseDatos);
  const hola = await db.admin().command({ hello: 1 });
  const soportaTransacciones = Boolean(hola.setName) || hola.msg === 'isdbgrid';
  await aplicarEsquema(db);
  return { cliente, db, soportaTransacciones, cerrar: () => cliente.close() };
}

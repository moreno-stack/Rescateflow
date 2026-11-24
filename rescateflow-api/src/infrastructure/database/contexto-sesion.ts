import { AsyncLocalStorage } from 'node:async_hooks';
import { ClientSession } from 'mongodb';

/**
 * Sesion de MongoDB de la transaccion en curso.
 * La UnidadDeTrabajo la guarda aqui y cada repositorio la toma para que todas sus
 * lecturas y escrituras participen en la MISMA transaccion, sin cambiar las interfaces del dominio.
 */
const almacen = new AsyncLocalStorage<ClientSession>();

export function ejecutarConSesion<T>(sesion: ClientSession, trabajo: () => Promise<T>): Promise<T> {
  return almacen.run(sesion, trabajo);
}

export function sesionActual(): ClientSession | undefined {
  return almacen.getStore();
}

/** Opciones que todo repositorio pasa al driver: { session } si hay transaccion activa. */
export function opcionesSesion(): { session?: ClientSession } {
  const sesion = almacen.getStore();
  return sesion ? { session: sesion } : {};
}

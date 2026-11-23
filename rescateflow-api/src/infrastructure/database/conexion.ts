import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { ESQUEMA_SQL, TABLAS_EN_ORDEN_DE_BORRADO } from './esquema';

export type BaseDatos = Database.Database;

/**
 * Abre (o crea) la base de datos SQLite y aplica el esquema.
 * Usar ':memory:' para pruebas automaticas.
 */
export function abrirBaseDatos(ruta: string): BaseDatos {
  if (ruta !== ':memory:') {
    fs.mkdirSync(path.dirname(path.resolve(ruta)), { recursive: true });
  }
  const db = new Database(ruta);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  db.exec(ESQUEMA_SQL);
  return db;
}

/** Vacia todas las tablas (lo usa el seed para dejar datos limpios). */
export function vaciarBaseDatos(db: BaseDatos): void {
  const vaciar = db.transaction(() => {
    for (const tabla of TABLAS_EN_ORDEN_DE_BORRADO) {
      db.prepare(`DELETE FROM ${tabla}`).run();
    }
  });
  vaciar();
}

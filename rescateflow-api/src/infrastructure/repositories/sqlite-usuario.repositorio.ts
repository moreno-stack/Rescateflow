import { Usuario } from '../../domain/entities/usuario';
import { RolUsuario } from '../../domain/enums';
import { UsuarioRepositorio } from '../../domain/ports/repositorios';
import { BaseDatos } from '../database/conexion';

interface FilaUsuario {
  id: string;
  nombre_completo: string;
  correo: string;
  rol: RolUsuario;
  activo: number;
  creado_en: string;
  actualizado_en: string;
}

function aEntidad(f: FilaUsuario): Usuario {
  return {
    id: f.id,
    nombreCompleto: f.nombre_completo,
    correo: f.correo,
    rol: f.rol,
    activo: f.activo === 1,
    creadoEn: f.creado_en,
    actualizadoEn: f.actualizado_en,
  };
}

/** Implementacion SQLite del puerto UsuarioRepositorio. */
export class SqliteUsuarioRepositorio implements UsuarioRepositorio {
  constructor(private readonly db: BaseDatos) {}

  buscarPorId(id: string): Usuario | null {
    const fila = this.db.prepare('SELECT * FROM usuarios WHERE id = ?').get(id) as FilaUsuario | undefined;
    return fila ? aEntidad(fila) : null;
  }

  insertar(usuario: Usuario): void {
    this.db
      .prepare(
        `INSERT INTO usuarios (id, nombre_completo, correo, rol, activo, creado_en, actualizado_en)
         VALUES (@id, @nombreCompleto, @correo, @rol, @activo, @creadoEn, @actualizadoEn)`,
      )
      .run({ ...usuario, correo: usuario.correo.toLowerCase(), activo: usuario.activo ? 1 : 0 });
  }

  listar(): Usuario[] {
    const filas = this.db.prepare('SELECT * FROM usuarios ORDER BY rol, nombre_completo').all() as FilaUsuario[];
    return filas.map(aEntidad);
  }
}

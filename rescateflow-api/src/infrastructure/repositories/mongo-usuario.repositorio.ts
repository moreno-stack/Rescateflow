import { Collection, Db } from 'mongodb';
import { Usuario } from '../../domain/entities/usuario';
import { RolUsuario } from '../../domain/enums';
import { UsuarioRepositorio } from '../../domain/ports/repositorios';
import { opcionesSesion } from '../database/contexto-sesion';
import { COLECCIONES } from '../database/esquema';

interface DocumentoUsuario {
  _id: string;
  nombreCompleto: string;
  correo: string;
  rol: RolUsuario;
  activo: boolean;
  creadoEn: string;
  actualizadoEn: string;
}

function aEntidad(d: DocumentoUsuario): Usuario {
  const { _id, ...resto } = d;
  return { id: _id, ...resto };
}

/** Implementacion MongoDB del puerto UsuarioRepositorio (coleccion "usuarios"). */
export class MongoUsuarioRepositorio implements UsuarioRepositorio {
  private readonly coleccion: Collection<DocumentoUsuario>;

  constructor(db: Db) {
    this.coleccion = db.collection<DocumentoUsuario>(COLECCIONES.usuarios);
  }

  async buscarPorId(id: string): Promise<Usuario | null> {
    const doc = await this.coleccion.findOne({ _id: id }, opcionesSesion());
    return doc ? aEntidad(doc) : null;
  }

  async insertar(usuario: Usuario): Promise<void> {
    const { id, ...resto } = usuario;
    await this.coleccion.insertOne({ _id: id, ...resto, correo: usuario.correo.toLowerCase() }, opcionesSesion());
  }

  async listar(): Promise<Usuario[]> {
    const docs = await this.coleccion.find({}, opcionesSesion()).sort({ rol: 1, nombreCompleto: 1 }).toArray();
    return docs.map(aEntidad);
  }
}

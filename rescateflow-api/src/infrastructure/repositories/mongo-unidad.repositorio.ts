import { Collection, Db } from 'mongodb';
import { HistorialEstadoUnidad } from '../../domain/entities/historial';
import { PropiedadesUnidad, Unidad } from '../../domain/entities/unidad';
import { EstadoUnidad } from '../../domain/enums';
import { ErrorConflicto } from '../../domain/errors/errores-dominio';
import { FiltroUnidades, UnidadRepositorio } from '../../domain/ports/repositorios';
import { opcionesSesion } from '../database/contexto-sesion';
import { COLECCIONES } from '../database/esquema';
import { aPunto, desdePunto, PuntoGeoJson } from './mapeo-geo';

/** Documento de la coleccion "unidades" (ubicaciones como GeoJSON). */
type DocumentoUnidad = Omit<PropiedadesUnidad, 'id' | 'ubicacionBase' | 'ubicacionActual'> & {
  _id: string;
  ubicacionBase: PuntoGeoJson;
  ubicacionActual: PuntoGeoJson;
};

interface DocumentoHistorialUnidad {
  _id: string;
  unidadId: string;
  estadoAnterior: EstadoUnidad | null;
  estadoNuevo: EstadoUnidad;
  despachoId: string | null;
  usuarioId: string | null;
  motivo: string | null;
  ocurridoEn: string;
  secuencia: number;
}

function aEntidad(d: DocumentoUnidad): Unidad {
  const { _id, ubicacionBase, ubicacionActual, ...resto } = d;
  return Unidad.reconstruir({
    ...resto,
    id: _id,
    ubicacionBase: desdePunto(ubicacionBase),
    ubicacionActual: desdePunto(ubicacionActual),
  });
}

function aDocumento(u: Unidad): DocumentoUnidad {
  const { id, ubicacionBase, ubicacionActual, ...resto } = u.propiedades;
  return { ...resto, _id: id, ubicacionBase: aPunto(ubicacionBase), ubicacionActual: aPunto(ubicacionActual) };
}

/** Implementacion MongoDB del puerto UnidadRepositorio. */
export class MongoUnidadRepositorio implements UnidadRepositorio {
  private readonly unidades: Collection<DocumentoUnidad>;
  private readonly historial: Collection<DocumentoHistorialUnidad>;

  constructor(db: Db) {
    this.unidades = db.collection<DocumentoUnidad>(COLECCIONES.unidades);
    this.historial = db.collection<DocumentoHistorialUnidad>(COLECCIONES.historialUnidades);
  }

  async buscarPorId(id: string): Promise<Unidad | null> {
    const doc = await this.unidades.findOne({ _id: id }, opcionesSesion());
    return doc ? aEntidad(doc as DocumentoUnidad) : null;
  }

  async buscarPorCodigo(codigo: string): Promise<Unidad | null> {
    const doc = await this.unidades.findOne({ codigo }, opcionesSesion());
    return doc ? aEntidad(doc as DocumentoUnidad) : null;
  }

  async listar(filtro: FiltroUnidades): Promise<Unidad[]> {
    const consulta: Partial<Pick<DocumentoUnidad, 'estado' | 'tipo'>> = {};
    if (filtro.estado) consulta.estado = filtro.estado;
    if (filtro.tipo) consulta.tipo = filtro.tipo;
    const docs = await this.unidades.find(consulta, opcionesSesion()).sort({ codigo: 1 }).toArray();
    return docs.map((d) => aEntidad(d as DocumentoUnidad));
  }

  async insertar(unidad: Unidad): Promise<void> {
    await this.unidades.insertOne(aDocumento(unidad), opcionesSesion());
  }

  /** Bloqueo optimista: solo actualiza si la version guardada es la que se leyo. */
  async actualizar(unidad: Unidad): Promise<void> {
    const { _id, version, ...cambios } = aDocumento(unidad);
    const resultado = await this.unidades.updateOne({ _id, version }, { $set: cambios, $inc: { version: 1 } }, opcionesSesion());
    if (resultado.matchedCount === 0) {
      throw new ErrorConflicto(
        'CONFLICTO_VERSION',
        'La unidad fue modificada por otra operacion; vuelva a consultarla e intente de nuevo',
        { unidadId: unidad.id, versionEsperada: unidad.version },
      );
    }
    unidad.marcarPersistida();
  }

  async registrarHistorial(entrada: HistorialEstadoUnidad): Promise<void> {
    const opciones = opcionesSesion();
    const ultimo = await this.historial.findOne(
      { unidadId: entrada.unidadId },
      { ...opciones, sort: { secuencia: -1 }, projection: { secuencia: 1 } },
    );
    const { id, ...resto } = entrada;
    await this.historial.insertOne({ _id: id, ...resto, secuencia: (ultimo?.secuencia ?? 0) + 1 }, opciones);
  }

  async listarHistorial(unidadId: string): Promise<HistorialEstadoUnidad[]> {
    const docs = await this.historial.find({ unidadId }, opcionesSesion()).sort({ secuencia: 1 }).toArray();
    return docs.map(({ _id, secuencia: _secuencia, ...resto }) => ({ id: _id, ...resto }));
  }
}

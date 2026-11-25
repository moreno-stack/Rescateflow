import { Collection, Db } from 'mongodb';
import { Despacho, PropiedadesDespacho } from '../../domain/entities/despacho';
import { EstadoDespacho } from '../../domain/enums';
import { ErrorConflicto } from '../../domain/errors/errores-dominio';
import { DespachoRepositorio } from '../../domain/ports/repositorios';
import { opcionesSesion } from '../database/contexto-sesion';
import { COLECCIONES } from '../database/esquema';
import { esClaveDuplicada } from './mapeo-geo';

type DocumentoDespacho = Omit<PropiedadesDespacho, 'id'> & { _id: string };

function aEntidad(d: DocumentoDespacho): Despacho {
  const { _id, ...resto } = d;
  return Despacho.reconstruir({ id: _id, ...resto });
}

/** Implementacion MongoDB del puerto DespachoRepositorio. */
export class MongoDespachoRepositorio implements DespachoRepositorio {
  private readonly despachos: Collection<DocumentoDespacho>;

  constructor(db: Db) {
    this.despachos = db.collection<DocumentoDespacho>(COLECCIONES.despachos);
  }

  async buscarPorId(id: string): Promise<Despacho | null> {
    const doc = await this.despachos.findOne({ _id: id }, opcionesSesion());
    return doc ? aEntidad(doc as DocumentoDespacho) : null;
  }

  async listarPorEmergencia(emergenciaId: string): Promise<Despacho[]> {
    const docs = await this.despachos.find({ emergenciaId }, opcionesSesion()).sort({ asignadoEn: 1 }).toArray();
    return docs.map((d) => aEntidad(d as DocumentoDespacho));
  }

  async listarActivosPorEmergencia(emergenciaId: string): Promise<Despacho[]> {
    const docs = await this.despachos
      .find({ emergenciaId, estado: EstadoDespacho.ACTIVO }, opcionesSesion())
      .sort({ asignadoEn: 1 })
      .toArray();
    return docs.map((d) => aEntidad(d as DocumentoDespacho));
  }

  async buscarActivoPorUnidad(unidadId: string): Promise<Despacho | null> {
    const doc = await this.despachos.findOne({ unidadId, estado: EstadoDespacho.ACTIVO }, opcionesSesion());
    return doc ? aEntidad(doc as DocumentoDespacho) : null;
  }

  async insertar(despacho: Despacho): Promise<void> {
    const { id, ...resto } = despacho.propiedades;
    try {
      await this.despachos.insertOne({ _id: id, ...resto }, opcionesSesion());
    } catch (error) {
      // El indice unico parcial protege RN-53 incluso ante operaciones concurrentes.
      if (esClaveDuplicada(error, 'ux_despacho_activo_por_unidad')) {
        throw new ErrorConflicto('UNIDAD_NO_DISPONIBLE', 'La unidad ya tiene un despacho ACTIVO (RN-53)', {
          unidadId: despacho.unidadId,
        });
      }
      throw error;
    }
  }

  async actualizar(despacho: Despacho): Promise<void> {
    const p = despacho.propiedades;
    await this.despachos.updateOne(
      { _id: p.id },
      { $set: { estado: p.estado, llegadaEn: p.llegadaEn, liberadoEn: p.liberadoEn, observaciones: p.observaciones } },
      opcionesSesion(),
    );
  }
}

import { Collection, Db } from 'mongodb';
import { Emergencia, PropiedadesEmergencia } from '../../domain/entities/emergencia';
import { HistorialEstadoEmergencia } from '../../domain/entities/historial';
import { EstadoEmergencia, ORDEN_PRIORIDAD, TipoEmergencia } from '../../domain/enums';
import { ErrorConflicto } from '../../domain/errors/errores-dominio';
import { EmergenciaRepositorio, FiltroEmergencias } from '../../domain/ports/repositorios';
import { opcionesSesion } from '../database/contexto-sesion';
import { COLECCIONES } from '../database/esquema';
import { aPunto, desdePunto, PuntoGeoJson } from './mapeo-geo';

/** Documento de la coleccion "emergencias": las propiedades de la entidad con _id y ubicacion GeoJSON. */
type DocumentoEmergencia = Omit<PropiedadesEmergencia, 'id' | 'ubicacion'> & {
  _id: string;
  ubicacion: PuntoGeoJson | null;
};

interface DocumentoHistorial {
  _id: string;
  emergenciaId: string;
  estadoAnterior: EstadoEmergencia | null;
  estadoNuevo: EstadoEmergencia;
  usuarioId: string | null;
  motivo: string | null;
  ocurridoEn: string;
  secuencia: number;
}

const ESTADOS_FINALES: EstadoEmergencia[] = [EstadoEmergencia.CERRADA, EstadoEmergencia.CANCELADA];

function aEntidad(d: DocumentoEmergencia): Emergencia {
  const { _id, ubicacion, ...resto } = d;
  return Emergencia.reconstruir({ id: _id, ...resto, ubicacion: ubicacion ? desdePunto(ubicacion) : null });
}

function aDocumento(e: Emergencia): DocumentoEmergencia {
  const { id, ubicacion, ...resto } = e.propiedades;
  return { ...resto, _id: id, ubicacion: ubicacion ? aPunto(ubicacion) : null };
}

/** RN-14: CRITICA primero, luego mayor puntaje, luego la mas antigua. */
function ordenarCola(lista: Emergencia[]): Emergencia[] {
  return lista.sort(
    (a, b) =>
      ORDEN_PRIORIDAD[a.prioridad] - ORDEN_PRIORIDAD[b.prioridad] ||
      b.puntajePrioridad - a.puntajePrioridad ||
      a.reportadaEn.localeCompare(b.reportadaEn),
  );
}

/** Implementacion MongoDB del puerto EmergenciaRepositorio. */
export class MongoEmergenciaRepositorio implements EmergenciaRepositorio {
  private readonly emergencias: Collection<DocumentoEmergencia>;
  private readonly historial: Collection<DocumentoHistorial>;
  private readonly despachos: Collection<{ _id: string; emergenciaId: string }>;

  constructor(db: Db) {
    this.emergencias = db.collection<DocumentoEmergencia>(COLECCIONES.emergencias);
    this.historial = db.collection<DocumentoHistorial>(COLECCIONES.historialEmergencias);
    this.despachos = db.collection(COLECCIONES.despachos);
  }

  async buscarPorId(id: string): Promise<Emergencia | null> {
    const doc = await this.emergencias.findOne({ _id: id }, opcionesSesion());
    return doc ? aEntidad(doc as DocumentoEmergencia) : null;
  }

  async listar(filtro: FiltroEmergencias): Promise<Emergencia[]> {
    const consulta: Partial<Pick<DocumentoEmergencia, 'estado' | 'prioridad' | 'tipo'>> = {};
    if (filtro.estado) consulta.estado = filtro.estado;
    if (filtro.prioridad) consulta.prioridad = filtro.prioridad;
    if (filtro.tipo) consulta.tipo = filtro.tipo;
    const docs = await this.emergencias.find(consulta, opcionesSesion()).toArray();
    return ordenarCola(docs.map((d) => aEntidad(d as DocumentoEmergencia)));
  }

  async listarActivasPorTipoDesde(tipo: TipoEmergencia, desde: string): Promise<Emergencia[]> {
    const docs = await this.emergencias
      .find({ tipo, reportadaEn: { $gte: desde }, estado: { $nin: ESTADOS_FINALES } }, opcionesSesion())
      .toArray();
    return ordenarCola(docs.map((d) => aEntidad(d as DocumentoEmergencia)));
  }

  async insertar(emergencia: Emergencia): Promise<void> {
    await this.emergencias.insertOne(aDocumento(emergencia), opcionesSesion());
  }

  /** Bloqueo optimista (RN-33): solo actualiza si la version guardada es la que se leyo. */
  async actualizar(emergencia: Emergencia): Promise<void> {
    const { _id, version, ...cambios } = aDocumento(emergencia);
    const resultado = await this.emergencias.updateOne(
      { _id, version },
      { $set: cambios, $inc: { version: 1 } },
      opcionesSesion(),
    );
    if (resultado.matchedCount === 0) {
      throw new ErrorConflicto(
        'CONFLICTO_VERSION',
        'La emergencia fue modificada por otra operacion; vuelva a consultarla e intente de nuevo (RN-33)',
        { emergenciaId: emergencia.id, versionEsperada: emergencia.version },
      );
    }
    emergencia.marcarPersistida();
  }

  /** Elimina la emergencia junto con su historial y despachos (equivale al ON DELETE CASCADE). */
  async eliminar(id: string): Promise<void> {
    const opciones = opcionesSesion();
    await this.historial.deleteMany({ emergenciaId: id }, opciones);
    await this.despachos.deleteMany({ emergenciaId: id }, opciones);
    await this.emergencias.deleteOne({ _id: id }, opciones);
  }

  /** Mayor consecutivo del anio + 1. Los codigos tienen relleno de ceros, asi que el orden de texto sirve. */
  async siguienteConsecutivo(anio: number): Promise<number> {
    const prefijo = `EMG-${anio}-`;
    const ultima = await this.emergencias.findOne(
      { codigo: { $regex: `^${prefijo}` } },
      { ...opcionesSesion(), sort: { codigo: -1 }, projection: { codigo: 1 } },
    );
    return ultima ? Number(ultima.codigo.slice(prefijo.length)) + 1 : 1;
  }

  async registrarHistorial(entrada: HistorialEstadoEmergencia): Promise<void> {
    const opciones = opcionesSesion();
    const ultimo = await this.historial.findOne(
      { emergenciaId: entrada.emergenciaId },
      { ...opciones, sort: { secuencia: -1 }, projection: { secuencia: 1 } },
    );
    const { id, ...resto } = entrada;
    await this.historial.insertOne({ _id: id, ...resto, secuencia: (ultimo?.secuencia ?? 0) + 1 }, opciones);
  }

  async listarHistorial(emergenciaId: string): Promise<HistorialEstadoEmergencia[]> {
    const docs = await this.historial.find({ emergenciaId }, opcionesSesion()).sort({ secuencia: 1 }).toArray();
    return docs.map(({ _id, secuencia: _secuencia, ...resto }) => ({ id: _id, ...resto }));
  }
}

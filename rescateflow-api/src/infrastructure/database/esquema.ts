import { Db, Document, IndexDescription } from 'mongodb';
import {
  EstadoDespacho,
  EstadoEmergencia,
  EstadoUnidad,
  FuenteUbicacion,
  MotivoCancelacion,
  NivelPrioridad,
  RolUsuario,
  TipoEmergencia,
  TipoUnidad,
} from '../../domain/enums';

/**
 * Esquema de la base de datos MongoDB de RescateFlow (diccionario de datos, Fase 1 seccion 7.4).
 * Cada coleccion lleva un validador $jsonSchema (equivalente a los CHECK de SQL) y sus indices.
 * Las coordenadas se guardan como GeoJSON Point [longitud, latitud] con indice 2dsphere.
 */
export const COLECCIONES = {
  usuarios: 'usuarios',
  unidades: 'unidades',
  emergencias: 'emergencias',
  despachos: 'despachos',
  historialEmergencias: 'historial_estados_emergencia',
  historialUnidades: 'historial_estados_unidad',
} as const;

const texto = { bsonType: 'string' };
const textoONulo = { bsonType: ['string', 'null'] };
const enumeracion = (valores: Record<string, string>) => ({ enum: Object.values(valores) });
const enumeracionONula = (valores: Record<string, string>) => ({ enum: [...Object.values(valores), null] });
const punto = {
  bsonType: 'object',
  required: ['type', 'coordinates'],
  properties: {
    type: { enum: ['Point'] },
    coordinates: { bsonType: 'array', minItems: 2, maxItems: 2, items: { bsonType: ['double', 'int'] } },
  },
};

interface DefinicionColeccion {
  nombre: string;
  validador: Document;
  indices: IndexDescription[];
}

const DEFINICIONES: DefinicionColeccion[] = [
  {
    nombre: COLECCIONES.usuarios,
    validador: {
      bsonType: 'object',
      required: ['_id', 'nombreCompleto', 'correo', 'rol', 'activo', 'creadoEn', 'actualizadoEn'],
      properties: { _id: texto, nombreCompleto: texto, correo: texto, rol: enumeracion(RolUsuario), activo: { bsonType: 'bool' } },
    },
    indices: [{ key: { correo: 1 }, name: 'ux_usuarios_correo', unique: true }],
  },
  {
    nombre: COLECCIONES.unidades,
    validador: {
      bsonType: 'object',
      required: ['_id', 'codigo', 'nombre', 'tipo', 'estado', 'activa', 'baseNombre', 'ubicacionBase', 'ubicacionActual', 'version'],
      properties: {
        _id: texto,
        codigo: texto,
        tipo: enumeracion(TipoUnidad),
        estado: enumeracion(EstadoUnidad),
        activa: { bsonType: 'bool' },
        ubicacionBase: punto,
        ubicacionActual: punto,
        usuarioResponsableId: textoONulo,
        version: { bsonType: ['int', 'long'], minimum: 1 },
      },
    },
    indices: [
      { key: { codigo: 1 }, name: 'ux_unidades_codigo', unique: true },
      { key: { estado: 1, tipo: 1 }, name: 'ix_unidades_estado_tipo' },
      { key: { ubicacionActual: '2dsphere' }, name: 'ix_unidades_ubicacion' },
      {
        key: { usuarioResponsableId: 1 },
        name: 'ux_unidades_responsable',
        unique: true,
        partialFilterExpression: { usuarioResponsableId: { $type: 'string' } },
      },
    ],
  },
  {
    nombre: COLECCIONES.emergencias,
    validador: {
      bsonType: 'object',
      required: [
        '_id', 'codigo', 'tipo', 'descripcion', 'direccionReportada', 'telefonoReportante', 'numeroAfectados',
        'puntajePrioridad', 'prioridad', 'estado', 'reportadaEn', 'version',
      ],
      properties: {
        _id: texto,
        codigo: texto,
        tipo: enumeracion(TipoEmergencia),
        ubicacion: { oneOf: [punto, { bsonType: 'null' }] },
        fuenteUbicacion: enumeracionONula(FuenteUbicacion),
        numeroAfectados: { bsonType: ['int', 'long'], minimum: 0, maximum: 500 },
        hayRiesgoVital: { bsonType: 'bool' },
        hayHeridos: { bsonType: 'bool' },
        hayRiesgoPropagacion: { bsonType: 'bool' },
        puntajePrioridad: { bsonType: ['int', 'long'], minimum: 0, maximum: 100 },
        prioridad: enumeracion(NivelPrioridad),
        estado: enumeracion(EstadoEmergencia),
        motivoCancelacion: enumeracionONula(MotivoCancelacion),
        version: { bsonType: ['int', 'long'], minimum: 1 },
      },
    },
    indices: [
      { key: { codigo: 1 }, name: 'ux_emergencias_codigo', unique: true },
      { key: { estado: 1 }, name: 'ix_emergencias_estado' },
      { key: { prioridad: 1 }, name: 'ix_emergencias_prioridad' },
      { key: { tipo: 1, reportadaEn: 1 }, name: 'ix_emergencias_tipo_fecha' },
      { key: { ubicacion: '2dsphere' }, name: 'ix_emergencias_ubicacion', sparse: true },
    ],
  },
  {
    nombre: COLECCIONES.despachos,
    validador: {
      bsonType: 'object',
      required: ['_id', 'emergenciaId', 'unidadId', 'estado', 'distanciaKm', 'tiempoEstimadoMin', 'asignadoEn'],
      properties: { _id: texto, emergenciaId: texto, unidadId: texto, estado: enumeracion(EstadoDespacho) },
    },
    indices: [
      // RN-53: una unidad solo puede tener un despacho ACTIVO a la vez (indice unico parcial)
      {
        key: { unidadId: 1 },
        name: 'ux_despacho_activo_por_unidad',
        unique: true,
        partialFilterExpression: { estado: EstadoDespacho.ACTIVO },
      },
      { key: { emergenciaId: 1, asignadoEn: 1 }, name: 'ix_despachos_emergencia' },
    ],
  },
  {
    nombre: COLECCIONES.historialEmergencias,
    validador: {
      bsonType: 'object',
      required: ['_id', 'emergenciaId', 'estadoNuevo', 'ocurridoEn', 'secuencia'],
      properties: { estadoNuevo: enumeracion(EstadoEmergencia), estadoAnterior: enumeracionONula(EstadoEmergencia) },
    },
    indices: [{ key: { emergenciaId: 1, secuencia: 1 }, name: 'ux_historial_emergencia', unique: true }],
  },
  {
    nombre: COLECCIONES.historialUnidades,
    validador: {
      bsonType: 'object',
      required: ['_id', 'unidadId', 'estadoNuevo', 'ocurridoEn', 'secuencia'],
      properties: { estadoNuevo: enumeracion(EstadoUnidad), estadoAnterior: enumeracionONula(EstadoUnidad) },
    },
    indices: [{ key: { unidadId: 1, secuencia: 1 }, name: 'ux_historial_unidad', unique: true }],
  },
];

/** Crea las colecciones (si no existen), aplica sus validadores y crea los indices. Es idempotente. */
export async function aplicarEsquema(db: Db): Promise<void> {
  const existentes = new Set((await db.listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name));
  for (const def of DEFINICIONES) {
    const validacion = { validator: { $jsonSchema: def.validador }, validationLevel: 'strict', validationAction: 'error' } as const;
    if (existentes.has(def.nombre)) {
      await db.command({ collMod: def.nombre, ...validacion });
    } else {
      await db.createCollection(def.nombre, validacion);
    }
    await db.collection(def.nombre).createIndexes(def.indices);
  }
}

/** Borra todos los documentos (lo usa el seed para dejar datos limpios). */
export async function vaciarColecciones(db: Db): Promise<void> {
  for (const nombre of Object.values(COLECCIONES)) {
    await db.collection(nombre).deleteMany({});
  }
}

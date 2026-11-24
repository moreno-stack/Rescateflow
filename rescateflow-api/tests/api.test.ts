import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';
import request from 'supertest';
import type { Express } from 'express';
import { crearApp } from '../src/app';
import { cargarConfiguracion } from '../src/config/entorno';
import { crearContenedor } from '../src/contenedor';
import { ConexionMongo } from '../src/infrastructure/database/conexion';
import { SimuladoGeocodificacionAdapter } from '../src/infrastructure/geocoding/simulado-geocodificacion.adapter';
import { sembrar } from '../src/infrastructure/seed/seed';
import { abrirBaseDatosPruebas, cerrarBaseDatosPruebas } from './mongo-pruebas';

// Identificadores fijos generados por el seed
const INCENDIO_REPORTADA = '20000000-0000-4000-8000-000000000005';
const MEDICA_VALIDADA = '20000000-0000-4000-8000-000000000007';
const ACCIDENTE_DESPACHADA = '20000000-0000-4000-8000-000000000010';
const RINA_CERRADA = '20000000-0000-4000-8000-000000000016';
const FALSA_CANCELADA = '20000000-0000-4000-8000-000000000026';
const AMB_01 = '10000000-0000-4000-8000-000000000001';
const BOM_01 = '10000000-0000-4000-8000-000000000002';
const RES_01 = '10000000-0000-4000-8000-000000000004';
const DESPACHADOR = '00000000-0000-4000-8000-000000000003';

let app: Express;
let conexion: ConexionMongo;

before(async () => {
  conexion = await abrirBaseDatosPruebas();
  const contenedor = crearContenedor(conexion, cargarConfiguracion(), { geocodificacion: new SimuladoGeocodificacionAdapter() });
  app = crearApp(contenedor, { corsOrigen: 'http://localhost:5173', registrarPeticiones: false });
});

// Cada prueba parte de los mismos datos semilla.
beforeEach(async () => {
  await sembrar(conexion);
});

after(async () => {
  await cerrarBaseDatosPruebas(conexion);
});

function assertFormatoError(cuerpo: Record<string, unknown>, statusCode: number): void {
  assert.equal(cuerpo.statusCode, statusCode);
  assert.equal(typeof cuerpo.error, 'string');
  assert.equal(typeof cuerpo.message, 'string');
  assert.ok(!Number.isNaN(Date.parse(String(cuerpo.timestamp))));
}

describe('GET /api/emergencias', () => {
  it('lista las 5 emergencias del seed ordenadas por prioridad (RN-14)', async () => {
    const res = await request(app).get('/api/emergencias').expect(200);
    assert.equal(res.body.total, 5);
    assert.deepEqual(res.body.datos.map((e: { prioridad: string }) => e.prioridad), ['CRITICA', 'CRITICA', 'ALTA', 'MEDIA', 'BAJA']);
  });

  it('filtra por estado y prioridad', async () => {
    const res = await request(app).get('/api/emergencias?estado=VALIDADA&prioridad=CRITICA').expect(200);
    assert.equal(res.body.total, 1);
    assert.equal(res.body.datos[0].id, MEDICA_VALIDADA);
  });

  it('responde 400 con un filtro invalido', async () => {
    const res = await request(app).get('/api/emergencias?prioridad=URGENTE').expect(400);
    assertFormatoError(res.body, 400);
  });
});

describe('GET /api/emergencias/:id', () => {
  it('incluye el historial de cambios de estado y los despachos', async () => {
    const res = await request(app).get(`/api/emergencias/${RINA_CERRADA}`).expect(200);
    assert.deepEqual(
      res.body.historial.map((h: { estadoNuevo: string }) => h.estadoNuevo),
      ['REPORTADA', 'VALIDADA', 'DESPACHADA', 'EN_ATENCION', 'CERRADA'],
    );
    assert.equal(res.body.despachos[0].estado, 'FINALIZADO');
  });

  it('responde 404 si no existe', async () => {
    const res = await request(app).get('/api/emergencias/no-existe').expect(404);
    assertFormatoError(res.body, 404);
  });
});

describe('POST /api/emergencias', () => {
  const valida = {
    tipo: 'EMERGENCIA_MEDICA',
    descripcion: 'Persona con dificultad respiratoria severa',
    direccionReportada: 'Centro Comercial Unicentro, entrada principal',
    telefonoReportante: '3001234567',
    numeroAfectados: 1,
    hayRiesgoVital: true,
    hayHeridos: false,
    hayRiesgoPropagacion: false,
  };

  it('crea la emergencia REPORTADA, geocodificada y con prioridad calculada', async () => {
    const res = await request(app).post('/api/emergencias').send(valida).expect(201);
    assert.equal(res.body.estado, 'REPORTADA');
    assert.equal(res.body.prioridad, 'CRITICA');
    assert.equal(res.body.geocodificada, true);
    assert.match(res.body.codigo, /^EMG-\d{4}-000006$/);
  });

  it('responde 400 con detalle por campo si los datos son invalidos', async () => {
    const res = await request(app).post('/api/emergencias').send({ ...valida, numeroAfectados: -3, telefonoReportante: 'abc' }).expect(400);
    assertFormatoError(res.body, 400);
    const campos = res.body.detalles.map((d: { campo: string }) => d.campo);
    assert.ok(campos.includes('numeroAfectados') && campos.includes('telefonoReportante'));
  });

  it('responde 422 si las coordenadas estan fuera de cobertura (RN-21)', async () => {
    const res = await request(app).post('/api/emergencias').send({ ...valida, latitud: 4.6, longitud: -74.08 }).expect(422);
    assert.equal(res.body.codigo, 'FUERA_DE_COBERTURA');
  });
});

describe('PATCH /api/emergencias/:id/estado', () => {
  it('REPORTADA -> VALIDADA registra el historial', async () => {
    const res = await request(app)
      .patch(`/api/emergencias/${INCENDIO_REPORTADA}/estado`)
      .set('X-Usuario-Id', DESPACHADOR)
      .send({ estado: 'VALIDADA' })
      .expect(200);
    assert.equal(res.body.estado, 'VALIDADA');
    assert.equal(res.body.despachadorId, DESPACHADOR);
  });

  it('responde 409 Conflict ante una transicion invalida (REPORTADA -> CERRADA)', async () => {
    const res = await request(app)
      .patch(`/api/emergencias/${INCENDIO_REPORTADA}/estado`)
      .send({ estado: 'CERRADA', observacionesCierre: 'Intento de cierre directo' })
      .expect(409);
    assertFormatoError(res.body, 409);
    assert.equal(res.body.codigo, 'TRANSICION_INVALIDA');
  });

  it('responde 409 si se intenta cancelar una emergencia EN_ATENCION', async () => {
    await request(app).patch(`/api/emergencias/${ACCIDENTE_DESPACHADA}/estado`).send({ estado: 'EN_ATENCION' }).expect(200);
    await request(app)
      .patch(`/api/emergencias/${ACCIDENTE_DESPACHADA}/estado`)
      .send({ estado: 'CANCELADA', motivoCancelacion: 'FALSA_ALARMA' })
      .expect(409);
  });

  it('al cerrar libera las unidades (RN-36)', async () => {
    await request(app).patch(`/api/emergencias/${ACCIDENTE_DESPACHADA}/estado`).send({ estado: 'EN_ATENCION' }).expect(200);
    const ocupada = await request(app).get(`/api/unidades/${AMB_01}`).expect(200);
    assert.equal(ocupada.body.estado, 'OCUPADA');
    await request(app)
      .patch(`/api/emergencias/${ACCIDENTE_DESPACHADA}/estado`)
      .send({ estado: 'CERRADA', observacionesCierre: 'Pacientes trasladados al hospital' })
      .expect(200);
    const libre = await request(app).get(`/api/unidades/${AMB_01}`).expect(200);
    assert.equal(libre.body.estado, 'DISPONIBLE');
  });
});

describe('POST /api/emergencias/:id/asignar-unidad', () => {
  it('asigna una unidad DISPONIBLE: unidad EN_RUTA y emergencia DESPACHADA', async () => {
    const res = await request(app).post(`/api/emergencias/${MEDICA_VALIDADA}/asignar-unidad`).send({ unidadId: RES_01 }).expect(201);
    assert.equal(res.body.unidad.estado, 'EN_RUTA');
    assert.equal(res.body.emergencia.estado, 'DESPACHADA');
    assert.equal(res.body.despacho.estado, 'ACTIVO');
  });

  it('responde 409 si la unidad no esta DISPONIBLE', async () => {
    const res = await request(app).post(`/api/emergencias/${MEDICA_VALIDADA}/asignar-unidad`).send({ unidadId: AMB_01 }).expect(409);
    assert.equal(res.body.codigo, 'UNIDAD_NO_DISPONIBLE');
  });

  it('responde 409 si la emergencia aun no esta VALIDADA', async () => {
    const res = await request(app).post(`/api/emergencias/${INCENDIO_REPORTADA}/asignar-unidad`).send({ unidadId: BOM_01 }).expect(409);
    assert.equal(res.body.codigo, 'TRANSICION_INVALIDA');
  });

  it('responde 422 si el tipo de unidad es incompatible (RN-41)', async () => {
    const res = await request(app).post(`/api/emergencias/${MEDICA_VALIDADA}/asignar-unidad`).send({ unidadId: BOM_01 }).expect(422);
    assert.equal(res.body.codigo, 'TIPO_UNIDAD_INCOMPATIBLE');
  });
});

describe('DELETE /api/emergencias/:id', () => {
  it('elimina una emergencia CANCELADA (204)', async () => {
    await request(app).delete(`/api/emergencias/${FALSA_CANCELADA}`).expect(204);
    await request(app).get(`/api/emergencias/${FALSA_CANCELADA}`).expect(404);
  });

  it('elimina una emergencia REPORTADA (204)', async () => {
    await request(app).delete(`/api/emergencias/${INCENDIO_REPORTADA}`).expect(204);
  });

  it('responde 409 si la emergencia no esta REPORTADA ni CANCELADA', async () => {
    const res = await request(app).delete(`/api/emergencias/${ACCIDENTE_DESPACHADA}`).expect(409);
    assertFormatoError(res.body, 409);
    assert.equal(res.body.codigo, 'ELIMINACION_NO_PERMITIDA');
  });
});

describe('GET /api/unidades', () => {
  it('lista las 4 unidades con su estado actual', async () => {
    const res = await request(app).get('/api/unidades').expect(200);
    assert.equal(res.body.total, 4);
    assert.deepEqual(res.body.resumenPorEstado, { EN_RUTA: 1, DISPONIBLE: 3 });
    const amb = res.body.datos.find((u: { codigo: string }) => u.codigo === 'AMB-01');
    assert.equal(amb.despachoActivo.emergenciaId, ACCIDENTE_DESPACHADA);
  });

  it('filtra por estado', async () => {
    const res = await request(app).get('/api/unidades?estado=DISPONIBLE').expect(200);
    assert.equal(res.body.total, 3);
  });
});

describe('Errores generales', () => {
  it('ruta inexistente -> 404 con formato uniforme', async () => {
    const res = await request(app).get('/api/no-existe').expect(404);
    assertFormatoError(res.body, 404);
  });

  it('JSON mal formado -> 400 JSON_INVALIDO', async () => {
    const res = await request(app).post('/api/emergencias').set('Content-Type', 'application/json').send('{"tipo":').expect(400);
    assert.equal(res.body.codigo, 'JSON_INVALIDO');
  });
});

describe('Persistencia MongoDB', () => {
  it('el validador $jsonSchema rechaza documentos con estados fuera del dominio', async () => {
    await assert.rejects(
      conexion.db.collection('emergencias').updateOne({ _id: INCENDIO_REPORTADA as never }, { $set: { estado: 'INVENTADO' } }),
      (error: { code?: number }) => error.code === 121,
    );
  });

  it('el indice unico parcial impide dos despachos ACTIVOS para la misma unidad (RN-53)', async () => {
    const coleccion = conexion.db.collection('despachos');
    const activo = await coleccion.findOne({ unidadId: AMB_01, estado: 'ACTIVO' });
    assert.ok(activo);
    await assert.rejects(
      coleccion.insertOne({ ...activo, _id: 'otro-despacho' as never, emergenciaId: MEDICA_VALIDADA }),
      (error: { code?: number }) => error.code === 11000,
    );
  });

  it('dos asignaciones simultaneas de la misma unidad: solo una gana (transaccion + RN-53)', async () => {
    const nueva = await request(app)
      .post('/api/emergencias')
      .send({
        tipo: 'EMERGENCIA_MEDICA',
        descripcion: 'Segunda emergencia medica para probar concurrencia',
        direccionReportada: 'Hospital Departamental de Narino',
        telefonoReportante: '3001112233',
        numeroAfectados: 1,
        hayRiesgoVital: false,
        hayHeridos: true,
        hayRiesgoPropagacion: false,
      })
      .expect(201);
    await request(app).patch(`/api/emergencias/${nueva.body.id}/estado`).send({ estado: 'VALIDADA' }).expect(200);

    const [a, b] = await Promise.all([
      request(app).post(`/api/emergencias/${MEDICA_VALIDADA}/asignar-unidad`).send({ unidadId: RES_01 }),
      request(app).post(`/api/emergencias/${nueva.body.id}/asignar-unidad`).send({ unidadId: RES_01 }),
    ]);
    assert.deepEqual([a.status, b.status].sort(), [201, 409]);
    const despachosActivos = await conexion.db.collection('despachos').countDocuments({ unidadId: RES_01, estado: 'ACTIVO' });
    assert.equal(despachosActivos, 1);
    const perdedora = a.status === 409 ? MEDICA_VALIDADA : nueva.body.id;
    const estadoPerdedora = await request(app).get(`/api/emergencias/${perdedora}`).expect(200);
    assert.equal(estadoPerdedora.body.estado, 'VALIDADA');
  });
});

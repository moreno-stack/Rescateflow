import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Emergencia } from '../src/domain/entities/emergencia';
import { Ubicacion } from '../src/domain/entities/ubicacion';
import { Unidad } from '../src/domain/entities/unidad';
import { ErrorDominio } from '../src/domain/errors/errores-dominio';
import { CalculadoraPrioridad } from '../src/domain/services/calculadora-prioridad';
import { esCompatible } from '../src/domain/services/compatibilidad';
import { MaquinaEstadosEmergencia } from '../src/domain/services/maquina-estados-emergencia';
import { MaquinaEstadosUnidad } from '../src/domain/services/maquina-estados-unidad';

const calculadora = new CalculadoraPrioridad();

function codigoDeError(fn: () => unknown): string {
  try {
    fn();
  } catch (error) {
    if (error instanceof ErrorDominio) return error.codigo;
    throw error;
  }
  throw new Error('Se esperaba un ErrorDominio');
}

describe('CalculadoraPrioridad (RN-10 a RN-13, ejemplos de la Fase 1)', () => {
  const casos = [
    { caso: 'Paro cardiaco', datos: { tipo: 'EMERGENCIA_MEDICA', numeroAfectados: 1, hayRiesgoVital: true, hayHeridos: false, hayRiesgoPropagacion: false }, puntaje: 80, prioridad: 'CRITICA' },
    { caso: 'Caida leve', datos: { tipo: 'EMERGENCIA_MEDICA', numeroAfectados: 1, hayRiesgoVital: false, hayHeridos: true, hayRiesgoPropagacion: false }, puntaje: 50, prioridad: 'MEDIA' },
    { caso: 'Choque sin heridos', datos: { tipo: 'ACCIDENTE_TRANSITO', numeroAfectados: 2, hayRiesgoVital: false, hayHeridos: false, hayRiesgoPropagacion: false }, puntaje: 40, prioridad: 'MEDIA' },
    { caso: 'Incendio que se extiende', datos: { tipo: 'INCENDIO', numeroAfectados: 8, hayRiesgoVital: false, hayHeridos: false, hayRiesgoPropagacion: true }, puntaje: 80, prioridad: 'CRITICA' },
    { caso: 'Rina sin heridos', datos: { tipo: 'SEGURIDAD', numeroAfectados: 3, hayRiesgoVital: false, hayHeridos: false, hayRiesgoPropagacion: false }, puntaje: 35, prioridad: 'MEDIA' },
    { caso: 'Ruido', datos: { tipo: 'SEGURIDAD', numeroAfectados: 0, hayRiesgoVital: false, hayHeridos: false, hayRiesgoPropagacion: false }, puntaje: 25, prioridad: 'BAJA' },
    { caso: 'Fuga quimica (forzado 2)', datos: { tipo: 'MATERIALES_PELIGROSOS', numeroAfectados: 0, hayRiesgoVital: false, hayHeridos: false, hayRiesgoPropagacion: true }, puntaje: 60, prioridad: 'CRITICA' },
    { caso: 'Bus volcado (tope 100)', datos: { tipo: 'ACCIDENTE_TRANSITO', numeroAfectados: 25, hayRiesgoVital: true, hayHeridos: true, hayRiesgoPropagacion: false }, puntaje: 100, prioridad: 'CRITICA' },
  ] as const;

  for (const c of casos) {
    it(`${c.caso}: ${c.puntaje} -> ${c.prioridad}`, () => {
      const resultado = calculadora.calcular(c.datos);
      assert.equal(resultado.puntajePrioridad, c.puntaje);
      assert.equal(resultado.prioridad, c.prioridad);
    });
  }

  it('RN-13.3: riesgo vital nunca queda por debajo de ALTA', () => {
    const r = calculadora.calcular({ tipo: 'OTRO', numeroAfectados: 0, hayRiesgoVital: true, hayHeridos: false, hayRiesgoPropagacion: false });
    assert.equal(r.prioridad, 'ALTA');
  });

  it('RN-16: no permite bajar de ALTA una emergencia con riesgo vital', () => {
    const datos = { tipo: 'EMERGENCIA_MEDICA', numeroAfectados: 1, hayRiesgoVital: true, hayHeridos: false, hayRiesgoPropagacion: false } as const;
    assert.equal(codigoDeError(() => calculadora.validarAjuste(datos, 'MEDIA')), 'PRIORIDAD_NO_PERMITIDA');
    assert.doesNotThrow(() => calculadora.validarAjuste(datos, 'ALTA'));
  });
});

describe('MaquinaEstadosEmergencia (RN-30 / RN-31)', () => {
  const maquina = new MaquinaEstadosEmergencia();
  const validas = [
    ['REPORTADA', 'VALIDADA'], ['REPORTADA', 'CANCELADA'], ['VALIDADA', 'DESPACHADA'], ['VALIDADA', 'CANCELADA'],
    ['DESPACHADA', 'EN_ATENCION'], ['DESPACHADA', 'CANCELADA'], ['EN_ATENCION', 'CERRADA'],
  ] as const;
  const invalidas = [
    ['REPORTADA', 'DESPACHADA'], ['REPORTADA', 'CERRADA'], ['VALIDADA', 'EN_ATENCION'], ['VALIDADA', 'REPORTADA'],
    ['DESPACHADA', 'CERRADA'], ['EN_ATENCION', 'CANCELADA'], ['CERRADA', 'VALIDADA'], ['CANCELADA', 'REPORTADA'],
    ['VALIDADA', 'VALIDADA'],
  ] as const;

  for (const [desde, hacia] of validas) {
    it(`permite ${desde} -> ${hacia}`, () => assert.doesNotThrow(() => maquina.validarTransicion(desde, hacia)));
  }
  for (const [desde, hacia] of invalidas) {
    it(`rechaza ${desde} -> ${hacia} con TRANSICION_INVALIDA`, () =>
      assert.equal(codigoDeError(() => maquina.validarTransicion(desde, hacia)), 'TRANSICION_INVALIDA'));
  }
});

describe('MaquinaEstadosUnidad (RN-50)', () => {
  const maquina = new MaquinaEstadosUnidad();
  it('permite DISPONIBLE -> EN_RUTA -> OCUPADA -> DISPONIBLE', () => {
    assert.ok(maquina.puedeTransicionar('DISPONIBLE', 'EN_RUTA'));
    assert.ok(maquina.puedeTransicionar('EN_RUTA', 'OCUPADA'));
    assert.ok(maquina.puedeTransicionar('OCUPADA', 'DISPONIBLE'));
  });
  it('rechaza FUERA_DE_SERVICIO -> EN_RUTA y DISPONIBLE -> OCUPADA', () => {
    assert.ok(!maquina.puedeTransicionar('FUERA_DE_SERVICIO', 'EN_RUTA'));
    assert.ok(!maquina.puedeTransicionar('DISPONIBLE', 'OCUPADA'));
  });
});

describe('Entidades', () => {
  const ahora = new Date('2026-11-23T15:00:00.000Z');
  const crearUnidad = (tipo: 'AMBULANCIA' | 'BOMBEROS') =>
    Unidad.crear({
      id: 'u1', codigo: 'X-01', nombre: 'Prueba', tipo, baseNombre: 'Base',
      ubicacionBase: new Ubicacion(1.21, -77.28), usuarioResponsableId: null, ahora,
    }).unidad;

  it('Unidad: no se puede asignar si no esta DISPONIBLE (UNIDAD_NO_DISPONIBLE)', () => {
    const unidad = crearUnidad('AMBULANCIA');
    unidad.asignar('EMERGENCIA_MEDICA', ahora, 'EMG-1');
    assert.equal(unidad.estado, 'EN_RUTA');
    assert.equal(codigoDeError(() => unidad.asignar('EMERGENCIA_MEDICA', ahora, 'EMG-2')), 'UNIDAD_NO_DISPONIBLE');
  });

  it('Unidad: rechaza tipo incompatible (RN-41)', () => {
    const unidad = crearUnidad('BOMBEROS');
    assert.equal(codigoDeError(() => unidad.asignar('EMERGENCIA_MEDICA', ahora, 'EMG-1')), 'TIPO_UNIDAD_INCOMPATIBLE');
    assert.ok(esCompatible('INCENDIO', 'BOMBEROS'));
  });

  it('Emergencia: sin coordenadas no se puede despachar (RN-24)', () => {
    const { emergencia } = Emergencia.registrar(
      { tipo: 'OTRO', descripcion: 'Descripcion de prueba', direccionReportada: 'Calle falsa 123', nombreReportante: null,
        telefonoReportante: '3001234567', numeroAfectados: 0, hayRiesgoVital: false, hayHeridos: false, hayRiesgoPropagacion: false },
      { id: 'e1', codigo: 'EMG-2026-000001', ahora, operadorId: null, ubicacion: null, direccionNormalizada: null, fuenteUbicacion: null },
    );
    emergencia.validar(null, ahora);
    assert.equal(codigoDeError(() => emergencia.registrarDespacho(ahora)), 'EMERGENCIA_SIN_UBICACION');
    assert.ok(!emergencia.puedeEliminarse());
  });

  it('Ubicacion: Haversine Plaza de Narino -> Hospital Departamental ~ 1 km', () => {
    const plaza = new Ubicacion(1.214472, -77.278611);
    const hospital = new Ubicacion(1.21978, -77.28583);
    const distancia = plaza.distanciaKmA(hospital);
    assert.ok(distancia >= 0.95 && distancia <= 1.05, `distancia obtenida: ${distancia}`);
  });
});

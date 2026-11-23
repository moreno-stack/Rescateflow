import { cargarConfiguracion } from '../../config/entorno';
import { crearContenedor } from '../../contenedor';
import { Ubicacion } from '../../domain/entities/ubicacion';
import { Unidad } from '../../domain/entities/unidad';
import { GeneradorId } from '../../domain/ports/proveedores';
import { abrirBaseDatos, BaseDatos, vaciarBaseDatos } from '../database/conexion';
import { SimuladoGeocodificacionAdapter } from '../geocoding/simulado-geocodificacion.adapter';
import { ID_AMB_01, ID_DESPACHADOR, ID_OPERADOR, ID_POL_01, UNIDADES_SEMILLA, USUARIOS_SEMILLA } from './datos-semilla';

/**
 * Genera UUID deterministas (mismo resultado en cada ejecucion del seed), de modo que
 * las 5 emergencias precargadas tengan siempre los mismos identificadores.
 */
class GeneradorIdDeterminista implements GeneradorId {
  private contador = 0;
  constructor(private readonly prefijo: string) {}
  nuevoId(): string {
    this.contador += 1;
    return `${this.prefijo}-0000-4000-8000-${String(this.contador).padStart(12, '0')}`;
  }
}

/**
 * Carga los datos iniciales: 7 usuarios, 4 unidades y 5 emergencias en distintos estados.
 * Las emergencias se crean con los MISMOS servicios de aplicacion que usa la API,
 * por lo que respetan la maquina de estados y dejan su historial completo.
 */
export async function sembrar(db: BaseDatos): Promise<void> {
  const config = cargarConfiguracion();
  vaciarBaseDatos(db);

  const contenedor = crearContenedor(db, config, {
    geocodificacion: new SimuladoGeocodificacionAdapter(),
    generadorId: new GeneradorIdDeterminista('20000000'),
  });
  const { dependencias: dep, emergenciasServicio: servicio } = contenedor;
  const ahora = dep.tiempo.ahora();
  const ahoraIso = ahora.toISOString();

  // ---- Usuarios
  for (const u of USUARIOS_SEMILLA) {
    dep.usuarios.insertar({ ...u, activo: true, creadoEn: ahoraIso, actualizadoEn: ahoraIso });
  }

  // ---- 4 unidades de respuesta
  dep.unidadDeTrabajo.ejecutarEnTransaccion(() => {
    for (const datos of UNIDADES_SEMILLA) {
      const { unidad, cambio } = Unidad.crear({
        id: datos.id,
        codigo: datos.codigo,
        nombre: datos.nombre,
        tipo: datos.tipo,
        baseNombre: datos.baseNombre,
        ubicacionBase: new Ubicacion(datos.latitud, datos.longitud),
        usuarioResponsableId: datos.usuarioResponsableId,
        ahora,
      });
      dep.unidades.insertar(unidad);
      dep.unidades.registrarHistorial({
        id: dep.generadorId.nuevoId(),
        unidadId: unidad.id,
        estadoAnterior: cambio.estadoAnterior,
        estadoNuevo: cambio.estadoNuevo,
        despachoId: null,
        usuarioId: null,
        motivo: cambio.motivo,
        ocurridoEn: cambio.ocurridoEn,
      });
    }
  });

  // ---- 5 emergencias
  // 1) INCENDIO con propagacion: CRITICA, queda REPORTADA (lista para validar o eliminar)
  await servicio.registrar(
    {
      tipo: 'INCENDIO',
      descripcion: 'Incendio en vivienda de dos pisos; el fuego se extiende a la casa vecina',
      direccionReportada: 'Barrio Obrero, calle 12 # 3-45',
      nombreReportante: 'Ana Rosero',
      telefonoReportante: '3001234567',
      numeroAfectados: 8,
      hayRiesgoVital: false,
      hayHeridos: false,
      hayRiesgoPropagacion: true,
    },
    ID_OPERADOR,
  );

  // 2) EMERGENCIA_MEDICA con riesgo vital: CRITICA, queda VALIDADA (lista para despachar)
  const medica = await servicio.registrar(
    {
      tipo: 'EMERGENCIA_MEDICA',
      descripcion: 'Adulto mayor inconsciente, posible paro cardiaco en la plaza',
      direccionReportada: 'Plaza de Narino, costado norte',
      nombreReportante: 'Jorge Benavides',
      telefonoReportante: '3109876543',
      numeroAfectados: 1,
      hayRiesgoVital: true,
      hayHeridos: false,
      hayRiesgoPropagacion: false,
    },
    ID_OPERADOR,
  );
  servicio.cambiarEstado(medica.emergencia.id, { estado: 'VALIDADA' }, ID_DESPACHADOR);

  // 3) ACCIDENTE_TRANSITO con heridos: ALTA, queda DESPACHADA con AMB-01 EN_RUTA
  const accidente = await servicio.registrar(
    {
      tipo: 'ACCIDENTE_TRANSITO',
      descripcion: 'Choque entre motocicleta y automovil, dos personas heridas en la via',
      direccionReportada: 'Avenida Panamericana con calle 20',
      nombreReportante: null,
      telefonoReportante: '3205551122',
      numeroAfectados: 3,
      hayRiesgoVital: false,
      hayHeridos: true,
      hayRiesgoPropagacion: false,
    },
    ID_OPERADOR,
  );
  servicio.cambiarEstado(accidente.emergencia.id, { estado: 'VALIDADA' }, ID_DESPACHADOR);
  servicio.asignarUnidad(accidente.emergencia.id, ID_AMB_01, ID_DESPACHADOR);

  // 4) SEGURIDAD: MEDIA, ciclo completo hasta CERRADA (POL-01 vuelve a DISPONIBLE)
  const rina = await servicio.registrar(
    {
      tipo: 'SEGURIDAD',
      descripcion: 'Rina entre tres personas a la salida de un establecimiento',
      direccionReportada: 'Parque Bolivar, frente a la tienda principal',
      nombreReportante: 'Comerciante del sector',
      telefonoReportante: '3157778899',
      numeroAfectados: 3,
      hayRiesgoVital: false,
      hayHeridos: false,
      hayRiesgoPropagacion: false,
    },
    ID_OPERADOR,
  );
  servicio.cambiarEstado(rina.emergencia.id, { estado: 'VALIDADA' }, ID_DESPACHADOR);
  servicio.asignarUnidad(rina.emergencia.id, ID_POL_01, ID_DESPACHADOR);
  servicio.cambiarEstado(rina.emergencia.id, { estado: 'EN_ATENCION' }, ID_DESPACHADOR);
  servicio.cambiarEstado(
    rina.emergencia.id,
    { estado: 'CERRADA', observacionesCierre: 'Situacion controlada por la patrulla; sin lesionados ni capturas' },
    ID_DESPACHADOR,
  );

  // 5) OTRO: BAJA, CANCELADA por falsa alarma (se puede eliminar)
  const falsa = await servicio.registrar(
    {
      tipo: 'OTRO',
      descripcion: 'Reporte de maleta abandonada en la sala de espera',
      direccionReportada: 'Terminal de Transportes de Pasto',
      nombreReportante: 'Vigilante de turno',
      telefonoReportante: '3014445566',
      numeroAfectados: 0,
      hayRiesgoVital: false,
      hayHeridos: false,
      hayRiesgoPropagacion: false,
    },
    ID_OPERADOR,
  );
  servicio.cambiarEstado(
    falsa.emergencia.id,
    { estado: 'CANCELADA', motivoCancelacion: 'FALSA_ALARMA', detalleCancelacion: 'El propietario regreso por la maleta' },
    ID_OPERADOR,
  );
}

/** Imprime un resumen de lo sembrado. */
function imprimirResumen(db: BaseDatos): void {
  const emergencias = db
    .prepare('SELECT id, codigo, tipo, prioridad, puntaje_prioridad AS puntaje, estado FROM emergencias ORDER BY codigo')
    .all();
  const unidades = db.prepare('SELECT id, codigo, tipo, estado FROM unidades ORDER BY codigo').all();
  console.log('\nEmergencias precargadas:');
  console.table(emergencias);
  console.log('Unidades precargadas:');
  console.table(unidades);
}

async function principal(): Promise<void> {
  const config = cargarConfiguracion();
  const db = abrirBaseDatos(config.rutaBaseDatos);
  try {
    await sembrar(db);
    imprimirResumen(db);
    console.log(`Seed completado en ${config.rutaBaseDatos}`);
  } finally {
    db.close();
  }
}

if (require.main === module) {
  principal().catch((error: unknown) => {
    console.error('Error ejecutando el seed:', error);
    process.exit(1);
  });
}

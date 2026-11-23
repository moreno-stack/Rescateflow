import { RolUsuario, TipoUnidad } from '../../domain/enums';

/**
 * Datos iniciales con identificadores FIJOS para que Postman y el frontend
 * puedan usarlos siempre igual despues de ejecutar "npm run seed".
 */

export const USUARIOS_SEMILLA: Array<{ id: string; nombreCompleto: string; correo: string; rol: RolUsuario }> = [
  { id: '00000000-0000-4000-8000-000000000001', nombreCompleto: 'Administrador RescateFlow', correo: 'admin@rescateflow.co', rol: 'ADMINISTRADOR' },
  { id: '00000000-0000-4000-8000-000000000002', nombreCompleto: 'Laura Operadora', correo: 'operador@rescateflow.co', rol: 'OPERADOR' },
  { id: '00000000-0000-4000-8000-000000000003', nombreCompleto: 'Carlos Despachador', correo: 'despachador@rescateflow.co', rol: 'DESPACHADOR' },
  { id: '00000000-0000-4000-8000-000000000011', nombreCompleto: 'Tripulacion AMB-01', correo: 'amb01@rescateflow.co', rol: 'UNIDAD' },
  { id: '00000000-0000-4000-8000-000000000012', nombreCompleto: 'Tripulacion BOM-01', correo: 'bom01@rescateflow.co', rol: 'UNIDAD' },
  { id: '00000000-0000-4000-8000-000000000013', nombreCompleto: 'Tripulacion POL-01', correo: 'pol01@rescateflow.co', rol: 'UNIDAD' },
  { id: '00000000-0000-4000-8000-000000000014', nombreCompleto: 'Tripulacion RES-01', correo: 'res01@rescateflow.co', rol: 'UNIDAD' },
];

export const ID_OPERADOR = '00000000-0000-4000-8000-000000000002';
export const ID_DESPACHADOR = '00000000-0000-4000-8000-000000000003';

export const UNIDADES_SEMILLA: Array<{
  id: string;
  codigo: string;
  nombre: string;
  tipo: TipoUnidad;
  baseNombre: string;
  latitud: number;
  longitud: number;
  usuarioResponsableId: string;
}> = [
  {
    id: '10000000-0000-4000-8000-000000000001',
    codigo: 'AMB-01',
    nombre: 'Ambulancia Basica Centro',
    tipo: 'AMBULANCIA',
    baseNombre: 'Hospital Universitario Departamental de Narino',
    latitud: 1.21978,
    longitud: -77.28583,
    usuarioResponsableId: '00000000-0000-4000-8000-000000000011',
  },
  {
    id: '10000000-0000-4000-8000-000000000002',
    codigo: 'BOM-01',
    nombre: 'Maquina de Bomberos Estacion Central',
    tipo: 'BOMBEROS',
    baseNombre: 'Estacion Central de Bomberos de Pasto',
    latitud: 1.2101,
    longitud: -77.274,
    usuarioResponsableId: '00000000-0000-4000-8000-000000000012',
  },
  {
    id: '10000000-0000-4000-8000-000000000003',
    codigo: 'POL-01',
    nombre: 'Patrulla Policia Cuadrante 5',
    tipo: 'POLICIA',
    baseNombre: 'Estacion de Policia Centro',
    latitud: 1.2135,
    longitud: -77.2815,
    usuarioResponsableId: '00000000-0000-4000-8000-000000000013',
  },
  {
    id: '10000000-0000-4000-8000-000000000004',
    codigo: 'RES-01',
    nombre: 'Unidad de Rescate Defensa Civil',
    tipo: 'RESCATE',
    baseNombre: 'Defensa Civil Seccional Pasto',
    latitud: 1.225,
    longitud: -77.27,
    usuarioResponsableId: '00000000-0000-4000-8000-000000000014',
  },
];

export const ID_AMB_01 = '10000000-0000-4000-8000-000000000001';
export const ID_POL_01 = '10000000-0000-4000-8000-000000000003';

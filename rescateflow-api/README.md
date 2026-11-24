# RescateFlow API (Backend)

Sistema de Registro, Priorizacion y Despacho de Emergencias Urbanas.
Node.js + TypeScript + Express 5, arquitectura en capas (dominio, aplicacion, infraestructura, presentacion) y persistencia en **MongoDB** (driver oficial `mongodb`).

## Requisitos

- Node.js 20.19 o superior (recomendado 22 LTS) y npm 10+.
- **MongoDB 6 o superior** encendido en `mongodb://127.0.0.1:27017`. Cualquiera de estas opciones sirve:
  - **MongoDB Community Server** (Windows): descargar el instalador `.msi` de mongodb.com/try/download/community, dejar marcada la opcion *Install MongoD as a Service* y, si quiere ver los datos, *Install MongoDB Compass*. El servicio queda encendido solo.
  - **Docker**: `docker run -d --name rescateflow-mongo -p 27017:27017 mongo:7`
  - **MongoDB Atlas** (nube, gratis): copiar la cadena `mongodb+srv://...` en `MONGODB_URI` del archivo `.env`.

## Instalacion y ejecucion

```bash
cd rescateflow-api
npm install          # instala dependencias
npm run seed         # crea la base "rescateflow" (colecciones, validadores e indices) con 4 unidades y 5 emergencias
npm run dev          # API en modo desarrollo: http://localhost:3000/api
```

Produccion:

```bash
npm run build        # compila TypeScript a ./dist
npm start            # ejecuta node dist/server.js
```

Otros comandos:

```bash
npm test             # 58 pruebas (dominio + endpoints end-to-end con MongoDB en memoria)
npm run typecheck    # verificacion de tipos sin compilar
```

Configuracion opcional: copiar `.env.example` como `.env` (puerto, `MONGODB_URI`, `MONGODB_BASE_DATOS`, proveedor de geocodificacion `SIMULADO` o `NOMINATIM`, area de cobertura, CORS).

`npm test` no necesita tener MongoDB instalado: levanta un MongoDB temporal en memoria (la primera vez descarga el binario, unos 100 MB, y lo deja en cache). Para probar contra su propio servidor: `MONGODB_URI_PRUEBAS=mongodb://127.0.0.1:27017 npm test` (usa la base `rescateflow_pruebas` y la borra al terminar).

## Base de datos MongoDB

| Coleccion | Contenido | Indices principales |
|---|---|---|
| `usuarios` | Operadores, despachadores, unidades y administradores | `correo` unico |
| `unidades` | Ambulancias, bomberos, policia y rescate con su estado y ubicacion | `codigo` unico, `estado+tipo`, `ubicacionActual` 2dsphere |
| `emergencias` | Reportes con prioridad, estado y marcas de tiempo de cada transicion | `codigo` unico, `estado`, `prioridad`, `ubicacion` 2dsphere |
| `despachos` | Asignacion de una unidad a una emergencia | **unico parcial `unidadId` donde `estado = ACTIVO` (RN-53)** |
| `historial_estados_emergencia` | Auditoria de cada cambio de estado de una emergencia | `emergenciaId+secuencia` unico |
| `historial_estados_unidad` | Auditoria de cada cambio de estado de una unidad | `unidadId+secuencia` unico |

- Los `_id` son UUID (texto), los mismos que expone la API.
- Las coordenadas se guardan como **GeoJSON** `{ type: 'Point', coordinates: [longitud, latitud] }`.
- Cada coleccion tiene un **validador `$jsonSchema`** que rechaza valores fuera de las enumeraciones del dominio (equivalente a los `CHECK` de SQL). Se crean solos al arrancar la API o ejecutar el seed.
- **Transacciones**: asignar una unidad, cambiar de estado o eliminar se ejecutan dentro de una transaccion cuando MongoDB es un *replica set* (Atlas, Docker con `--replSet`). Con un servidor independiente (la instalacion por defecto) la API funciona igual y la consistencia la protegen el bloqueo optimista por `version` (RN-33) y el indice unico parcial (RN-53). Al arrancar, la consola indica cual de los dos modos esta activo.

## Endpoints

| Metodo | Ruta | Descripcion |
|---|---|---|
| GET | `/api/emergencias?estado=&prioridad=&tipo=` | Lista emergencias (filtros opcionales), ordenadas por prioridad (RN-14) |
| GET | `/api/emergencias/:id` | Detalle con historial de cambios de estado y despachos |
| POST | `/api/emergencias` | Registra una emergencia (valida datos, geocodifica y calcula prioridad) |
| PATCH | `/api/emergencias/:id/estado` | Cambia el estado segun la maquina de estados; 409 si la transicion es invalida |
| POST | `/api/emergencias/:id/asignar-unidad` | Asigna una unidad DISPONIBLE: unidad EN_RUTA y emergencia DESPACHADA |
| DELETE | `/api/emergencias/:id` | Elimina solo si esta REPORTADA o CANCELADA; si no, 409 |
| GET | `/api/emergencias/:id/unidades-sugeridas` | Unidades compatibles y disponibles ordenadas por distancia |
| GET | `/api/unidades?estado=&tipo=` | Lista unidades y su estado actual |
| GET | `/api/unidades/:id` | Detalle de una unidad con su historial |
| GET | `/api/salud` | Verificacion de funcionamiento |

Encabezado opcional `X-Usuario-Id`: identifica al usuario que actua (queda en `operadorId`, `despachadorId` y en el historial).

### Ejemplos de cuerpo

`POST /api/emergencias`

```json
{
  "tipo": "EMERGENCIA_MEDICA",
  "descripcion": "Persona con dificultad respiratoria severa",
  "direccionReportada": "Centro Comercial Unicentro, entrada principal",
  "nombreReportante": "Maria Lopez",
  "telefonoReportante": "3001234567",
  "numeroAfectados": 1,
  "hayRiesgoVital": true,
  "hayHeridos": false,
  "hayRiesgoPropagacion": false
}
```

Opcional: `latitud` y `longitud` (juntas) para fijar la ubicacion manualmente.

`PATCH /api/emergencias/:id/estado`

```json
{ "estado": "VALIDADA" }
{ "estado": "VALIDADA", "prioridad": "ALTA", "justificacionPrioridad": "Paciente estable segun llamada de seguimiento" }
{ "estado": "EN_ATENCION" }
{ "estado": "CERRADA", "observacionesCierre": "Paciente trasladado al hospital departamental" }
{ "estado": "CANCELADA", "motivoCancelacion": "FALSA_ALARMA", "detalleCancelacion": "El reportante confirmo que no era una emergencia" }
```

`POST /api/emergencias/:id/asignar-unidad`

```json
{ "unidadId": "10000000-0000-4000-8000-000000000004" }
```

### Formato de error (uniforme)

```json
{
  "statusCode": 409,
  "error": "Conflict",
  "message": "No se puede pasar de REPORTADA a CERRADA: No se puede cerrar una emergencia que no ha sido atendida",
  "timestamp": "2026-11-23T18:40:08.316Z",
  "path": "/api/emergencias/20000000-0000-4000-8000-000000000005/estado",
  "codigo": "TRANSICION_INVALIDA",
  "detalles": { "entidad": "Emergencia", "estadoActual": "REPORTADA", "estadoSolicitado": "CERRADA" }
}
```

| HTTP | Cuando |
|---|---|
| 400 | Datos invalidos (`VALIDACION_FALLIDA`, `JSON_INVALIDO`) |
| 401 | `X-Usuario-Id` inexistente o inactivo |
| 404 | Recurso o ruta inexistente |
| 409 | Transicion invalida, unidad no disponible, eliminacion no permitida, conflicto de version |
| 422 | Regla de negocio: tipo de unidad incompatible, sin ubicacion, fuera de cobertura, prioridad no permitida |
| 500 | Error inesperado |

## Datos precargados (`npm run seed`)

| Emergencia | id | Estado | Prioridad |
|---|---|---|---|
| EMG-AAAA-000001 Incendio, Barrio Obrero | `20000000-0000-4000-8000-000000000005` | REPORTADA | CRITICA |
| EMG-AAAA-000002 Emergencia medica, Plaza de Narino | `20000000-0000-4000-8000-000000000007` | VALIDADA | CRITICA |
| EMG-AAAA-000003 Accidente de transito, Av. Panamericana | `20000000-0000-4000-8000-000000000010` | DESPACHADA (AMB-01) | ALTA |
| EMG-AAAA-000004 Seguridad, Parque Bolivar | `20000000-0000-4000-8000-000000000016` | CERRADA | MEDIA |
| EMG-AAAA-000005 Otro, Terminal de Transportes | `20000000-0000-4000-8000-000000000026` | CANCELADA | BAJA |

| Unidad | id | Tipo | Estado |
|---|---|---|---|
| AMB-01 | `10000000-0000-4000-8000-000000000001` | AMBULANCIA | EN_RUTA |
| BOM-01 | `10000000-0000-4000-8000-000000000002` | BOMBEROS | DISPONIBLE |
| POL-01 | `10000000-0000-4000-8000-000000000003` | POLICIA | DISPONIBLE |
| RES-01 | `10000000-0000-4000-8000-000000000004` | RESCATE | DISPONIBLE |

Usuarios para `X-Usuario-Id`: operador `00000000-0000-4000-8000-000000000002`, despachador `00000000-0000-4000-8000-000000000003`, administrador `00000000-0000-4000-8000-000000000001`.

## Estructura

```
src/
  domain/          entidades, enums, errores, servicios de dominio y puertos (sin dependencias externas)
  application/     servicios de aplicacion (casos de uso)
  infrastructure/  MongoDB (conexion, esquema, repositorios), geocodificacion, proveedores, seed
  presentation/    controladores, rutas, DTOs, presentadores y middlewares
  config/          configuracion por variables de entorno
  contenedor.ts    raiz de composicion (inyeccion de dependencias)
  app.ts           aplicacion Express
  server.ts        punto de entrada
tests/             pruebas de dominio y end-to-end
```

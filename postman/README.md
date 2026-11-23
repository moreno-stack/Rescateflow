# Pruebas Postman de RescateFlow API (Fase 5)

| Archivo | Contenido |
|---|---|
| `RescateFlow.postman_collection.json` | Coleccion Postman v2.1: 3 carpetas, 30 peticiones y 170 aserciones |
| `RescateFlow.postman_environment.json` | Entorno "RescateFlow - Local" (`baseUrl`, `emergenciaId`, `unidadId` y auxiliares) |

## 1. Preparar el backend

```bash
cd rescateflow-api
npm install
npm run seed     # 4 unidades y 5 emergencias de prueba
npm run dev      # http://localhost:3000/api
```

## 2. Importar en Postman

1. Abra Postman y pulse **Import** (arriba a la izquierda).
2. Arrastre los dos archivos `.json` de esta carpeta, o use **files** para elegirlos, y confirme con **Import**.
3. En el selector de entornos (arriba a la derecha) elija **RescateFlow - Local**.
4. Si el backend no corre en el puerto 3000, edite `baseUrl` en el entorno (icono del ojo, **Edit**).

## 3. Ejecutar

- **Toda la suite:** clic derecho sobre la coleccion **RescateFlow API**, **Run collection**, deje el orden por defecto y pulse **Run RescateFlow API**.
- **Una carpeta o peticion:** abrala y pulse **Send**. Las carpetas 2 y 3 deben ejecutarse en orden, porque cada peticion usa las variables que guarda la anterior (`emergenciaId`, `unidadId`, `emergenciaNegativaId`...).

La suite es repetible: crea sus propias emergencias, limpia las de prueba negativa al final y deja las unidades disponibles. Si una prueba de unidades falla por falta de unidades libres, vuelva a ejecutar `npm run seed`.

Por linea de comandos (Newman):

```bash
npx newman run postman/RescateFlow.postman_collection.json -e postman/RescateFlow.postman_environment.json
```

## Que se prueba

| Carpeta | Peticiones | Codigos esperados |
|---|---|---|
| 1. Unidades | Listar todas, listar disponibles (guarda `unidadId`) | 200 |
| 2. Flujo exitoso | Crear (guarda `emergenciaId`), filtrar por prioridad y estado, consultar por id, validar, unidades sugeridas, asignar unidad, verificar unidad EN_RUTA, EN_ATENCION, CERRADA, verificar historial y unidad liberada | 200, 201 |
| 3. Casos negativos | Campos faltantes, prioridad y tipo invalidos, datos fuera de rango, filtro invalido, id inexistente, REPORTADA a CERRADA, asignar sin validar, unidad incompatible, unidad ya en ruta, eliminar despachada, cerrar sin llegada, limpieza | 400, 404, 409, 422, 204 |

Cada peticion verifica el codigo HTTP, que el tiempo de respuesta sea menor a `tiempoMaximoMs` (2000 ms por defecto) y los campos del JSON. Los errores verifican ademas el formato uniforme `statusCode`, `error`, `message`, `timestamp` y el `codigo` de negocio.

Nota: `POST /asignar-unidad` responde **201 Created** porque crea un registro de `Despacho`.

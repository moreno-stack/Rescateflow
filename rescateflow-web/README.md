# RescateFlow Web (Frontend)

Panel operativo de despacho de emergencias en modo oscuro, conectado a los endpoints de RescateFlow API (Fase 3).
React 19 + Vite + TypeScript, sin librerias de UI: componentes y estilos propios.

## Requisitos

- Node.js 20.19+ o 22.12+ y npm 10+.
- El backend `rescateflow-api` corriendo en `http://localhost:3000`.

## Levantar backend y frontend

En dos terminales, desde la raiz del repositorio:

```bash
# Terminal 1: backend (Fase 3)
cd rescateflow-api
npm install
npm run seed        # datos de prueba: 4 unidades y 5 emergencias
npm run dev         # http://localhost:3000/api

# Terminal 2: frontend (Fase 4)
cd rescateflow-web
npm install
npm run dev         # abrir http://localhost:5173
```

Vite redirige `/api` al backend (ver `vite.config.ts`), por lo que no hace falta configurar CORS.

Otros comandos:

```bash
npm run build       # verifica tipos y genera ./dist
npm run preview     # sirve ./dist en http://localhost:4173 (tambien con proxy a la API)
npm run typecheck   # solo verificacion de tipos
```

Configuracion opcional (`.env`, ver `.env.example`): `VITE_BACKEND_URL` (destino del proxy) y `VITE_INTERVALO_ACTUALIZACION` (segundos entre actualizaciones automaticas, 15 por defecto).

## Que hace cada parte de la pantalla

| Zona | Endpoint que usa |
|---|---|
| Tarjetas de resumen (total, criticas activas, unidades disponibles, fuera del tiempo objetivo) | `GET /api/emergencias`, `GET /api/unidades` |
| Formulario "Registrar emergencia" | `POST /api/emergencias` |
| Filtros de prioridad y estado (cada cambio consulta al instante) | `GET /api/emergencias?estado=&prioridad=` |
| Desplegable "Asignar unidad" / "Enviar refuerzo" con las unidades libres y compatibles | `GET /api/emergencias/:id/unidades-sugeridas`, `POST /api/emergencias/:id/asignar-unidad` |
| Botones Validar, Registrar llegada, Cerrar, Cancelar (solo las transiciones validas que informa el backend) | `PATCH /api/emergencias/:id/estado` |
| Eliminar (solo reportadas o canceladas) | `DELETE /api/emergencias/:id` |
| Historial | `GET /api/emergencias/:id` |
| Panel "Unidades de respuesta" | `GET /api/unidades` |

Despues de cada accion la vista se recarga sola; ademas se actualiza cada 15 s mientras la pestana esta visible.
Los errores del backend se muestran en lenguaje claro: los 400 junto a cada campo del formulario o del dialogo, y los 409/422 con el mensaje exacto de la regla incumplida.

El selector "Actua como" envia el encabezado `X-Usuario-Id` con uno de los usuarios del seed, para que el historial registre quien hizo cada cambio.

### Titulo y prioridad en el formulario

- El backend guarda un unico campo `descripcion`. El formulario pide **titulo** y **descripcion** y los envia juntos: la primera linea es el titulo. Al mostrarlos se separan de nuevo.
- La **prioridad** la calcula el backend con las reglas de triaje (RN-10 a RN-13). El formulario muestra la prioridad estimada mientras se llenan los factores de riesgo; para cambiarla se usa "Validar con otra prioridad", que exige justificacion (RN-15/RN-16).

## Estructura

```
src/
  services/apiService.ts   capa HTTP: unico modulo que conoce URLs y encabezados; lanza ApiError
  types/dominio.ts         tipos identicos a las respuestas JSON del backend
  context/                 sesion (usuario que actua), notificaciones y datos del panel
  hooks/                   usePanel (carga y auto-actualizacion), useAccion (carga + error + recarga), useAhora
  components/              layout, resumen, emergencias, unidades y comunes (modal, insignias, iconos...)
  utils/                   etiquetas en espanol, formatos, estimacion de prioridad, titulo, lugares conocidos
  styles/                  tokens, base, layout y componentes
```

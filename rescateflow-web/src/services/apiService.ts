import type {
  CambioEstado,
  CuerpoError,
  Emergencia,
  EmergenciaCreada,
  EmergenciaDetalle,
  FiltrosEmergencias,
  ListaEmergencias,
  ListaSugerencias,
  ListaUnidades,
  NuevaEmergencia,
  ResultadoAsignacion,
} from '../types/dominio';

/**
 * Capa de servicio HTTP. Es el UNICO modulo que conoce URLs, metodos y
 * encabezados del backend; los componentes visuales solo llaman a apiService.
 */

const URL_BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') || '/api';
const TIEMPO_LIMITE_MS = 10_000;

/** Error de la API con la informacion del formato uniforme del backend. */
export class ApiError extends Error {
  readonly statusCode: number;
  readonly codigo: string;
  readonly detalles: unknown;

  constructor(statusCode: number, codigo: string, mensaje: string, detalles?: unknown) {
    super(mensaje);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.codigo = codigo;
    this.detalles = detalles;
  }

  /** Para 400 VALIDACION_FALLIDA: mapa campo -> mensaje. */
  camposInvalidos(): Record<string, string> {
    if (!Array.isArray(this.detalles)) return {};
    const campos: Record<string, string> = {};
    for (const item of this.detalles as Array<{ campo?: string; mensaje?: string }>) {
      if (item.campo && item.mensaje && !campos[item.campo]) campos[item.campo] = item.mensaje;
    }
    return campos;
  }

  get esConflicto(): boolean {
    return this.statusCode === 409;
  }

  get esValidacion(): boolean {
    return this.statusCode === 400;
  }
}

let usuarioActualId: string | null = null;

/** Define el usuario que actua (se envia como X-Usuario-Id para la auditoria). */
export function establecerUsuarioActual(id: string | null): void {
  usuarioActualId = id;
}

type Metodo = 'GET' | 'POST' | 'PATCH' | 'DELETE';

async function solicitar<T>(metodo: Metodo, ruta: string, cuerpo?: unknown, senal?: AbortSignal): Promise<T> {
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(new DOMException('timeout', 'TimeoutError')), TIEMPO_LIMITE_MS);
  senal?.addEventListener('abort', () => controlador.abort(senal.reason), { once: true });

  const encabezados: Record<string, string> = { Accept: 'application/json' };
  if (cuerpo !== undefined) encabezados['Content-Type'] = 'application/json';
  if (usuarioActualId) encabezados['X-Usuario-Id'] = usuarioActualId;

  let respuesta: Response;
  try {
    respuesta = await fetch(`${URL_BASE}${ruta}`, {
      method: metodo,
      headers: encabezados,
      body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
      signal: controlador.signal,
    });
  } catch (error) {
    if (senal?.aborted) throw error;
    const agotado = error instanceof DOMException && (error.name === 'TimeoutError' || error.name === 'AbortError');
    throw new ApiError(
      0,
      agotado ? 'TIEMPO_AGOTADO' : 'SIN_CONEXION',
      agotado
        ? 'La API tardo demasiado en responder. Intente de nuevo.'
        : 'No hay conexion con la API. Verifique que el backend este corriendo (npm run dev en rescateflow-api).',
    );
  } finally {
    clearTimeout(temporizador);
  }

  if (respuesta.status === 204) return undefined as T;

  const texto = await respuesta.text();
  let datos: unknown = null;
  if (texto) {
    try {
      datos = JSON.parse(texto);
    } catch {
      datos = null;
    }
  }

  if (!respuesta.ok) {
    const error = (datos ?? {}) as Partial<CuerpoError>;
    throw new ApiError(
      respuesta.status,
      error.codigo ?? `HTTP_${respuesta.status}`,
      // Sin cuerpo JSON y con 5xx: suele ser el proxy de Vite sin backend detras.
      // Sin cuerpo JSON y con 404: en el puerto del backend responde OTRO programa.
      error.message ??
        (respuesta.status === 404
          ? 'En el puerto del backend responde otro programa, no RescateFlow API. Cierre ese programa o cambie el puerto (PUERTO en rescateflow-api/.env y VITE_BACKEND_URL en rescateflow-web/.env).'
          : respuesta.status >= 500
          ? 'La API no esta disponible. Verifique que el backend este corriendo en el puerto 3000 (npm run dev en rescateflow-api).'
          : `La API respondio ${respuesta.status} ${respuesta.statusText}`),
      error.detalles,
    );
  }
  return datos as T;
}

function consulta(parametros: Record<string, string | undefined>): string {
  const busqueda = new URLSearchParams();
  for (const [clave, valor] of Object.entries(parametros)) {
    if (valor) busqueda.set(clave, valor);
  }
  const texto = busqueda.toString();
  return texto ? `?${texto}` : '';
}

export const apiService = {
  /** GET /api/emergencias?estado=&prioridad=&tipo= */
  listarEmergencias(filtros: FiltrosEmergencias = {}, senal?: AbortSignal): Promise<ListaEmergencias> {
    return solicitar('GET', `/emergencias${consulta({ ...filtros })}`, undefined, senal);
  },

  /** GET /api/emergencias/:id (con historial y despachos) */
  obtenerEmergencia(id: string, senal?: AbortSignal): Promise<EmergenciaDetalle> {
    return solicitar('GET', `/emergencias/${encodeURIComponent(id)}`, undefined, senal);
  },

  /** POST /api/emergencias */
  crearEmergencia(datos: NuevaEmergencia): Promise<EmergenciaCreada> {
    return solicitar('POST', '/emergencias', datos);
  },

  /** PATCH /api/emergencias/:id/estado */
  cambiarEstado(id: string, cambio: CambioEstado): Promise<Emergencia> {
    return solicitar('PATCH', `/emergencias/${encodeURIComponent(id)}/estado`, cambio);
  },

  /** POST /api/emergencias/:id/asignar-unidad */
  asignarUnidad(id: string, unidadId: string): Promise<ResultadoAsignacion> {
    return solicitar('POST', `/emergencias/${encodeURIComponent(id)}/asignar-unidad`, { unidadId });
  },

  /** DELETE /api/emergencias/:id */
  eliminarEmergencia(id: string): Promise<void> {
    return solicitar('DELETE', `/emergencias/${encodeURIComponent(id)}`);
  },

  /** GET /api/emergencias/:id/unidades-sugeridas */
  unidadesSugeridas(id: string, senal?: AbortSignal): Promise<ListaSugerencias> {
    return solicitar('GET', `/emergencias/${encodeURIComponent(id)}/unidades-sugeridas`, undefined, senal);
  },

  /** GET /api/unidades */
  listarUnidades(senal?: AbortSignal): Promise<ListaUnidades> {
    return solicitar('GET', '/unidades', undefined, senal);
  },
};

export type ApiService = typeof apiService;

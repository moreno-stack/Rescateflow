import { ErrorRequestHandler, RequestHandler } from 'express';
import { STATUS_CODES } from 'node:http';
import { ZodError } from 'zod';
import { ErrorDominio, TipoErrorDominio } from '../../domain/errors/errores-dominio';

/** Formato unico de error de la API. */
export interface RespuestaError {
  statusCode: number;
  error: string;
  message: string;
  timestamp: string;
  path: string;
  codigo: string;
  detalles?: unknown;
}

const HTTP_POR_TIPO: Record<TipoErrorDominio, number> = {
  VALIDACION: 400,
  NO_ENCONTRADO: 404,
  CONFLICTO: 409,
  REGLA_NEGOCIO: 422,
  SERVICIO_EXTERNO: 502,
};

function construir(statusCode: number, codigo: string, message: string, path: string, detalles?: unknown): RespuestaError {
  const respuesta: RespuestaError = {
    statusCode,
    error: STATUS_CODES[statusCode] ?? 'Error',
    message,
    timestamp: new Date().toISOString(),
    path,
    codigo,
  };
  if (detalles !== undefined) respuesta.detalles = detalles;
  return respuesta;
}

/** Convierte ZodError en una lista legible de campos invalidos. */
export function detallesDeZod(error: ZodError): Array<{ campo: string; mensaje: string }> {
  return error.issues.map((issue) => ({
    campo: issue.path.length ? issue.path.join('.') : '(cuerpo)',
    mensaje: issue.code === 'unrecognized_keys' ? `Campos no permitidos: ${issue.keys.join(', ')}` : issue.message,
  }));
}

/** Middleware para rutas inexistentes: 404 con el mismo formato JSON. */
export const rutaNoEncontrada: RequestHandler = (req, res) => {
  res
    .status(404)
    .json(construir(404, 'RUTA_NO_ENCONTRADA', `La ruta ${req.method} ${req.originalUrl} no existe`, req.originalUrl));
};

/**
 * Manejador centralizado de errores. Traduce:
 *  - ErrorDominio      -> 400/404/409/422/502 segun su tipo
 *  - ZodError          -> 400 VALIDACION_FALLIDA con detalle por campo
 *  - JSON mal formado  -> 400 JSON_INVALIDO
 *  - cualquier otro    -> 500 ERROR_INTERNO (sin filtrar detalles internos)
 */
export const manejadorErrores: ErrorRequestHandler = (err, req, res, _next) => {
  const ruta = req.originalUrl;

  if (err instanceof ErrorDominio) {
    const status = HTTP_POR_TIPO[err.tipo];
    res.status(status).json(construir(status, err.codigo, err.message, ruta, err.detalles));
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json(construir(400, 'VALIDACION_FALLIDA', 'Los datos enviados no son validos', ruta, detallesDeZod(err)));
    return;
  }

  const cuerpoInvalido = err as { type?: string; status?: number };
  if (cuerpoInvalido?.type === 'entity.parse.failed') {
    res.status(400).json(construir(400, 'JSON_INVALIDO', 'El cuerpo de la peticion no es un JSON valido', ruta));
    return;
  }
  if (cuerpoInvalido?.type === 'entity.too.large') {
    res.status(413).json(construir(413, 'CUERPO_DEMASIADO_GRANDE', 'El cuerpo de la peticion supera el tamano permitido', ruta));
    return;
  }

  console.error('[RescateFlow] Error no controlado:', err);
  res.status(500).json(construir(500, 'ERROR_INTERNO', 'Ocurrio un error inesperado en el servidor', ruta));
};

import { RequestHandler } from 'express';
import { ZodType } from 'zod';

/**
 * Middlewares de validacion (fail fast). Si los datos no cumplen el DTO se lanza
 * el ZodError y el manejador centralizado responde 400. Los datos ya validados y
 * transformados se guardan en res.locals para que el controlador los use.
 */
export function validarCuerpo(esquema: ZodType): RequestHandler {
  return (req, res, next) => {
    res.locals.cuerpo = esquema.parse(req.body ?? {});
    next();
  };
}

export function validarConsulta(esquema: ZodType): RequestHandler {
  return (req, res, next) => {
    res.locals.consulta = esquema.parse(req.query ?? {});
    next();
  };
}

import { RequestHandler } from 'express';

/** Registra en consola metodo, ruta, codigo de respuesta y duracion de cada peticion. */
export const registroPeticiones: RequestHandler = (req, res, next) => {
  const inicio = process.hrtime.bigint();
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - inicio) / 1_000_000;
    console.log(`[RescateFlow] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${ms.toFixed(1)} ms)`);
  });
  next();
};

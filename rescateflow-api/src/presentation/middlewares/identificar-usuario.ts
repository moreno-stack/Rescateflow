import { RequestHandler } from 'express';
import { UsuarioRepositorio } from '../../domain/ports/repositorios';

/**
 * Identifica (opcionalmente) al usuario que realiza la operacion mediante el
 * encabezado "X-Usuario-Id". Se usa para la auditoria: operadorId, despachadorId
 * e historial de estados. Si el encabezado no llega, la operacion queda sin usuario.
 */
export function identificarUsuario(usuarios: UsuarioRepositorio): RequestHandler {
  return (req, res, next) => {
    const encabezado = req.header('x-usuario-id')?.trim();
    if (!encabezado) {
      res.locals.usuarioId = null;
      next();
      return;
    }
    const usuario = usuarios.buscarPorId(encabezado);
    if (!usuario || !usuario.activo) {
      res.status(401).json({
        statusCode: 401,
        error: 'Unauthorized',
        message: `El usuario indicado en X-Usuario-Id no existe o esta inactivo`,
        timestamp: new Date().toISOString(),
        path: req.originalUrl,
        codigo: 'USUARIO_NO_VALIDO',
      });
      return;
    }
    res.locals.usuarioId = usuario.id;
    next();
  };
}

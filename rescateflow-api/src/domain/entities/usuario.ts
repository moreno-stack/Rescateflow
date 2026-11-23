import { RolUsuario } from '../enums';

/**
 * Usuario del sistema (Fase 1, seccion 7.4). En esta fase no hay login:
 * el usuario que actua se identifica con el encabezado HTTP "X-Usuario-Id"
 * y se usa para la auditoria (operadorId, despachadorId, historial).
 */
export interface Usuario {
  id: string;
  nombreCompleto: string;
  correo: string;
  rol: RolUsuario;
  activo: boolean;
  creadoEn: string;
  actualizadoEn: string;
}

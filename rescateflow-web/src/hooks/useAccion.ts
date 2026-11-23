import { useCallback, useState } from 'react';
import { useNotificaciones } from '../context/NotificacionesContext';
import { usePanelContext } from '../context/PanelContext';
import { ApiError } from '../services/apiService';

/** Titulo del aviso segun el codigo HTTP devuelto por el backend. */
export function tituloDeError(error: ApiError): string {
  switch (error.statusCode) {
    case 0: return 'Sin conexión con la API';
    case 400: return 'Datos inválidos';
    case 401: return 'Usuario no reconocido';
    case 404: return 'No encontrado';
    case 409: return 'Acción no permitida en el estado actual';
    case 422: return 'La regla de negocio no lo permite';
    default: return 'Error del servidor';
  }
}

/** Convierte los detalles de un 400 en lineas legibles. */
export function lineasDeDetalle(error: ApiError): string[] {
  return Object.entries(error.camposInvalidos()).map(([campo, mensaje]) => `${campo}: ${mensaje}`);
}

export interface OpcionesAccion<T> {
  exito?: (resultado: T) => string;
  /** Si es false, el error no se muestra como notificacion (lo muestra el propio componente). */
  notificarError?: boolean;
}

export type ResultadoAccion<T> = { ok: true; datos: T } | { ok: false; error: ApiError };

/**
 * Ejecuta una accion contra la API con estado de carga, notificacion de exito o
 * error (400/409/422...) y recarga automatica del panel al terminar.
 */
export function useAccion() {
  const [cargando, setCargando] = useState(false);
  const { notificar } = useNotificaciones();
  const { recargar } = usePanelContext();

  const ejecutar = useCallback(
    async <T,>(accion: () => Promise<T>, opciones: OpcionesAccion<T> = {}): Promise<ResultadoAccion<T>> => {
      setCargando(true);
      try {
        const datos = await accion();
        if (opciones.exito) notificar({ tipo: 'exito', titulo: opciones.exito(datos) });
        await recargar();
        return { ok: true, datos };
      } catch (e) {
        const error = e instanceof ApiError ? e : new ApiError(0, 'ERROR_DESCONOCIDO', 'Ocurrió un error inesperado');
        if (opciones.notificarError !== false) {
          notificar({ tipo: 'error', titulo: tituloDeError(error), mensaje: error.message, detalles: lineasDeDetalle(error) });
        }
        // Un 409 suele significar que otro usuario cambio el dato: se refresca la vista.
        if (error.statusCode === 409 || error.statusCode === 404) await recargar();
        return { ok: false, error };
      } finally {
        setCargando(false);
      }
    },
    [notificar, recargar],
  );

  return { ejecutar, cargando };
}

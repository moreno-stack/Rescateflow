/** Puerto de reloj: permite fijar la hora en pruebas (actor temporal, Fase 1 seccion 2.2). */
export interface ProveedorTiempo {
  ahora(): Date;
}

/** Puerto generador de identificadores UUID. */
export interface GeneradorId {
  nuevoId(): string;
}

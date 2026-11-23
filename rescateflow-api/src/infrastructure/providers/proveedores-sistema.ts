import { randomUUID } from 'node:crypto';
import { GeneradorId, ProveedorTiempo } from '../../domain/ports/proveedores';

/** Reloj real del servidor (fechas guardadas en UTC, formato ISO 8601). */
export class ProveedorTiempoSistema implements ProveedorTiempo {
  ahora(): Date {
    return new Date();
  }
}

/** Generador de UUID v4 nativo de Node. */
export class GeneradorIdUuid implements GeneradorId {
  nuevoId(): string {
    return randomUUID();
  }
}

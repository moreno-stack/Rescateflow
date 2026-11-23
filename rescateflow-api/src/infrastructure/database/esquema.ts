/**
 * Esquema SQLite de RescateFlow (diccionario de datos, Fase 1 seccion 7.4).
 * Tablas en plural y snake_case; enumeraciones protegidas con CHECK.
 */
export const ESQUEMA_SQL = `
CREATE TABLE IF NOT EXISTS usuarios (
  id               TEXT PRIMARY KEY,
  nombre_completo  TEXT NOT NULL,
  correo           TEXT NOT NULL UNIQUE,
  rol              TEXT NOT NULL CHECK (rol IN ('OPERADOR','DESPACHADOR','UNIDAD','ADMINISTRADOR')),
  activo           INTEGER NOT NULL DEFAULT 1 CHECK (activo IN (0,1)),
  creado_en        TEXT NOT NULL,
  actualizado_en   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS unidades (
  id                        TEXT PRIMARY KEY,
  codigo                    TEXT NOT NULL UNIQUE,
  nombre                    TEXT NOT NULL,
  tipo                      TEXT NOT NULL CHECK (tipo IN ('AMBULANCIA','BOMBEROS','POLICIA','RESCATE')),
  estado                    TEXT NOT NULL CHECK (estado IN ('DISPONIBLE','EN_RUTA','OCUPADA','FUERA_DE_SERVICIO')),
  activa                    INTEGER NOT NULL DEFAULT 1 CHECK (activa IN (0,1)),
  base_nombre               TEXT NOT NULL,
  latitud_base              REAL NOT NULL,
  longitud_base             REAL NOT NULL,
  latitud_actual            REAL NOT NULL,
  longitud_actual           REAL NOT NULL,
  ubicacion_actualizada_en  TEXT NOT NULL,
  motivo_estado             TEXT,
  usuario_responsable_id    TEXT UNIQUE REFERENCES usuarios(id) ON DELETE SET NULL,
  creado_en                 TEXT NOT NULL,
  actualizado_en            TEXT NOT NULL,
  version                   INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS emergencias (
  id                              TEXT PRIMARY KEY,
  codigo                          TEXT NOT NULL UNIQUE,
  tipo                            TEXT NOT NULL CHECK (tipo IN ('INCENDIO','MATERIALES_PELIGROSOS','EMERGENCIA_MEDICA','DESASTRE_NATURAL','ACCIDENTE_TRANSITO','SEGURIDAD','OTRO')),
  descripcion                     TEXT NOT NULL,
  direccion_reportada             TEXT NOT NULL,
  direccion_normalizada           TEXT,
  latitud                         REAL,
  longitud                        REAL,
  geocodificada                   INTEGER NOT NULL DEFAULT 0 CHECK (geocodificada IN (0,1)),
  fuente_ubicacion                TEXT CHECK (fuente_ubicacion IN ('GEOCODIFICACION','MANUAL')),
  nombre_reportante               TEXT,
  telefono_reportante             TEXT NOT NULL,
  numero_afectados                INTEGER NOT NULL CHECK (numero_afectados BETWEEN 0 AND 500),
  hay_riesgo_vital                INTEGER NOT NULL CHECK (hay_riesgo_vital IN (0,1)),
  hay_heridos                     INTEGER NOT NULL CHECK (hay_heridos IN (0,1)),
  hay_riesgo_propagacion          INTEGER NOT NULL CHECK (hay_riesgo_propagacion IN (0,1)),
  puntaje_prioridad               INTEGER NOT NULL CHECK (puntaje_prioridad BETWEEN 0 AND 100),
  prioridad                       TEXT NOT NULL CHECK (prioridad IN ('CRITICA','ALTA','MEDIA','BAJA')),
  prioridad_ajustada_manualmente  INTEGER NOT NULL DEFAULT 0 CHECK (prioridad_ajustada_manualmente IN (0,1)),
  justificacion_prioridad         TEXT,
  estado                          TEXT NOT NULL CHECK (estado IN ('REPORTADA','VALIDADA','DESPACHADA','EN_ATENCION','CERRADA','CANCELADA')),
  motivo_cancelacion              TEXT CHECK (motivo_cancelacion IN ('FALSA_ALARMA','DUPLICADA','RESUELTA_SIN_INTERVENCION','FUERA_DE_JURISDICCION','OTRO')),
  detalle_cancelacion             TEXT,
  emergencia_relacionada_id       TEXT REFERENCES emergencias(id) ON DELETE SET NULL,
  observaciones_cierre            TEXT,
  operador_id                     TEXT REFERENCES usuarios(id) ON DELETE SET NULL,
  despachador_id                  TEXT REFERENCES usuarios(id) ON DELETE SET NULL,
  reportada_en                    TEXT NOT NULL,
  validada_en                     TEXT,
  despachada_en                   TEXT,
  en_atencion_en                  TEXT,
  cerrada_en                      TEXT,
  cancelada_en                    TEXT,
  creado_en                       TEXT NOT NULL,
  actualizado_en                  TEXT NOT NULL,
  version                         INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS ix_emergencias_estado ON emergencias(estado);
CREATE INDEX IF NOT EXISTS ix_emergencias_prioridad ON emergencias(prioridad);

CREATE TABLE IF NOT EXISTS despachos (
  id                   TEXT PRIMARY KEY,
  emergencia_id        TEXT NOT NULL REFERENCES emergencias(id) ON DELETE CASCADE,
  unidad_id            TEXT NOT NULL REFERENCES unidades(id),
  despachador_id       TEXT REFERENCES usuarios(id) ON DELETE SET NULL,
  estado               TEXT NOT NULL CHECK (estado IN ('ACTIVO','FINALIZADO','CANCELADO')),
  distancia_km         REAL NOT NULL,
  tiempo_estimado_min  INTEGER NOT NULL,
  asignado_en          TEXT NOT NULL,
  llegada_en           TEXT,
  liberado_en          TEXT,
  observaciones        TEXT
);

-- RN-53: una unidad solo puede tener un despacho ACTIVO a la vez
CREATE UNIQUE INDEX IF NOT EXISTS ux_despacho_activo_por_unidad ON despachos(unidad_id) WHERE estado = 'ACTIVO';
CREATE INDEX IF NOT EXISTS ix_despachos_emergencia ON despachos(emergencia_id);

CREATE TABLE IF NOT EXISTS historial_estados_emergencia (
  id               TEXT PRIMARY KEY,
  emergencia_id    TEXT NOT NULL REFERENCES emergencias(id) ON DELETE CASCADE,
  estado_anterior  TEXT,
  estado_nuevo     TEXT NOT NULL,
  usuario_id       TEXT REFERENCES usuarios(id) ON DELETE SET NULL,
  motivo           TEXT,
  ocurrido_en      TEXT NOT NULL,
  secuencia        INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_historial_emergencia ON historial_estados_emergencia(emergencia_id, secuencia);

CREATE TABLE IF NOT EXISTS historial_estados_unidad (
  id               TEXT PRIMARY KEY,
  unidad_id        TEXT NOT NULL REFERENCES unidades(id) ON DELETE CASCADE,
  estado_anterior  TEXT,
  estado_nuevo     TEXT NOT NULL,
  despacho_id      TEXT REFERENCES despachos(id) ON DELETE SET NULL,
  usuario_id       TEXT REFERENCES usuarios(id) ON DELETE SET NULL,
  motivo           TEXT,
  ocurrido_en      TEXT NOT NULL,
  secuencia        INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_historial_unidad ON historial_estados_unidad(unidad_id, secuencia);
`;

/** Tablas en orden seguro para vaciarlas (hijos primero). */
export const TABLAS_EN_ORDEN_DE_BORRADO = [
  'historial_estados_unidad',
  'historial_estados_emergencia',
  'despachos',
  'emergencias',
  'unidades',
  'usuarios',
] as const;

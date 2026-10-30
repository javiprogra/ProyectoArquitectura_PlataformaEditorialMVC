-- ============================================================================
--  LuminaDB · Bootstrap de configuración (Creation)
-- ============================================================================
--  Plataforma Editorial Multicanal — PostgreSQL / Supabase
--
--  PRERREQUISITO: ejecutar primero el script de esquema base
--    "Base de Datos Proyecto Arquitectura I Script.sql" (17 tablas).
--
--  QUÉ HACE ESTE SCRIPT (idempotente, puede re-ejecutarse sin error):
--    1. Extensiones (pg_trgm para búsqueda).
--    2. Tablas de configuración del negocio (IVA y tramos de descuento).
--    3. Tablas de auditoría (movimientos de inventario e historial de estados).
--    4. Índices únicos y de rendimiento.
--    5. Restricciones CHECK de integridad.
--    6. Semillas de configuración.
--    7. Privilegios por defecto (evitar exponer funciones por PostgREST).
--
--  EJECUTAR en el SQL Editor de Supabase como rol postgres.
-- ============================================================================

-- 1. Extensiones ------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

-- 2. Tablas de configuración -------------------------------------------------
CREATE TABLE IF NOT EXISTS parametro_negocio (
    clave           VARCHAR(50) PRIMARY KEY,
    valor           NUMERIC(12,4) NOT NULL,
    descripcion     VARCHAR(255) NOT NULL,
    vigente         BOOLEAN NOT NULL DEFAULT TRUE,
    actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS regla_descuento_volumen (
    id_regla      SERIAL PRIMARY KEY,
    cantidad_min  INTEGER NOT NULL CHECK (cantidad_min > 0),
    cantidad_max  INTEGER,
    porcentaje    NUMERIC(5,2) NOT NULL CHECK (porcentaje BETWEEN 0 AND 100),
    vigente       BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT uq_regla_volumen_min UNIQUE (cantidad_min),
    CONSTRAINT ck_regla_volumen_rango CHECK (cantidad_max IS NULL OR cantidad_max >= cantidad_min)
);

-- 3. Tablas de auditoría -----------------------------------------------------
CREATE TABLE IF NOT EXISTS movimiento_inventario (
    id_movimiento     BIGSERIAL PRIMARY KEY,
    id_libro          INTEGER NOT NULL REFERENCES libro(id_libro),
    cantidad          INTEGER NOT NULL,
    stock_resultante  INTEGER NOT NULL CHECK (stock_resultante >= 0),
    motivo            VARCHAR(255),
    id_usuario        INTEGER REFERENCES usuario(id_usuario),
    id_orden          INTEGER REFERENCES orden(id_orden),
    fecha             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS historial_estado (
    id_historial     BIGSERIAL PRIMARY KEY,
    entidad          VARCHAR(20) NOT NULL
                     CHECK (entidad IN ('solicitud', 'cotizacion', 'orden', 'usuario')),
    id_entidad       INTEGER NOT NULL,
    estado_anterior  VARCHAR(50),
    estado_nuevo     VARCHAR(50) NOT NULL,
    id_usuario       INTEGER REFERENCES usuario(id_usuario),
    motivo           VARCHAR(255),
    fecha            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices de las tablas de auditoría
CREATE INDEX IF NOT EXISTS ix_movimiento_inventario_libro ON movimiento_inventario (id_libro, fecha);
CREATE INDEX IF NOT EXISTS ix_movimiento_inventario_orden ON movimiento_inventario (id_orden);
CREATE INDEX IF NOT EXISTS ix_historial_estado_entidad ON historial_estado (entidad, id_entidad, fecha);

-- 4. Índices únicos (integridad 1:1 y ausencia de duplicados) ---------------
CREATE UNIQUE INDEX IF NOT EXISTS ux_inventario_libro      ON inventario (id_libro);
CREATE UNIQUE INDEX IF NOT EXISTS ux_orden_cotizacion      ON orden (id_cotizacion);
CREATE UNIQUE INDEX IF NOT EXISTS ux_detalle_solicitud     ON detalle_solicitud (id_solicitud, id_libro);
CREATE UNIQUE INDEX IF NOT EXISTS ux_detalle_cotizacion    ON detalle_cotizacion (id_cotizacion, id_libro);
CREATE UNIQUE INDEX IF NOT EXISTS ux_detalle_orden         ON detalle_orden (id_orden, id_libro);
CREATE UNIQUE INDEX IF NOT EXISTS ux_rol_nombre            ON rol (lower(nombre));
CREATE UNIQUE INDEX IF NOT EXISTS ux_tipo_cliente_tipo     ON tipo_cliente (lower(tipo));
CREATE UNIQUE INDEX IF NOT EXISTS ux_categoria_nombre      ON categoria (lower(nombre));
CREATE UNIQUE INDEX IF NOT EXISTS ux_formato_tipo          ON formato (lower(tipo));
CREATE UNIQUE INDEX IF NOT EXISTS ux_usuario_lower         ON usuario (lower(usuario));

-- 5. Índices de rendimiento (claves foráneas) -------------------------------
CREATE INDEX IF NOT EXISTS ix_usuario_rol              ON usuario (id_rol);
CREATE INDEX IF NOT EXISTS ix_cliente_tipo             ON cliente (id_tipo_cliente);
CREATE INDEX IF NOT EXISTS ix_libro_categoria          ON libro (id_categoria);
CREATE INDEX IF NOT EXISTS ix_libro_editorial          ON libro (id_editorial);
CREATE INDEX IF NOT EXISTS ix_libro_formato            ON libro (id_formato);
CREATE INDEX IF NOT EXISTS ix_libro_autor              ON libro (id_autor);
CREATE INDEX IF NOT EXISTS ix_imagen_libro             ON imagen (id_libro);
CREATE INDEX IF NOT EXISTS ix_solicitud_cliente        ON solicitud (id_cliente);
CREATE INDEX IF NOT EXISTS ix_detalle_solicitud_libro  ON detalle_solicitud (id_libro);
CREATE INDEX IF NOT EXISTS ix_cotizacion_solicitud     ON cotizacion (id_solicitud);
CREATE INDEX IF NOT EXISTS ix_detalle_cotizacion_libro ON detalle_cotizacion (id_libro);
CREATE INDEX IF NOT EXISTS ix_orden_usuario            ON orden (id_usuario);
CREATE INDEX IF NOT EXISTS ix_detalle_orden_libro      ON detalle_orden (id_libro);

-- Búsqueda y reportes
CREATE INDEX IF NOT EXISTS ix_libro_nombre_trgm  ON libro USING gin (nombre gin_trgm_ops);
CREATE INDEX IF NOT EXISTS ix_orden_fecha        ON orden (fecha);
CREATE INDEX IF NOT EXISTS ix_cotizacion_fecha   ON cotizacion (fecha);
CREATE INDEX IF NOT EXISTS ix_solicitud_fecha    ON solicitud (fecha_solicitud);

-- 6. Restricciones CHECK de integridad --------------------------------------
DO $$
BEGIN
    -- Inventario
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_inventario_stock') THEN
        ALTER TABLE inventario ADD CONSTRAINT ck_inventario_stock CHECK (stock >= 0);
    END IF;

    -- Libro
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_libro_precio') THEN
        ALTER TABLE libro ADD CONSTRAINT ck_libro_precio CHECK (precio_base >= 0);
    END IF;

    -- Tipo de cliente
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_tipo_cliente_descuento') THEN
        ALTER TABLE tipo_cliente ADD CONSTRAINT ck_tipo_cliente_descuento CHECK (descuento BETWEEN 0 AND 100);
    END IF;

    -- Detalles (cantidades y montos positivos)
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_detalle_solicitud_cantidad') THEN
        ALTER TABLE detalle_solicitud ADD CONSTRAINT ck_detalle_solicitud_cantidad CHECK (cantidad_estimada > 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_detalle_cotizacion_cantidad') THEN
        ALTER TABLE detalle_cotizacion ADD CONSTRAINT ck_detalle_cotizacion_cantidad CHECK (cantidad > 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_detalle_cotizacion_montos') THEN
        ALTER TABLE detalle_cotizacion ADD CONSTRAINT ck_detalle_cotizacion_montos
            CHECK (precio_unitario >= 0 AND subtotal_item >= 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_detalle_orden_cantidad') THEN
        ALTER TABLE detalle_orden ADD CONSTRAINT ck_detalle_orden_cantidad CHECK (cantidad > 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_detalle_orden_montos') THEN
        ALTER TABLE detalle_orden ADD CONSTRAINT ck_detalle_orden_montos
            CHECK (precio_unitario >= 0 AND subtotal_item >= 0);
    END IF;

    -- Solicitud: fecha de entrega >= fecha de solicitud
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_solicitud_fecha') THEN
        ALTER TABLE solicitud ADD CONSTRAINT ck_solicitud_fecha
            CHECK (fecha_requerida_entrega >= fecha_solicitud::date);
    END IF;

    -- Cotización: montos y consistencia de totales
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_cotizacion_totales') THEN
        ALTER TABLE cotizacion ADD CONSTRAINT ck_cotizacion_totales
            CHECK (subtotal >= 0 AND impuesto >= 0 AND total >= 0
                   AND total = subtotal + impuesto);
    END IF;

    -- Orden: montos y consistencia de totales
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_orden_totales') THEN
        ALTER TABLE orden ADD CONSTRAINT ck_orden_totales
            CHECK (subtotal_base >= 0 AND descuento_volumen >= 0
                   AND descuento_cliente >= 0 AND impuesto >= 0 AND total_final >= 0
                   AND total_final = subtotal_base - descuento_volumen - descuento_cliente + impuesto);
    END IF;

    -- Catálogo de estados
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_solicitud_estado') THEN
        ALTER TABLE solicitud ADD CONSTRAINT ck_solicitud_estado
            CHECK (estado IN ('En Revisión', 'Aprobada', 'Cotizada', 'Rechazada', 'Anulada'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_cotizacion_estado') THEN
        ALTER TABLE cotizacion ADD CONSTRAINT ck_cotizacion_estado
            CHECK (estado IN ('Pendiente Aceptación', 'Aceptada', 'Rechazada', 'Procesada', 'Anulada'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_orden_estado') THEN
        ALTER TABLE orden ADD CONSTRAINT ck_orden_estado
            CHECK (estado IN ('En Proceso', 'Despachado', 'Entregado', 'Anulada'));
    END IF;
END;
$$;

-- 7. Semillas de configuración ----------------------------------------------
INSERT INTO parametro_negocio (clave, valor, descripcion)
VALUES ('iva', 0.12, 'IVA aplicado a cotizaciones y órdenes (12%)')
ON CONFLICT (clave) DO NOTHING;

INSERT INTO regla_descuento_volumen (cantidad_min, cantidad_max, porcentaje)
VALUES
    (1,  5,  0.00),
    (6,  20, 5.00),
    (21, 50, 10.00),
    (51, NULL, 15.00)
ON CONFLICT (cantidad_min) DO NOTHING;

-- 8. Privilegios por defecto -------------------------------------------------
-- Evita que las funciones creadas a continuación queden expuestas a PUBLIC
-- (PostgREST). Solo aplica en Supabase (rol service_role).
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO service_role;

-- ============================================================================
--  Fin del bootstrap. A continuación ejecutar "LuminaProcedures.sql".
-- ============================================================================

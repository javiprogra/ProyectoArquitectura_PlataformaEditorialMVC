-- ============================================================================
--  LuminaDB · Procedimientos y funciones (LuminaProcedures)
-- ============================================================================
--  Plataforma Editorial Multicanal — PostgreSQL / Supabase
--
--  PRERREQUISITO: haber ejecutado "LuminaProceduresCreation.sql".
--
--  CONVENCIÓN:
--    * fn_...  → funciones de lectura / cálculo (STABLE).
--    * sp_...  → funciones de escritura / transacciones atómicas.
--    Todo se implementa como FUNCTION (no PROCEDURE) para una integración
--    limpia y tipada con TypeORM: `SELECT * FROM fn_x(...)`.
--
--  CÓDIGOS DE ERROR (SQLSTATE) que puede mapear el backend a HTTP:
--    LUM01  Parámetro inválido
--    LUM02  Stock insuficiente
--    LUM03  Estado inválido / sin permisos
--    LUM04  Ya existe una orden/cotización vigente
--    LUM05  Último administrador
--    LUM06  Entidad en uso
--    LUM07  Registro no encontrado
--    LUM08  Duplicado
--
--  RE-EJECUTABLE: los cambios de cuerpo usan CREATE OR REPLACE.
--  Para cambiar la FIRMA (tipos de parámetros o de retorno) hay que ejecutar
--  antes `DROP FUNCTION IF EXISTS nombre(...);`.
-- ============================================================================

-- ============================================================================
-- A. MOTOR DE DESCUENTOS (RF-03.2)
-- ============================================================================

-- IVA vigente (por defecto 12%).
CREATE OR REPLACE FUNCTION fn_iva_vigente()
RETURNS NUMERIC(6,4)
LANGUAGE plpgsql STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
    v_iva NUMERIC(6,4);
BEGIN
    SELECT valor INTO v_iva
    FROM parametro_negocio
    WHERE clave = 'iva' AND vigente = TRUE
    LIMIT 1;

    RETURN COALESCE(v_iva, 0.12);
END;
$$;

-- Porcentaje de descuento por volumen según la cantidad total.
CREATE OR REPLACE FUNCTION fn_porcentaje_descuento_volumen(p_cantidad INTEGER)
RETURNS NUMERIC(5,2)
LANGUAGE plpgsql STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
    v_pct NUMERIC(5,2);
BEGIN
    IF p_cantidad IS NULL OR p_cantidad <= 0 THEN
        RETURN 0;
    END IF;

    SELECT porcentaje INTO v_pct
    FROM regla_descuento_volumen
    WHERE vigente = TRUE
      AND p_cantidad >= cantidad_min
      AND (cantidad_max IS NULL OR p_cantidad <= cantidad_max)
    ORDER BY cantidad_min DESC
    LIMIT 1;

    RETURN COALESCE(v_pct, 0);
END;
$$;

-- Porcentaje de descuento asociado al tipo de cliente.
CREATE OR REPLACE FUNCTION fn_porcentaje_descuento_cliente(p_id_cliente INTEGER)
RETURNS NUMERIC(5,2)
LANGUAGE plpgsql STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
    v_pct NUMERIC(5,2);
BEGIN
    SELECT tc.descuento INTO v_pct
    FROM cliente c
    JOIN tipo_cliente tc ON tc.id_tipo_cliente = c.id_tipo_cliente
    WHERE c.id_cliente = p_id_cliente;

    RETURN COALESCE(v_pct, 0);
END;
$$;

-- Fórmula central del motor de descuentos (pura y reutilizable).
--   Dv = ROUND(S * pv / 100, 2)
--   Dc = ROUND((S - Dv) * pc / 100, 2)
--   B  = S - Dv - Dc
--   I  = ROUND(B * iva, 2)
--   T  = B + I
CREATE OR REPLACE FUNCTION fn_calcular_totales(
    p_subtotal   NUMERIC,
    p_cantidad   INTEGER,
    p_id_cliente INTEGER
)
RETURNS TABLE (
    pct_volumen        NUMERIC(5,2),
    descuento_volumen  NUMERIC(12,2),
    pct_cliente        NUMERIC(5,2),
    descuento_cliente  NUMERIC(12,2),
    base_imponible     NUMERIC(12,2),
    pct_iva            NUMERIC(6,4),
    impuesto           NUMERIC(12,2),
    total_final        NUMERIC(12,2)
)
LANGUAGE plpgsql STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
    v_subtotal NUMERIC(12,2) := COALESCE(p_subtotal, 0);
    v_pv  NUMERIC(5,2);
    v_dv  NUMERIC(12,2);
    v_pc  NUMERIC(5,2);
    v_dc  NUMERIC(12,2);
    v_base NUMERIC(12,2);
    v_iva NUMERIC(6,4);
    v_imp NUMERIC(12,2);
BEGIN
    IF v_subtotal < 0 THEN
        RAISE EXCEPTION 'El subtotal no puede ser negativo' USING ERRCODE = 'LUM01';
    END IF;

    v_pv  := fn_porcentaje_descuento_volumen(COALESCE(p_cantidad, 0));
    v_pc  := fn_porcentaje_descuento_cliente(p_id_cliente);
    v_iva := fn_iva_vigente();

    v_dv := ROUND(v_subtotal * v_pv / 100, 2);
    v_dc := ROUND((v_subtotal - v_dv) * v_pc / 100, 2);
    v_base := v_subtotal - v_dv - v_dc;
    v_imp := ROUND(v_base * v_iva, 2);

    RETURN QUERY
        SELECT v_pv, v_dv, v_pc, v_dc, v_base, v_iva, v_imp, v_base + v_imp;
END;
$$;

-- Totales de una cotización existente (agrega su detalle y aplica la fórmula).
CREATE OR REPLACE FUNCTION fn_calcular_totales_cotizacion(p_id_cotizacion INTEGER)
RETURNS TABLE (
    id_cotizacion     INTEGER,
    cantidad_total    INTEGER,
    subtotal_base     NUMERIC(12,2),
    pct_volumen       NUMERIC(5,2),
    descuento_volumen NUMERIC(12,2),
    pct_cliente       NUMERIC(5,2),
    descuento_cliente NUMERIC(12,2),
    base_imponible    NUMERIC(12,2),
    pct_iva           NUMERIC(6,4),
    impuesto          NUMERIC(12,2),
    total_final       NUMERIC(12,2)
)
LANGUAGE plpgsql STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
    v_subtotal NUMERIC(12,2);
    v_cantidad INTEGER;
    v_cliente  INTEGER;
    v_pv  NUMERIC(5,2);
    v_dv  NUMERIC(12,2);
    v_pc  NUMERIC(5,2);
    v_dc  NUMERIC(12,2);
    v_base NUMERIC(12,2);
    v_iva NUMERIC(6,4);
    v_imp NUMERIC(12,2);
    v_total NUMERIC(12,2);
BEGIN
    SELECT
        COALESCE(SUM(dc.cantidad), 0)::INTEGER,
        COALESCE(SUM(dc.subtotal_item), 0)::NUMERIC(12,2),
        c.id_cliente
    INTO v_cantidad, v_subtotal, v_cliente
    FROM cotizacion co
    JOIN solicitud s ON s.id_solicitud = co.id_solicitud
    JOIN cliente c ON c.id_cliente = s.id_cliente
    LEFT JOIN detalle_cotizacion dc ON dc.id_cotizacion = co.id_cotizacion
    WHERE co.id_cotizacion = p_id_cotizacion
    GROUP BY c.id_cliente;

    IF v_cliente IS NULL THEN
        RAISE EXCEPTION 'Cotización % no encontrada', p_id_cotizacion USING ERRCODE = 'LUM07';
    END IF;

    SELECT
        t.pct_volumen, t.descuento_volumen, t.pct_cliente, t.descuento_cliente,
        t.base_imponible, t.pct_iva, t.impuesto, t.total_final
    INTO v_pv, v_dv, v_pc, v_dc, v_base, v_iva, v_imp, v_total
    FROM fn_calcular_totales(v_subtotal, v_cantidad, v_cliente) AS t;

    RETURN QUERY
        SELECT p_id_cotizacion, v_cantidad, v_subtotal, v_pv, v_dv, v_pc, v_dc, v_base, v_iva, v_imp, v_total;
END;
$$;

-- Previsualización de totales a partir de una lista de ítems (sin guardar).
-- p_items: JSONB con el formato [{"id_libro": 3, "cantidad": 10}, ...]
CREATE OR REPLACE FUNCTION fn_calcular_totales_items(p_id_cliente INTEGER, p_items JSONB)
RETURNS TABLE (
    cantidad_total    INTEGER,
    subtotal_base     NUMERIC(12,2),
    pct_volumen       NUMERIC(5,2),
    descuento_volumen NUMERIC(12,2),
    pct_cliente       NUMERIC(5,2),
    descuento_cliente NUMERIC(12,2),
    base_imponible    NUMERIC(12,2),
    pct_iva           NUMERIC(6,4),
    impuesto          NUMERIC(12,2),
    total_final       NUMERIC(12,2)
)
LANGUAGE plpgsql STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
    v_subtotal NUMERIC(12,2);
    v_cantidad INTEGER;
    v_pv  NUMERIC(5,2);
    v_dv  NUMERIC(12,2);
    v_pc  NUMERIC(5,2);
    v_dc  NUMERIC(12,2);
    v_base NUMERIC(12,2);
    v_iva NUMERIC(6,4);
    v_imp NUMERIC(12,2);
    v_total NUMERIC(12,2);
BEGIN
    IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'La lista de ítems es inválida o está vacía' USING ERRCODE = 'LUM01';
    END IF;

    IF EXISTS (
        SELECT 1 FROM jsonb_to_recordset(p_items) AS x(id_libro INTEGER, cantidad INTEGER)
        WHERE x.id_libro IS NULL OR x.cantidad IS NULL OR x.cantidad <= 0
    ) THEN
        RAISE EXCEPTION 'Cada ítem debe tener id_libro y cantidad > 0' USING ERRCODE = 'LUM01';
    END IF;

    IF EXISTS (
        SELECT 1 FROM jsonb_to_recordset(p_items) AS x(id_libro INTEGER, cantidad INTEGER)
        LEFT JOIN libro l ON l.id_libro = x.id_libro
        WHERE l.id_libro IS NULL
    ) THEN
        RAISE EXCEPTION 'Uno o más libros no existen' USING ERRCODE = 'LUM07';
    END IF;

    SELECT
        COALESCE(SUM(x.cantidad), 0)::INTEGER,
        COALESCE(SUM(ROUND(l.precio_base * x.cantidad, 2)), 0)::NUMERIC(12,2)
    INTO v_cantidad, v_subtotal
    FROM jsonb_to_recordset(p_items) AS x(id_libro INTEGER, cantidad INTEGER)
    JOIN libro l ON l.id_libro = x.id_libro
    WHERE l.estado = TRUE;

    SELECT
        t.pct_volumen, t.descuento_volumen, t.pct_cliente, t.descuento_cliente,
        t.base_imponible, t.pct_iva, t.impuesto, t.total_final
    INTO v_pv, v_dv, v_pc, v_dc, v_base, v_iva, v_imp, v_total
    FROM fn_calcular_totales(v_subtotal, v_cantidad, p_id_cliente) AS t;

    RETURN QUERY
        SELECT v_cantidad, v_subtotal, v_pv, v_dv, v_pc, v_dc, v_base, v_iva, v_imp, v_total;
END;
$$;

-- ============================================================================
-- B. CONSULTAS COMPLEJAS
-- ============================================================================

-- Búsqueda de libros con filtros, stock, imagen principal y paginación.
CREATE OR REPLACE FUNCTION fn_buscar_libros(
    p_texto             VARCHAR DEFAULT NULL,
    p_id_categoria      INTEGER DEFAULT NULL,
    p_id_autor          INTEGER DEFAULT NULL,
    p_id_editorial      INTEGER DEFAULT NULL,
    p_id_formato        INTEGER DEFAULT NULL,
    p_precio_min        NUMERIC DEFAULT NULL,
    p_precio_max        NUMERIC DEFAULT NULL,
    p_solo_disponibles  BOOLEAN DEFAULT FALSE,
    p_limit             INTEGER DEFAULT 20,
    p_offset            INTEGER DEFAULT 0
)
RETURNS TABLE (
    id_libro      INTEGER,
    nombre        VARCHAR(200),
    sinopsis      VARCHAR(3000),
    isbn          VARCHAR(50),
    precio_base   NUMERIC(10,2),
    estado        BOOLEAN,
    categoria     VARCHAR(100),
    autor         VARCHAR(100),
    editorial     VARCHAR(150),
    formato       VARCHAR(50),
    stock         INTEGER,
    imagen_url    VARCHAR(500),
    total_count   BIGINT
)
LANGUAGE plpgsql STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
    v_limit  INTEGER := LEAST(GREATEST(COALESCE(p_limit, 20), 1), 100);
    v_offset INTEGER := GREATEST(COALESCE(p_offset, 0), 0);
BEGIN
    IF p_precio_min IS NOT NULL AND p_precio_max IS NOT NULL AND p_precio_min > p_precio_max THEN
        RAISE EXCEPTION 'El rango de precios es inválido' USING ERRCODE = 'LUM01';
    END IF;

    RETURN QUERY
        SELECT
            l.id_libro,
            l.nombre,
            l.sinopsis,
            l.isbn,
            l.precio_base,
            l.estado,
            cat.nombre,
            a.nombre,
            e.nombre,
            f.tipo,
            COALESCE(i.stock, 0)::INTEGER,
            img.imagen_url,
            COUNT(*) OVER()::BIGINT
        FROM libro l
        JOIN categoria cat ON cat.id_categoria = l.id_categoria
        JOIN editorial e    ON e.id_editorial = l.id_editorial
        JOIN formato f      ON f.id_formato = l.id_formato
        LEFT JOIN autor a   ON a.id_autor = l.id_autor
        LEFT JOIN inventario i ON i.id_libro = l.id_libro
        LEFT JOIN LATERAL (
            SELECT im.imagen_url
            FROM imagen im
            WHERE im.id_libro = l.id_libro
            ORDER BY im.id_imagen
            LIMIT 1
        ) img ON TRUE
        WHERE (p_texto IS NULL
               OR l.nombre ILIKE '%' || p_texto || '%'
               OR l.sinopsis ILIKE '%' || p_texto || '%'
               OR l.isbn ILIKE '%' || p_texto || '%')
          AND (p_id_categoria IS NULL OR l.id_categoria = p_id_categoria)
          AND (p_id_autor IS NULL     OR l.id_autor = p_id_autor)
          AND (p_id_editorial IS NULL OR l.id_editorial = p_id_editorial)
          AND (p_id_formato IS NULL   OR l.id_formato = p_id_formato)
          AND (p_precio_min IS NULL   OR l.precio_base >= p_precio_min)
          AND (p_precio_max IS NULL   OR l.precio_base <= p_precio_max)
          AND (COALESCE(p_solo_disponibles, FALSE) = FALSE
               OR (l.estado = TRUE AND COALESCE(i.stock, 0) > 0))
        ORDER BY l.nombre
        LIMIT v_limit OFFSET v_offset;
END;
$$;

-- Usuario con su rol y datos de cliente (para login + RBAC). No expone el hash
-- en la API: el servicio lo compara y nunca lo retorna al cliente HTTP.
CREATE OR REPLACE FUNCTION fn_obtener_usuario_por_username(p_usuario VARCHAR)
RETURNS TABLE (
    id_usuario        INTEGER,
    id_rol            INTEGER,
    rol               VARCHAR(50),
    usuario           VARCHAR(100),
    password_hash     VARCHAR(255),
    nombre            VARCHAR(100),
    apellido          VARCHAR(100),
    telefono          VARCHAR(255),
    direccion         VARCHAR(255),
    id_cliente        INTEGER,
    id_tipo_cliente   INTEGER,
    descuento_cliente NUMERIC(10,2)
)
LANGUAGE plpgsql STABLE
SET search_path = public, pg_temp
AS $$
BEGIN
    RETURN QUERY
        SELECT
            u.id_usuario,
            u.id_rol,
            r.nombre,
            u.usuario,
            u.password,
            u.nombre,
            u.apellido,
            u.telefono,
            u.direccion,
            c.id_cliente,
            c.id_tipo_cliente,
            COALESCE(tc.descuento, 0)
        FROM usuario u
        JOIN rol r ON r.id_rol = u.id_rol
        LEFT JOIN cliente c ON c.id_usuario = u.id_usuario
        LEFT JOIN tipo_cliente tc ON tc.id_tipo_cliente = c.id_tipo_cliente
        WHERE lower(u.usuario) = lower(p_usuario);
END;
$$;

-- Reporte de ventas agregado por día (excluye órdenes anuladas).
CREATE OR REPLACE FUNCTION fn_reporte_ventas(p_desde DATE, p_hasta DATE)
RETURNS TABLE (
    fecha              DATE,
    ordenes            BIGINT,
    subtotal_base      NUMERIC(12,2),
    descuento_volumen  NUMERIC(12,2),
    descuento_cliente  NUMERIC(12,2),
    impuesto           NUMERIC(12,2),
    total_final        NUMERIC(12,2)
)
LANGUAGE plpgsql STABLE
SET search_path = public, pg_temp
AS $$
BEGIN
    IF p_desde IS NULL OR p_hasta IS NULL OR p_desde > p_hasta THEN
        RAISE EXCEPTION 'Rango de fechas inválido' USING ERRCODE = 'LUM01';
    END IF;

    RETURN QUERY
        SELECT
            o.fecha::date,
            COUNT(*)::BIGINT,
            COALESCE(SUM(o.subtotal_base), 0)::NUMERIC(12,2),
            COALESCE(SUM(o.descuento_volumen), 0)::NUMERIC(12,2),
            COALESCE(SUM(o.descuento_cliente), 0)::NUMERIC(12,2),
            COALESCE(SUM(o.impuesto), 0)::NUMERIC(12,2),
            COALESCE(SUM(o.total_final), 0)::NUMERIC(12,2)
        FROM orden o
        WHERE o.estado <> 'Anulada'
          AND o.fecha::date BETWEEN p_desde AND p_hasta
        GROUP BY o.fecha::date
        ORDER BY o.fecha::date;
END;
$$;

-- ============================================================================
-- C. TRANSACCIONES ATÓMICAS
-- ============================================================================

-- Registro de un usuario + su perfil de cliente en una sola transacción.
CREATE OR REPLACE FUNCTION sp_crear_usuario_cliente(
    p_usuario        VARCHAR,
    p_password_hash  VARCHAR,
    p_nombre         VARCHAR,
    p_apellido       VARCHAR,
    p_telefono       VARCHAR DEFAULT NULL,
    p_direccion      VARCHAR DEFAULT NULL,
    p_nit            VARCHAR DEFAULT NULL,
    p_id_tipo_cliente INTEGER DEFAULT 1,
    p_id_rol         INTEGER DEFAULT 2
)
RETURNS TABLE (id_usuario INTEGER, id_cliente INTEGER)
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
    v_id_usuario INTEGER;
    v_id_cliente INTEGER;
BEGIN
    IF p_usuario IS NULL OR btrim(p_usuario) = '' THEN
        RAISE EXCEPTION 'El nombre de usuario es obligatorio' USING ERRCODE = 'LUM01';
    END IF;
    IF p_password_hash IS NULL OR btrim(p_password_hash) = '' THEN
        RAISE EXCEPTION 'El hash de contraseña es obligatorio' USING ERRCODE = 'LUM01';
    END IF;
    IF p_nombre IS NULL OR btrim(p_nombre) = '' OR p_apellido IS NULL OR btrim(p_apellido) = '' THEN
        RAISE EXCEPTION 'Nombre y apellido son obligatorios' USING ERRCODE = 'LUM01';
    END IF;

    IF EXISTS (SELECT 1 FROM usuario WHERE lower(usuario) = lower(p_usuario)) THEN
        RAISE EXCEPTION 'El nombre de usuario ya existe' USING ERRCODE = 'LUM08';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM rol WHERE id_rol = p_id_rol) THEN
        RAISE EXCEPTION 'El rol indicado no existe' USING ERRCODE = 'LUM07';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM tipo_cliente WHERE id_tipo_cliente = p_id_tipo_cliente) THEN
        RAISE EXCEPTION 'El tipo de cliente indicado no existe' USING ERRCODE = 'LUM07';
    END IF;

    INSERT INTO usuario (id_rol, usuario, password, nombre, apellido, telefono, direccion)
    VALUES (p_id_rol, p_usuario, p_password_hash, p_nombre, p_apellido, p_telefono, p_direccion)
    RETURNING id_usuario INTO v_id_usuario;

    INSERT INTO cliente (id_tipo_cliente, id_usuario, nit)
    VALUES (p_id_tipo_cliente, v_id_usuario, p_nit)
    RETURNING id_cliente INTO v_id_cliente;

    RETURN QUERY SELECT v_id_usuario, v_id_cliente;
END;
$$;

-- Creación de una solicitud con su detalle en una sola transacción.
CREATE OR REPLACE FUNCTION sp_crear_solicitud(
    p_id_cliente              INTEGER,
    p_fecha_requerida_entrega DATE,
    p_items                   JSONB
)
RETURNS INTEGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
    v_id_solicitud INTEGER;
    v_id_usuario   INTEGER;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM cliente WHERE id_cliente = p_id_cliente) THEN
        RAISE EXCEPTION 'El cliente no existe' USING ERRCODE = 'LUM07';
    END IF;

    IF p_fecha_requerida_entrega IS NULL OR p_fecha_requerida_entrega < CURRENT_DATE THEN
        RAISE EXCEPTION 'La fecha requerida de entrega no puede ser anterior a hoy' USING ERRCODE = 'LUM01';
    END IF;

    IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'Debe incluir al menos un ítem' USING ERRCODE = 'LUM01';
    END IF;

    IF EXISTS (
        SELECT 1 FROM jsonb_to_recordset(p_items) AS x(id_libro INTEGER, cantidad_estimada INTEGER)
        WHERE x.id_libro IS NULL OR x.cantidad_estimada IS NULL OR x.cantidad_estimada <= 0
    ) THEN
        RAISE EXCEPTION 'Cada ítem debe tener id_libro y cantidad_estimada > 0' USING ERRCODE = 'LUM01';
    END IF;

    IF EXISTS (
        SELECT 1 FROM jsonb_to_recordset(p_items) AS x(id_libro INTEGER, cantidad_estimada INTEGER)
        LEFT JOIN libro l ON l.id_libro = x.id_libro
        WHERE l.id_libro IS NULL OR l.estado = FALSE
    ) THEN
        RAISE EXCEPTION 'Uno o más libros no existen o están inactivos' USING ERRCODE = 'LUM07';
    END IF;

    SELECT id_usuario INTO v_id_usuario FROM cliente WHERE id_cliente = p_id_cliente;

    INSERT INTO solicitud (id_cliente, fecha_requerida_entrega, fecha_solicitud, estado)
    VALUES (p_id_cliente, p_fecha_requerida_entrega, (NOW() AT TIME ZONE 'UTC'), 'En Revisión')
    RETURNING id_solicitud INTO v_id_solicitud;

    INSERT INTO detalle_solicitud (id_solicitud, id_libro, cantidad_estimada, acabado_portada, tipo_papel)
    SELECT v_id_solicitud, x.id_libro, x.cantidad_estimada, x.acabado_portada, x.tipo_papel
    FROM jsonb_to_recordset(p_items) AS x(
        id_libro INTEGER, cantidad_estimada INTEGER, acabado_portada VARCHAR, tipo_papel VARCHAR
    );

    INSERT INTO historial_estado (entidad, id_entidad, estado_anterior, estado_nuevo, id_usuario)
    VALUES ('solicitud', v_id_solicitud, NULL, 'En Revisión', v_id_usuario);

    RETURN v_id_solicitud;
END;
$$;

-- Genera una cotización a precio de lista + IVA a partir de una solicitud.
CREATE OR REPLACE FUNCTION sp_generar_cotizacion(p_id_solicitud INTEGER, p_id_usuario INTEGER DEFAULT NULL)
RETURNS INTEGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
    v_solicitud solicitud%ROWTYPE;
    v_subtotal  NUMERIC(12,2);
    v_iva       NUMERIC(6,4);
    v_impuesto  NUMERIC(12,2);
    v_total     NUMERIC(12,2);
    v_id_cotizacion INTEGER;
BEGIN
    SELECT * INTO v_solicitud FROM solicitud WHERE id_solicitud = p_id_solicitud FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'La solicitud no existe' USING ERRCODE = 'LUM07';
    END IF;

    IF v_solicitud.estado NOT IN ('En Revisión', 'Aprobada') THEN
        RAISE EXCEPTION 'La solicitud no está en un estado que permita cotizar' USING ERRCODE = 'LUM03';
    END IF;

    IF EXISTS (SELECT 1 FROM cotizacion WHERE id_solicitud = p_id_solicitud AND estado <> 'Anulada') THEN
        RAISE EXCEPTION 'La solicitud ya tiene una cotización vigente' USING ERRCODE = 'LUM04';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM detalle_solicitud WHERE id_solicitud = p_id_solicitud) THEN
        RAISE EXCEPTION 'La solicitud no tiene ítems' USING ERRCODE = 'LUM01';
    END IF;

    IF EXISTS (
        SELECT 1 FROM detalle_solicitud ds JOIN libro l ON l.id_libro = ds.id_libro
        WHERE ds.id_solicitud = p_id_solicitud AND l.estado = FALSE
    ) THEN
        RAISE EXCEPTION 'La solicitud contiene libros inactivos' USING ERRCODE = 'LUM07';
    END IF;

    SELECT COALESCE(SUM(ROUND(l.precio_base * ds.cantidad_estimada, 2)), 0)::NUMERIC(12,2)
    INTO v_subtotal
    FROM detalle_solicitud ds
    JOIN libro l ON l.id_libro = ds.id_libro
    WHERE ds.id_solicitud = p_id_solicitud;

    v_iva := fn_iva_vigente();
    v_impuesto := ROUND(v_subtotal * v_iva, 2);
    v_total := v_subtotal + v_impuesto;

    INSERT INTO cotizacion (id_solicitud, subtotal, impuesto, total, estado, fecha)
    VALUES (p_id_solicitud, v_subtotal, v_impuesto, v_total, 'Pendiente Aceptación', (NOW() AT TIME ZONE 'UTC'))
    RETURNING id_cotizacion INTO v_id_cotizacion;

    INSERT INTO detalle_cotizacion (id_cotizacion, id_libro, cantidad, precio_unitario, subtotal_item)
    SELECT
        v_id_cotizacion, ds.id_libro, ds.cantidad_estimada,
        l.precio_base, ROUND(l.precio_base * ds.cantidad_estimada, 2)
    FROM detalle_solicitud ds
    JOIN libro l ON l.id_libro = ds.id_libro
    WHERE ds.id_solicitud = p_id_solicitud;

    UPDATE solicitud SET estado = 'Cotizada' WHERE id_solicitud = p_id_solicitud;

    INSERT INTO historial_estado (entidad, id_entidad, estado_anterior, estado_nuevo, id_usuario)
    VALUES ('solicitud', p_id_solicitud, v_solicitud.estado, 'Cotizada', p_id_usuario);
    INSERT INTO historial_estado (entidad, id_entidad, estado_anterior, estado_nuevo, id_usuario)
    VALUES ('cotizacion', v_id_cotizacion, NULL, 'Pendiente Aceptación', p_id_usuario);

    RETURN v_id_cotizacion;
END;
$$;

-- Convierte una cotización en orden de compra: aplica descuentos, descuenta
-- stock de forma atómica y registra todo. Si algo falla, revierte por completo.
CREATE OR REPLACE FUNCTION sp_convertir_cotizacion_en_orden(p_id_cotizacion INTEGER, p_id_usuario INTEGER)
RETURNS TABLE (
    id_orden          INTEGER,
    cantidad_total    INTEGER,
    subtotal_base     NUMERIC(12,2),
    pct_volumen       NUMERIC(5,2),
    descuento_volumen NUMERIC(12,2),
    pct_cliente       NUMERIC(5,2),
    descuento_cliente NUMERIC(12,2),
    base_imponible    NUMERIC(12,2),
    pct_iva           NUMERIC(6,4),
    impuesto          NUMERIC(12,2),
    total_final       NUMERIC(12,2)
)
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
    v_cot cotizacion%ROWTYPE;
    v_id_solicitud INTEGER;
    v_id_orden INTEGER;
    v_cantidad INTEGER;
    v_subtotal NUMERIC(12,2);
    v_pv NUMERIC(5,2);  v_dv NUMERIC(12,2);
    v_pc NUMERIC(5,2);  v_dc NUMERIC(12,2);
    v_base NUMERIC(12,2);
    v_iva NUMERIC(6,4); v_imp NUMERIC(12,2); v_total NUMERIC(12,2);
    v_libro_nombre VARCHAR(200);
    v_stock INTEGER;
    v_cantidad_fila INTEGER;
BEGIN
    -- 1. Autorización del usuario (Asesor de Ventas o Administrador).
    IF NOT EXISTS (
        SELECT 1 FROM usuario u JOIN rol r ON r.id_rol = u.id_rol
        WHERE u.id_usuario = p_id_usuario AND r.nombre IN ('Asesor de Ventas', 'Administrador')
    ) THEN
        RAISE EXCEPTION 'El usuario no tiene permisos para procesar órdenes' USING ERRCODE = 'LUM03';
    END IF;

    -- 2. Bloquear la cotización y validar su estado.
    SELECT * INTO v_cot FROM cotizacion WHERE id_cotizacion = p_id_cotizacion FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'La cotización no existe' USING ERRCODE = 'LUM07';
    END IF;

    IF v_cot.estado NOT IN ('Pendiente Aceptación', 'Aceptada') THEN
        RAISE EXCEPTION 'La cotización no está en un estado convertible (estado: %)', v_cot.estado USING ERRCODE = 'LUM03';
    END IF;

    IF EXISTS (SELECT 1 FROM orden WHERE id_cotizacion = p_id_cotizacion AND estado <> 'Anulada') THEN
        RAISE EXCEPTION 'La cotización ya fue convertida en una orden vigente' USING ERRCODE = 'LUM04';
    END IF;

    -- 3. Validar ítems.
    IF NOT EXISTS (SELECT 1 FROM detalle_cotizacion WHERE id_cotizacion = p_id_cotizacion) THEN
        RAISE EXCEPTION 'La cotización no tiene ítems' USING ERRCODE = 'LUM01';
    END IF;

    -- 4. Calcular totales (motor de descuentos).
    SELECT t.cantidad_total, t.subtotal_base, t.pct_volumen, t.descuento_volumen,
           t.pct_cliente, t.descuento_cliente, t.base_imponible, t.pct_iva,
           t.impuesto, t.total_final
    INTO v_cantidad, v_subtotal, v_pv, v_dv, v_pc, v_dc, v_base, v_iva, v_imp, v_total
    FROM fn_calcular_totales_cotizacion(p_id_cotizacion) AS t;

    -- 5. Bloquear inventario en orden determinista (evita deadlocks).
    PERFORM i.id_libro
    FROM inventario i
    JOIN detalle_cotizacion d ON d.id_libro = i.id_libro
    WHERE d.id_cotizacion = p_id_cotizacion
    ORDER BY i.id_libro
    FOR UPDATE OF i;

    -- 6. Validar que todos los libros tengan inventario.
    IF EXISTS (
        SELECT 1 FROM detalle_cotizacion d
        LEFT JOIN inventario i ON i.id_libro = d.id_libro
        WHERE d.id_cotizacion = p_id_cotizacion AND i.id_libro IS NULL
    ) THEN
        RAISE EXCEPTION 'Uno o más libros no tienen registro de inventario' USING ERRCODE = 'LUM07';
    END IF;

    -- 7. Validar stock (agrupado por libro).
    SELECT l.nombre, i.stock, SUM(d.cantidad)::INTEGER
    INTO v_libro_nombre, v_stock, v_cantidad_fila
    FROM detalle_cotizacion d
    JOIN libro l ON l.id_libro = d.id_libro
    JOIN inventario i ON i.id_libro = d.id_libro
    WHERE d.id_cotizacion = p_id_cotizacion
    GROUP BY l.nombre, i.stock
    HAVING i.stock < SUM(d.cantidad)
    ORDER BY l.nombre
    LIMIT 1;

    IF FOUND THEN
        RAISE EXCEPTION 'Stock insuficiente para "%" (disponible: %, solicitado: %)',
            v_libro_nombre, v_stock, v_cantidad_fila USING ERRCODE = 'LUM02';
    END IF;

    -- 8. Crear la orden.
    INSERT INTO orden (id_cotizacion, id_usuario, subtotal_base, descuento_volumen,
                       descuento_cliente, impuesto, total_final, estado, fecha)
    VALUES (p_id_cotizacion, p_id_usuario, v_subtotal, v_dv, v_dc, v_imp, v_total,
            'En Proceso', (NOW() AT TIME ZONE 'UTC'))
    RETURNING id_orden INTO v_id_orden;

    -- 9. Copiar el detalle.
    INSERT INTO detalle_orden (id_orden, id_libro, cantidad, precio_unitario, subtotal_item)
    SELECT v_id_orden, d.id_libro, d.cantidad, d.precio_unitario, d.subtotal_item
    FROM detalle_cotizacion d
    WHERE d.id_cotizacion = p_id_cotizacion;

    -- 10. Descontar stock.
    UPDATE inventario i
    SET stock = i.stock - d.cantidad
    FROM detalle_cotizacion d
    WHERE d.id_cotizacion = p_id_cotizacion AND i.id_libro = d.id_libro;

    -- 11. Registrar movimientos de inventario.
    INSERT INTO movimiento_inventario (id_libro, cantidad, stock_resultante, motivo, id_usuario, id_orden)
    SELECT i.id_libro, -d.cantidad, i.stock, 'Venta orden ' || v_id_orden, p_id_usuario, v_id_orden
    FROM detalle_cotizacion d
    JOIN inventario i ON i.id_libro = d.id_libro
    WHERE d.id_cotizacion = p_id_cotizacion;

    -- 12. Actualizar estados.
    UPDATE cotizacion SET estado = 'Procesada' WHERE id_cotizacion = p_id_cotizacion;

    SELECT s.id_solicitud INTO v_id_solicitud
    FROM solicitud s JOIN cotizacion c ON c.id_solicitud = s.id_solicitud
    WHERE c.id_cotizacion = p_id_cotizacion;

    UPDATE solicitud SET estado = 'Aprobada' WHERE id_solicitud = v_id_solicitud;

    INSERT INTO historial_estado (entidad, id_entidad, estado_anterior, estado_nuevo, id_usuario)
    VALUES ('cotizacion', p_id_cotizacion, v_cot.estado, 'Procesada', p_id_usuario);
    INSERT INTO historial_estado (entidad, id_entidad, estado_anterior, estado_nuevo, id_usuario)
    VALUES ('orden', v_id_orden, NULL, 'En Proceso', p_id_usuario);

    -- 13. Retornar totales.
    RETURN QUERY
        SELECT v_id_orden, v_cantidad, v_subtotal, v_pv, v_dv, v_pc, v_dc, v_base, v_iva, v_imp, v_total;
END;
$$;

-- Anula una orden en estado "En Proceso", restaurando el stock.
CREATE OR REPLACE FUNCTION sp_anular_orden(p_id_orden INTEGER, p_id_usuario INTEGER, p_motivo VARCHAR DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
    v_orden orden%ROWTYPE;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM usuario u JOIN rol r ON r.id_rol = u.id_rol
        WHERE u.id_usuario = p_id_usuario AND r.nombre IN ('Asesor de Ventas', 'Administrador')
    ) THEN
        RAISE EXCEPTION 'El usuario no tiene permisos para anular órdenes' USING ERRCODE = 'LUM03';
    END IF;

    SELECT * INTO v_orden FROM orden WHERE id_orden = p_id_orden FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'La orden no existe' USING ERRCODE = 'LUM07';
    END IF;

    IF v_orden.estado <> 'En Proceso' THEN
        RAISE EXCEPTION 'Solo se pueden anular órdenes en estado En Proceso (estado: %)', v_orden.estado USING ERRCODE = 'LUM03';
    END IF;

    UPDATE inventario i
    SET stock = i.stock + d.cantidad
    FROM detalle_orden d
    WHERE d.id_orden = p_id_orden AND i.id_libro = d.id_libro;

    INSERT INTO movimiento_inventario (id_libro, cantidad, stock_resultante, motivo, id_usuario, id_orden)
    SELECT i.id_libro, d.cantidad, i.stock, 'Anulación orden ' || p_id_orden, p_id_usuario, p_id_orden
    FROM detalle_orden d
    JOIN inventario i ON i.id_libro = d.id_libro
    WHERE d.id_orden = p_id_orden;

    UPDATE orden SET estado = 'Anulada' WHERE id_orden = p_id_orden;

    -- Liberar la cotización para permitir reconversión.
    UPDATE cotizacion SET estado = 'Aceptada' WHERE id_cotizacion = v_orden.id_cotizacion;

    INSERT INTO historial_estado (entidad, id_entidad, estado_anterior, estado_nuevo, id_usuario, motivo)
    VALUES ('orden', p_id_orden, v_orden.estado, 'Anulada', p_id_usuario, p_motivo);
END;
$$;

-- Ajuste atómico de inventario (entradas/salidas). Devuelve el stock resultante.
CREATE OR REPLACE FUNCTION sp_ajustar_inventario(
    p_id_libro   INTEGER,
    p_delta      INTEGER,
    p_id_usuario INTEGER DEFAULT NULL,
    p_motivo     VARCHAR DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
    v_stock INTEGER;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM libro WHERE id_libro = p_id_libro) THEN
        RAISE EXCEPTION 'El libro no existe' USING ERRCODE = 'LUM07';
    END IF;

    IF p_delta IS NULL OR p_delta = 0 THEN
        RAISE EXCEPTION 'El ajuste debe ser distinto de cero' USING ERRCODE = 'LUM01';
    END IF;

    IF p_delta < 0 AND NOT EXISTS (SELECT 1 FROM inventario WHERE id_libro = p_id_libro) THEN
        RAISE EXCEPTION 'No existe inventario para restar' USING ERRCODE = 'LUM02';
    END IF;

    INSERT INTO inventario (id_libro, stock)
    VALUES (p_id_libro, GREATEST(p_delta, 0))
    ON CONFLICT (id_libro) DO UPDATE SET stock = inventario.stock + p_delta
    RETURNING stock INTO v_stock;

    IF v_stock < 0 THEN
        RAISE EXCEPTION 'El ajuste dejaría stock negativo (resultante: %)', v_stock USING ERRCODE = 'LUM02';
    END IF;

    INSERT INTO movimiento_inventario (id_libro, cantidad, stock_resultante, motivo, id_usuario)
    VALUES (p_id_libro, p_delta, v_stock, p_motivo, p_id_usuario);

    RETURN v_stock;
END;
$$;

-- ============================================================================
-- D. GESTIÓN DE ROLES (RF-02)
-- ============================================================================

CREATE OR REPLACE FUNCTION sp_crear_rol(p_nombre VARCHAR)
RETURNS INTEGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
    v_id INTEGER;
    v_nombre VARCHAR := btrim(COALESCE(p_nombre, ''));
BEGIN
    IF v_nombre = '' THEN
        RAISE EXCEPTION 'El nombre del rol es obligatorio' USING ERRCODE = 'LUM01';
    END IF;

    IF EXISTS (SELECT 1 FROM rol WHERE lower(nombre) = lower(v_nombre)) THEN
        RAISE EXCEPTION 'El rol ya existe' USING ERRCODE = 'LUM08';
    END IF;

    INSERT INTO rol (nombre) VALUES (v_nombre) RETURNING id_rol INTO v_id;
    RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION sp_asignar_rol(p_id_usuario INTEGER, p_id_rol INTEGER, p_id_admin INTEGER DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
    v_rol_actual VARCHAR(50);
    v_rol_nuevo  VARCHAR(50);
    v_total_admin INTEGER;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM usuario WHERE id_usuario = p_id_usuario) THEN
        RAISE EXCEPTION 'El usuario no existe' USING ERRCODE = 'LUM07';
    END IF;

    SELECT r.nombre INTO v_rol_nuevo FROM rol r WHERE r.id_rol = p_id_rol;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'El rol no existe' USING ERRCODE = 'LUM07';
    END IF;

    SELECT r.nombre INTO v_rol_actual
    FROM usuario u JOIN rol r ON r.id_rol = u.id_rol
    WHERE u.id_usuario = p_id_usuario;

    IF v_rol_actual = 'Administrador' AND v_rol_nuevo <> 'Administrador' THEN
        SELECT COUNT(*) INTO v_total_admin
        FROM usuario u JOIN rol r ON r.id_rol = u.id_rol
        WHERE r.nombre = 'Administrador';

        IF v_total_admin <= 1 THEN
            RAISE EXCEPTION 'No se puede cambiar el rol del último administrador' USING ERRCODE = 'LUM05';
        END IF;
    END IF;

    UPDATE usuario SET id_rol = p_id_rol WHERE id_usuario = p_id_usuario;

    INSERT INTO historial_estado (entidad, id_entidad, estado_anterior, estado_nuevo, id_usuario)
    VALUES ('usuario', p_id_usuario, v_rol_actual, v_rol_nuevo, p_id_admin);
END;
$$;

CREATE OR REPLACE FUNCTION sp_eliminar_rol(p_id_rol INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM rol WHERE id_rol = p_id_rol) THEN
        RAISE EXCEPTION 'El rol no existe' USING ERRCODE = 'LUM07';
    END IF;

    IF EXISTS (SELECT 1 FROM usuario WHERE id_rol = p_id_rol) THEN
        RAISE EXCEPTION 'No se puede eliminar un rol con usuarios asignados' USING ERRCODE = 'LUM06';
    END IF;

    DELETE FROM rol WHERE id_rol = p_id_rol;
END;
$$;

-- ============================================================================
--  E. PRIVILEGIOS (post-creación)
-- ============================================================================
--  Aunque Creation ya define ALTER DEFAULT PRIVILEGES, este bloque garantiza
--  que las funciones actuales no queden expuestas a PostgREST (PUBLIC/anon).
--  Si se ejecuta en un PostgreSQL local sin los roles de Supabase, comentar
--  las líneas de anon/authenticated/service_role.
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT p.oid::regprocedure AS sig
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname ~ '^(fn|sp)_'
    LOOP
        EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', r.sig);
        EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon, authenticated', r.sig);
        EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
    END LOOP;
END;
$$;

-- ============================================================================
--  Fin de LuminaProcedures.sql
-- ============================================================================

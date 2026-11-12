-- ============================================================================
--  LuminaDB · Funciones y procedimientos (LuminaProcedures)
-- ============================================================================
--  Plataforma Editorial Multicanal — PostgreSQL / Supabase
--  PRERREQUISITO: LuminaProceduresCreation.sql ejecutado.
--
--  Convención: fn_* (lectura/cálculo, STABLE) · sp_* (escritura/transacción).
--  Todo como FUNCTION (no PROCEDURE) para integrar con TypeORM: SELECT * FROM fn(...).
--
--  SQLSTATE: LUM01 parámetro · LUM02 stock · LUM03 estado/permiso · LUM04 duplicado
--            LUM05 último admin · LUM06 en uso · LUM07 no encontrado · LUM08 duplicado
-- ============================================================================

-- ============================================================================
-- A. MOTOR DE DESCUENTOS (RF-03)
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_iva_vigente()
RETURNS NUMERIC(6,4) LANGUAGE plpgsql STABLE SET search_path = public, pg_temp AS $$
DECLARE v NUMERIC(6,4);
BEGIN
    SELECT valor INTO v FROM parametro_negocio WHERE clave = 'iva' AND vigente LIMIT 1;
    RETURN COALESCE(v, 0.12);
END $$;

CREATE OR REPLACE FUNCTION fn_porcentaje_descuento_volumen(p_cantidad INTEGER)
RETURNS NUMERIC(5,2) LANGUAGE plpgsql STABLE SET search_path = public, pg_temp AS $$
DECLARE v NUMERIC(5,2);
BEGIN
    IF p_cantidad IS NULL OR p_cantidad <= 0 THEN RETURN 0; END IF;
    SELECT porcentaje INTO v FROM regla_descuento_volumen
    WHERE vigente AND p_cantidad >= cantidad_min AND (cantidad_max IS NULL OR p_cantidad <= cantidad_max)
    ORDER BY cantidad_min DESC LIMIT 1;
    RETURN COALESCE(v, 0);
END $$;

CREATE OR REPLACE FUNCTION fn_porcentaje_descuento_cliente(p_id_cliente INTEGER)
RETURNS NUMERIC(5,2) LANGUAGE plpgsql STABLE SET search_path = public, pg_temp AS $$
DECLARE v NUMERIC(5,2);
BEGIN
    SELECT tc.descuento INTO v FROM cliente c JOIN tipo_cliente tc ON tc.id_tipo_cliente = c.id_tipo_cliente
    WHERE c.id_cliente = p_id_cliente;
    RETURN COALESCE(v, 0);
END $$;

-- Fórmula central: volumen → cliente → IVA.
CREATE OR REPLACE FUNCTION fn_calcular_totales(p_subtotal NUMERIC, p_cantidad INTEGER, p_id_cliente INTEGER)
RETURNS TABLE (
    pct_volumen NUMERIC(5,2), descuento_volumen NUMERIC(12,2),
    pct_cliente NUMERIC(5,2), descuento_cliente NUMERIC(12,2),
    base_imponible NUMERIC(12,2), pct_iva NUMERIC(6,4), impuesto NUMERIC(12,2), total_final NUMERIC(12,2)
) LANGUAGE plpgsql STABLE SET search_path = public, pg_temp AS $$
DECLARE
    s NUMERIC(12,2) := COALESCE(p_subtotal, 0);
    pv NUMERIC(5,2); dv NUMERIC(12,2); pc NUMERIC(5,2); dc NUMERIC(12,2);
    b NUMERIC(12,2); iv NUMERIC(6,4); im NUMERIC(12,2);
BEGIN
    IF s < 0 THEN RAISE EXCEPTION 'Subtotal inválido' USING ERRCODE = 'LUM01'; END IF;
    pv := fn_porcentaje_descuento_volumen(COALESCE(p_cantidad, 0));
    pc := fn_porcentaje_descuento_cliente(p_id_cliente);
    iv := fn_iva_vigente();
    dv := ROUND(s * pv / 100, 2);
    dc := ROUND((s - dv) * pc / 100, 2);
    b  := s - dv - dc;
    im := ROUND(b * iv, 2);
    RETURN QUERY SELECT pv, dv, pc, dc, b, iv, im, b + im;
END $$;

-- Totales a partir de una lista de ítems (para POST /api/orders/calculate).
CREATE OR REPLACE FUNCTION fn_calcular_totales_items(p_id_cliente INTEGER, p_items JSONB)
RETURNS TABLE (
    cantidad_total INTEGER, subtotal_base NUMERIC(12,2),
    pct_volumen NUMERIC(5,2), descuento_volumen NUMERIC(12,2),
    pct_cliente NUMERIC(5,2), descuento_cliente NUMERIC(12,2),
    base_imponible NUMERIC(12,2), pct_iva NUMERIC(6,4), impuesto NUMERIC(12,2), total_final NUMERIC(12,2)
) LANGUAGE plpgsql STABLE SET search_path = public, pg_temp AS $$
DECLARE
    qt INTEGER; sb NUMERIC(12,2);
    pv NUMERIC(5,2); dv NUMERIC(12,2); pc NUMERIC(5,2); dc NUMERIC(12,2);
    b NUMERIC(12,2); iv NUMERIC(6,4); im NUMERIC(12,2); tf NUMERIC(12,2);
BEGIN
    IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'Lista de ítems vacía' USING ERRCODE = 'LUM01';
    END IF;
    IF EXISTS (SELECT 1 FROM jsonb_to_recordset(p_items) AS x(id_libro INTEGER, cantidad INTEGER)
               WHERE x.id_libro IS NULL OR x.cantidad IS NULL OR x.cantidad <= 0) THEN
        RAISE EXCEPTION 'Cada ítem debe tener id_libro y cantidad > 0' USING ERRCODE = 'LUM01';
    END IF;

    SELECT COALESCE(SUM(x.cantidad),0)::INTEGER, COALESCE(SUM(ROUND(l.precio_base * x.cantidad, 2)),0)::NUMERIC(12,2)
    INTO qt, sb
    FROM jsonb_to_recordset(p_items) AS x(id_libro INTEGER, cantidad INTEGER)
    JOIN libro l ON l.id_libro = x.id_libro WHERE l.estado;

    SELECT t.pct_volumen, t.descuento_volumen, t.pct_cliente, t.descuento_cliente,
           t.base_imponible, t.pct_iva, t.impuesto, t.total_final
    INTO pv, dv, pc, dc, b, iv, im, tf
    FROM fn_calcular_totales(sb, qt, p_id_cliente) t;

    RETURN QUERY SELECT qt, sb, pv, dv, pc, dc, b, iv, im, tf;
END $$;

-- ============================================================================
-- B. CATÁLOGO (RF-01)
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_buscar_libros(
    p_texto VARCHAR DEFAULT NULL,
    p_categoria VARCHAR DEFAULT NULL,
    p_formato VARCHAR DEFAULT NULL,
    p_precio_min NUMERIC DEFAULT NULL,
    p_precio_max NUMERIC DEFAULT NULL,
    p_solo_disponibles BOOLEAN DEFAULT FALSE,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id_libro INTEGER, nombre VARCHAR(200), sinopsis VARCHAR(3000), isbn VARCHAR(50),
    precio_base NUMERIC(10,2), estado BOOLEAN,
    categoria VARCHAR(100), autor VARCHAR(100), editorial VARCHAR(150), formato VARCHAR(50),
    stock INTEGER, imagen_url VARCHAR(500),
    anio_edicion INTEGER, edicion VARCHAR(50), paginas INTEGER, idioma VARCHAR(50),
    total_count BIGINT
) LANGUAGE plpgsql STABLE SET search_path = public, pg_temp AS $$
DECLARE lim INTEGER := LEAST(GREATEST(COALESCE(p_limit,20),1),100); off INTEGER := GREATEST(COALESCE(p_offset,0),0);
BEGIN
    IF p_precio_min IS NOT NULL AND p_precio_max IS NOT NULL AND p_precio_min > p_precio_max THEN
        RAISE EXCEPTION 'Rango de precios inválido' USING ERRCODE = 'LUM01';
    END IF;
    RETURN QUERY
        SELECT l.id_libro, l.nombre, l.sinopsis, l.isbn, l.precio_base, l.estado,
               cat.nombre, a.nombre, e.nombre, f.tipo, COALESCE(i.stock,0)::INTEGER, img.imagen_url,
               l.anio_edicion, l.edicion, l.paginas, l.idioma, COUNT(*) OVER()::BIGINT
        FROM libro l
        JOIN categoria cat ON cat.id_categoria = l.id_categoria
        JOIN editorial e    ON e.id_editorial = l.id_editorial
        JOIN formato f      ON f.id_formato = l.id_formato
        LEFT JOIN autor a   ON a.id_autor = l.id_autor
        LEFT JOIN inventario i ON i.id_libro = l.id_libro
        LEFT JOIN LATERAL (SELECT im.imagen_url FROM imagen im WHERE im.id_libro = l.id_libro ORDER BY im.id_imagen LIMIT 1) img ON TRUE
        WHERE l.estado = TRUE
          AND (p_texto IS NULL OR l.nombre ILIKE '%'||p_texto||'%' OR l.isbn ILIKE '%'||p_texto||'%'
               OR a.nombre ILIKE '%'||p_texto||'%' OR e.nombre ILIKE '%'||p_texto||'%')
          AND (p_categoria IS NULL OR lower(cat.nombre) = lower(p_categoria))
          AND (p_formato IS NULL   OR lower(f.tipo) = lower(p_formato))
          AND (p_precio_min IS NULL   OR l.precio_base >= p_precio_min)
          AND (p_precio_max IS NULL   OR l.precio_base <= p_precio_max)
          AND (COALESCE(p_solo_disponibles, FALSE) = FALSE OR COALESCE(i.stock,0) > 0)
        ORDER BY l.nombre LIMIT lim OFFSET off;
END $$;

CREATE OR REPLACE FUNCTION fn_obtener_libro(p_id_libro INTEGER)
RETURNS TABLE (
    id_libro INTEGER, nombre VARCHAR(200), sinopsis VARCHAR(3000), isbn VARCHAR(50),
    precio_base NUMERIC(10,2), estado BOOLEAN,
    categoria VARCHAR(100), autor VARCHAR(100), editorial VARCHAR(150), formato VARCHAR(50),
    stock INTEGER, imagen_url VARCHAR(500),
    anio_edicion INTEGER, edicion VARCHAR(50), paginas INTEGER, idioma VARCHAR(50)
) LANGUAGE plpgsql STABLE SET search_path = public, pg_temp AS $$
BEGIN
    RETURN QUERY
        SELECT l.id_libro, l.nombre, l.sinopsis, l.isbn, l.precio_base, l.estado,
               cat.nombre, a.nombre, e.nombre, f.tipo, COALESCE(i.stock,0)::INTEGER, img.imagen_url,
               l.anio_edicion, l.edicion, l.paginas, l.idioma
        FROM libro l
        JOIN categoria cat ON cat.id_categoria = l.id_categoria
        JOIN editorial e    ON e.id_editorial = l.id_editorial
        JOIN formato f      ON f.id_formato = l.id_formato
        LEFT JOIN autor a   ON a.id_autor = l.id_autor
        LEFT JOIN inventario i ON i.id_libro = l.id_libro
        LEFT JOIN LATERAL (SELECT im.imagen_url FROM imagen im WHERE im.id_libro = l.id_libro ORDER BY im.id_imagen LIMIT 1) img ON TRUE
        WHERE l.id_libro = p_id_libro AND l.estado = TRUE;
END $$;

-- ============================================================================
-- C. AUTENTICACIÓN (RF-02)
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_obtener_usuario_por_username(p_usuario VARCHAR)
RETURNS TABLE (
    id_usuario INTEGER, id_rol INTEGER, rol VARCHAR(50), usuario VARCHAR(100), password_hash VARCHAR(255),
    nombre VARCHAR(100), apellido VARCHAR(100), telefono VARCHAR(255), direccion VARCHAR(255), estado BOOLEAN,
    id_cliente INTEGER, id_tipo_cliente INTEGER, tipo_cliente VARCHAR(50), descuento_cliente NUMERIC(10,2)
) LANGUAGE plpgsql STABLE SET search_path = public, pg_temp AS $$
BEGIN
    RETURN QUERY
        SELECT u.id_usuario, u.id_rol, r.nombre, u.usuario, u.password, u.nombre, u.apellido,
               u.telefono, u.direccion, u.estado, c.id_cliente, c.id_tipo_cliente, tc.tipo,
               COALESCE(tc.descuento, 0)
        FROM usuario u
        JOIN rol r ON r.id_rol = u.id_rol
        LEFT JOIN cliente c ON c.id_usuario = u.id_usuario
        LEFT JOIN tipo_cliente tc ON tc.id_tipo_cliente = c.id_tipo_cliente
        WHERE lower(u.usuario) = lower(p_usuario);
END $$;

CREATE OR REPLACE FUNCTION sp_crear_usuario_cliente(
    p_usuario VARCHAR, p_password_hash VARCHAR, p_nombre VARCHAR, p_apellido VARCHAR,
    p_telefono VARCHAR DEFAULT NULL, p_direccion VARCHAR DEFAULT NULL, p_nit VARCHAR DEFAULT NULL,
    p_id_rol INTEGER DEFAULT 2, p_id_tipo_cliente INTEGER DEFAULT NULL
)
RETURNS TABLE (id_usuario INTEGER, id_cliente INTEGER)
LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE
    uid INTEGER; cid INTEGER; rn VARCHAR(50); es_cliente BOOLEAN;
BEGIN
    IF p_usuario IS NULL OR btrim(p_usuario) = '' THEN RAISE EXCEPTION 'Email obligatorio' USING ERRCODE = 'LUM01'; END IF;
    IF p_password_hash IS NULL OR btrim(p_password_hash) = '' THEN RAISE EXCEPTION 'Hash obligatorio' USING ERRCODE = 'LUM01'; END IF;
    IF p_nombre IS NULL OR btrim(p_nombre) = '' THEN RAISE EXCEPTION 'Nombre obligatorio' USING ERRCODE = 'LUM01'; END IF;
    IF EXISTS (SELECT 1 FROM usuario WHERE lower(usuario) = lower(p_usuario)) THEN
        RAISE EXCEPTION 'El email ya está registrado' USING ERRCODE = 'LUM08';
    END IF;
    SELECT nombre INTO rn FROM rol WHERE id_rol = p_id_rol;
    IF NOT FOUND THEN RAISE EXCEPTION 'Rol inexistente' USING ERRCODE = 'LUM07'; END IF;
    es_cliente := rn IN ('Cliente Minorista', 'Cliente Institucional/Mayorista');
    IF es_cliente THEN
        IF p_id_tipo_cliente IS NULL THEN RAISE EXCEPTION 'Falta el tipo de cliente' USING ERRCODE = 'LUM01'; END IF;
        IF NOT EXISTS (SELECT 1 FROM tipo_cliente WHERE id_tipo_cliente = p_id_tipo_cliente) THEN
            RAISE EXCEPTION 'Tipo de cliente inexistente' USING ERRCODE = 'LUM07';
        END IF;
    END IF;

    INSERT INTO usuario (id_rol, usuario, password, nombre, apellido, telefono, direccion, estado)
    VALUES (p_id_rol, p_usuario, p_password_hash, p_nombre, COALESCE(p_apellido,''), p_telefono, p_direccion, TRUE)
    RETURNING id_usuario INTO uid;

    IF es_cliente THEN
        INSERT INTO cliente (id_tipo_cliente, id_usuario, nit) VALUES (p_id_tipo_cliente, uid, p_nit) RETURNING id_cliente INTO cid;
    ELSE
        cid := NULL;
    END IF;
    RETURN QUERY SELECT uid, cid;
END $$;

-- ============================================================================
-- D. ÓRDENES (RF-03)
-- ============================================================================

-- Obtiene (o crea) el perfil cliente asociado al usuario. Solo clientes compran.
CREATE OR REPLACE FUNCTION fn_cliente_de_usuario(p_id_usuario INTEGER)
RETURNS INTEGER LANGUAGE plpgsql STABLE SET search_path = public, pg_temp AS $$
DECLARE cid INTEGER;
BEGIN
    SELECT id_cliente INTO cid FROM cliente WHERE id_usuario = p_id_usuario;
    IF cid IS NULL THEN RAISE EXCEPTION 'El usuario no tiene perfil de cliente' USING ERRCODE = 'LUM03'; END IF;
    RETURN cid;
END $$;

-- Orden directa desde el carrito: genera solicitud + cotización + orden atómicamente.
CREATE OR REPLACE FUNCTION sp_crear_orden_directa(p_id_usuario INTEGER, p_items JSONB)
RETURNS INTEGER LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE
    cid INTEGER; sid INTEGER; cotid INTEGER; oid INTEGER;
    qt INTEGER; sb NUMERIC(12,2);
    pv NUMERIC(5,2); dv NUMERIC(12,2); pc NUMERIC(5,2); dc NUMERIC(12,2);
    b NUMERIC(12,2); iv NUMERIC(6,4); im NUMERIC(12,2); tf NUMERIC(12,2);
    libro_n VARCHAR(200); stock_i INTEGER; cant_f INTEGER;
BEGIN
    cid := fn_cliente_de_usuario(p_id_usuario);
    IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'Carrito vacío' USING ERRCODE = 'LUM01';
    END IF;

    -- Validar ítems y libros activos
    IF EXISTS (SELECT 1 FROM jsonb_to_recordset(p_items) AS x(id_libro INTEGER, cantidad INTEGER)
               WHERE x.id_libro IS NULL OR x.cantidad IS NULL OR x.cantidad <= 0) THEN
        RAISE EXCEPTION 'Ítems inválidos' USING ERRCODE = 'LUM01';
    END IF;
    IF EXISTS (SELECT 1 FROM jsonb_to_recordset(p_items) AS x(id_libro INTEGER, cantidad INTEGER)
               LEFT JOIN libro l ON l.id_libro = x.id_libro WHERE l.id_libro IS NULL OR l.estado = FALSE) THEN
        RAISE EXCEPTION 'Libro inexistente o inactivo' USING ERRCODE = 'LUM07';
    END IF;

    -- Cálculo
    SELECT COALESCE(SUM(x.cantidad),0)::INTEGER, COALESCE(SUM(ROUND(l.precio_base * x.cantidad,2)),0)::NUMERIC(12,2)
    INTO qt, sb FROM jsonb_to_recordset(p_items) AS x(id_libro INTEGER, cantidad INTEGER)
    JOIN libro l ON l.id_libro = x.id_libro;
    SELECT t.pct_volumen,t.descuento_volumen,t.pct_cliente,t.descuento_cliente,t.base_imponible,t.pct_iva,t.impuesto,t.total_final
    INTO pv,dv,pc,dc,b,iv,im,tf FROM fn_calcular_totales(sb, qt, cid) t;

    -- Bloquear inventario y validar stock
    PERFORM i.id_libro FROM inventario i JOIN jsonb_to_recordset(p_items) AS x(id_libro INTEGER, cantidad INTEGER) ON x.id_libro = i.id_libro
    ORDER BY i.id_libro FOR UPDATE OF i;
    IF EXISTS (SELECT 1 FROM jsonb_to_recordset(p_items) AS x(id_libro INTEGER, cantidad INTEGER)
               LEFT JOIN inventario i ON i.id_libro = x.id_libro WHERE i.id_libro IS NULL) THEN
        RAISE EXCEPTION 'Falta inventario para un libro' USING ERRCODE = 'LUM07';
    END IF;
    SELECT l.nombre, i.stock, SUM(x.cantidad)::INTEGER INTO libro_n, stock_i, cant_f
    FROM jsonb_to_recordset(p_items) AS x(id_libro INTEGER, cantidad INTEGER)
    JOIN libro l ON l.id_libro = x.id_libro JOIN inventario i ON i.id_libro = x.id_libro
    GROUP BY l.nombre, i.stock HAVING i.stock < SUM(x.cantidad) ORDER BY l.nombre LIMIT 1;
    IF FOUND THEN RAISE EXCEPTION 'Stock insuficiente para "%" (disponible %, solicitado %)', libro_n, stock_i, cant_f USING ERRCODE = 'LUM02'; END IF;

    -- Solicitud interna
    INSERT INTO solicitud (id_cliente, fecha_requerida_entrega, fecha_solicitud, estado)
    VALUES (cid, CURRENT_DATE, (NOW() AT TIME ZONE 'UTC'), 'Aprobada') RETURNING id_solicitud INTO sid;
    INSERT INTO detalle_solicitud (id_solicitud, id_libro, cantidad_estimada)
    SELECT sid, x.id_libro, x.cantidad FROM jsonb_to_recordset(p_items) AS x(id_libro INTEGER, cantidad INTEGER);

    -- Cotización interna
    INSERT INTO cotizacion (id_solicitud, subtotal, impuesto, total, estado, fecha, descuento_volumen, descuento_cliente)
    VALUES (sid, sb, im, tf, 'Procesada', (NOW() AT TIME ZONE 'UTC'), dv, dc) RETURNING id_cotizacion INTO cotid;
    INSERT INTO detalle_cotizacion (id_cotizacion, id_libro, cantidad, precio_unitario, subtotal_item)
    SELECT cotid, x.id_libro, x.cantidad, l.precio_base, ROUND(l.precio_base * x.cantidad, 2)
    FROM jsonb_to_recordset(p_items) AS x(id_libro INTEGER, cantidad INTEGER) JOIN libro l ON l.id_libro = x.id_libro;

    -- Orden
    INSERT INTO orden (id_cotizacion, id_usuario, subtotal_base, descuento_volumen, descuento_cliente, impuesto, total_final, estado, fecha)
    VALUES (cotid, p_id_usuario, sb, dv, dc, im, tf, 'En Proceso', (NOW() AT TIME ZONE 'UTC')) RETURNING id_orden INTO oid;
    INSERT INTO detalle_orden (id_orden, id_libro, cantidad, precio_unitario, subtotal_item)
    SELECT oid, x.id_libro, x.cantidad, l.precio_base, ROUND(l.precio_base * x.cantidad, 2)
    FROM jsonb_to_recordset(p_items) AS x(id_libro INTEGER, cantidad INTEGER) JOIN libro l ON l.id_libro = x.id_libro;

    -- Descontar stock + movimiento
    UPDATE inventario i SET stock = i.stock - x.cantidad
    FROM jsonb_to_recordset(p_items) AS x(id_libro INTEGER, cantidad INTEGER) WHERE i.id_libro = x.id_libro;
    INSERT INTO movimiento_inventario (id_libro, cantidad, stock_resultante, motivo, id_usuario, id_orden)
    SELECT i.id_libro, -x.cantidad, i.stock, 'Venta orden '||oid, p_id_usuario, oid
    FROM jsonb_to_recordset(p_items) AS x(id_libro INTEGER, cantidad INTEGER) JOIN inventario i ON i.id_libro = x.id_libro;

    INSERT INTO historial_estado (entidad, id_entidad, estado_anterior, estado_nuevo, id_usuario)
    VALUES ('orden', oid, NULL, 'En Proceso', p_id_usuario);
    RETURN oid;
END $$;

CREATE OR REPLACE FUNCTION fn_obtener_orden(p_id_orden INTEGER)
RETURNS TABLE (
    id_orden INTEGER, id_usuario INTEGER, usuario VARCHAR, subtotal_base NUMERIC(12,2),
    descuento_volumen NUMERIC(12,2), descuento_cliente NUMERIC(12,2), impuesto NUMERIC(12,2), total_final NUMERIC(12,2),
    estado VARCHAR, fecha TIMESTAMP, items JSONB
) LANGUAGE plpgsql STABLE SET search_path = public, pg_temp AS $$
BEGIN
    RETURN QUERY
        SELECT o.id_orden::INTEGER, o.id_usuario::INTEGER,
               concat_ws(' ', u.nombre, NULLIF(u.apellido, ''))::VARCHAR,
               o.subtotal_base::NUMERIC(12,2), o.descuento_volumen::NUMERIC(12,2),
               o.descuento_cliente::NUMERIC(12,2), o.impuesto::NUMERIC(12,2),
               o.total_final::NUMERIC(12,2), o.estado::VARCHAR, o.fecha::TIMESTAMP,
               COALESCE((SELECT jsonb_agg(jsonb_build_object('bookId', d.id_libro, 'title', l.nombre, 'quantity', d.cantidad, 'unitPrice', d.precio_unitario, 'subtotal', d.subtotal_item))
                         FROM detalle_orden d JOIN libro l ON l.id_libro = d.id_libro WHERE d.id_orden = o.id_orden), '[]'::jsonb)
        FROM orden o JOIN usuario u ON u.id_usuario = o.id_usuario WHERE o.id_orden = p_id_orden;
END $$;

CREATE OR REPLACE FUNCTION fn_listar_ordenes(p_estado VARCHAR DEFAULT NULL, p_id_usuario INTEGER DEFAULT NULL, p_limit INTEGER DEFAULT 20, p_offset INTEGER DEFAULT 0)
RETURNS TABLE (
    id_orden INTEGER, id_usuario INTEGER, usuario VARCHAR, subtotal_base NUMERIC(12,2),
    descuento_volumen NUMERIC(12,2), descuento_cliente NUMERIC(12,2), impuesto NUMERIC(12,2), total_final NUMERIC(12,2),
    estado VARCHAR, fecha TIMESTAMP, items JSONB, total_count BIGINT
) LANGUAGE plpgsql STABLE SET search_path = public, pg_temp AS $$
DECLARE lim INTEGER := LEAST(GREATEST(COALESCE(p_limit,20),1),100); off INTEGER := GREATEST(COALESCE(p_offset,0),0);
BEGIN
    RETURN QUERY
        SELECT o.id_orden::INTEGER, o.id_usuario::INTEGER,
               concat_ws(' ', u.nombre, NULLIF(u.apellido, ''))::VARCHAR,
               o.subtotal_base::NUMERIC(12,2), o.descuento_volumen::NUMERIC(12,2),
               o.descuento_cliente::NUMERIC(12,2), o.impuesto::NUMERIC(12,2),
               o.total_final::NUMERIC(12,2), o.estado::VARCHAR, o.fecha::TIMESTAMP,
               COALESCE((SELECT jsonb_agg(jsonb_build_object('bookId', d.id_libro, 'title', l.nombre, 'quantity', d.cantidad, 'unitPrice', d.precio_unitario, 'subtotal', d.subtotal_item))
                         FROM detalle_orden d JOIN libro l ON l.id_libro = d.id_libro WHERE d.id_orden = o.id_orden), '[]'::jsonb),
               COUNT(*) OVER()::BIGINT
        FROM orden o JOIN usuario u ON u.id_usuario = o.id_usuario
        WHERE (p_estado IS NULL OR o.estado = p_estado)
          AND (p_id_usuario IS NULL OR o.id_usuario = p_id_usuario)
        ORDER BY o.fecha DESC LIMIT lim OFFSET off;
END $$;

CREATE OR REPLACE FUNCTION sp_actualizar_estado_orden(p_id_orden INTEGER, p_estado VARCHAR, p_id_usuario INTEGER)
RETURNS VOID LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE v_orden orden%ROWTYPE;
BEGIN
    IF p_estado NOT IN ('En Proceso','Despachado','Entregado','Anulada') THEN
        RAISE EXCEPTION 'Estado inválido' USING ERRCODE = 'LUM01';
    END IF;
    SELECT * INTO v_orden FROM orden WHERE id_orden = p_id_orden FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Orden no encontrada' USING ERRCODE = 'LUM07'; END IF;
    UPDATE orden SET estado = p_estado WHERE id_orden = p_id_orden;
    INSERT INTO historial_estado (entidad, id_entidad, estado_anterior, estado_nuevo, id_usuario)
    VALUES ('orden', p_id_orden, v_orden.estado, p_estado, p_id_usuario);
END $$;

CREATE OR REPLACE FUNCTION sp_anular_orden(p_id_orden INTEGER, p_id_usuario INTEGER, p_motivo VARCHAR DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE v_orden orden%ROWTYPE;
BEGIN
    SELECT * INTO v_orden FROM orden WHERE id_orden = p_id_orden FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Orden no encontrada' USING ERRCODE = 'LUM07'; END IF;
    IF v_orden.estado IN ('Entregado','Anulada') THEN RAISE EXCEPTION 'Orden no anulable' USING ERRCODE = 'LUM03'; END IF;
    UPDATE inventario i SET stock = i.stock + d.cantidad FROM detalle_orden d WHERE d.id_orden = p_id_orden AND i.id_libro = d.id_libro;
    INSERT INTO movimiento_inventario (id_libro, cantidad, stock_resultante, motivo, id_usuario, id_orden)
    SELECT i.id_libro, d.cantidad, i.stock, 'Anulación orden '||p_id_orden, p_id_usuario, p_id_orden
    FROM detalle_orden d JOIN inventario i ON i.id_libro = d.id_libro WHERE d.id_orden = p_id_orden;
    UPDATE orden SET estado = 'Anulada' WHERE id_orden = p_id_orden;
    UPDATE cotizacion SET estado = 'Aceptada' WHERE id_cotizacion = v_orden.id_cotizacion;
    INSERT INTO historial_estado (entidad, id_entidad, estado_anterior, estado_nuevo, id_usuario, motivo)
    VALUES ('orden', p_id_orden, v_orden.estado, 'Anulada', p_id_usuario, p_motivo);
END $$;

-- ============================================================================
-- E. SOLICITUDES Y COTIZACIONES (RF-04)
-- ============================================================================

CREATE OR REPLACE FUNCTION sp_crear_solicitud(
    p_id_cliente INTEGER, p_fecha_requerida DATE, p_items JSONB DEFAULT NULL,
    p_titulo_personalizado VARCHAR DEFAULT NULL, p_notas VARCHAR DEFAULT NULL
)
RETURNS INTEGER LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE sid INTEGER; uid INTEGER; lid INTEGER;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM cliente WHERE id_cliente = p_id_cliente) THEN
        RAISE EXCEPTION 'Cliente no existe' USING ERRCODE = 'LUM07';
    END IF;
    IF p_fecha_requerida IS NULL OR p_fecha_requerida < CURRENT_DATE THEN
        RAISE EXCEPTION 'Fecha requerida inválida' USING ERRCODE = 'LUM01';
    END IF;

    INSERT INTO solicitud (id_cliente, fecha_requerida_entrega, fecha_solicitud, estado, titulo_personalizado, notas)
    VALUES (p_id_cliente, p_fecha_requerida, (NOW() AT TIME ZONE 'UTC'), 'Pendiente', p_titulo_personalizado, p_notas)
    RETURNING id_solicitud INTO sid;

    IF p_items IS NOT NULL AND jsonb_array_length(p_items) > 0 THEN
        IF EXISTS (SELECT 1 FROM jsonb_to_recordset(p_items) AS x(id_libro INTEGER, cantidad_estimada INTEGER, acabado_portada VARCHAR, tipo_papel VARCHAR)
                   WHERE x.id_libro IS NULL OR x.cantidad_estimada IS NULL OR x.cantidad_estimada <= 0) THEN
            RAISE EXCEPTION 'Ítems inválidos' USING ERRCODE = 'LUM01';
        END IF;
        INSERT INTO detalle_solicitud (id_solicitud, id_libro, cantidad_estimada, acabado_portada, tipo_papel)
        SELECT sid, x.id_libro, x.cantidad_estimada, x.acabado_portada, x.tipo_papel
        FROM jsonb_to_recordset(p_items) AS x(id_libro INTEGER, cantidad_estimada INTEGER, acabado_portada VARCHAR, tipo_papel VARCHAR);
    END IF;

    SELECT id_usuario INTO uid FROM cliente WHERE id_cliente = p_id_cliente;
    INSERT INTO historial_estado (entidad, id_entidad, estado_anterior, estado_nuevo, id_usuario)
    VALUES ('solicitud', sid, NULL, 'Pendiente', uid);
    RETURN sid;
END $$;

DROP FUNCTION IF EXISTS fn_listar_solicitudes(VARCHAR, INTEGER, INTEGER);

CREATE FUNCTION fn_listar_solicitudes(p_estado VARCHAR DEFAULT NULL, p_limit INTEGER DEFAULT 100, p_offset INTEGER DEFAULT 0)
RETURNS TABLE (
    id_solicitud INTEGER, id_cliente INTEGER, id_usuario INTEGER, cliente TEXT, cliente_email TEXT,
    titulo TEXT, id_libro INTEGER, cantidad_estimada INTEGER, acabado_portada TEXT, tipo_papel TEXT,
    fecha_requerida DATE, fecha_solicitud TIMESTAMP, estado TEXT, notas TEXT, total_count BIGINT
) LANGUAGE plpgsql STABLE SET search_path = public, pg_temp AS $$
DECLARE lim INTEGER := LEAST(GREATEST(COALESCE(p_limit,100),1),500); off INTEGER := GREATEST(COALESCE(p_offset,0),0);
BEGIN
    RETURN QUERY
        SELECT s.id_solicitud::INTEGER, s.id_cliente::INTEGER, u.id_usuario::INTEGER,
               concat_ws(' ', u.nombre, NULLIF(u.apellido, ''))::TEXT, u.usuario::TEXT,
               COALESCE(s.titulo_personalizado, l.nombre)::TEXT,
               d.id_libro::INTEGER, d.cantidad_estimada::INTEGER,
               d.acabado_portada::TEXT, d.tipo_papel::TEXT,
               s.fecha_requerida_entrega::DATE, s.fecha_solicitud::TIMESTAMP,
               s.estado::TEXT, s.notas::TEXT, COUNT(*) OVER()::BIGINT
        FROM solicitud s
        JOIN cliente c ON c.id_cliente = s.id_cliente
        JOIN usuario u ON u.id_usuario = c.id_usuario
        LEFT JOIN LATERAL (SELECT * FROM detalle_solicitud ds WHERE ds.id_solicitud = s.id_solicitud ORDER BY ds.id_detalle_solicitud LIMIT 1) d ON TRUE
        LEFT JOIN libro l ON l.id_libro = d.id_libro
        WHERE (p_estado IS NULL OR s.estado = p_estado)
        ORDER BY s.fecha_solicitud DESC LIMIT lim OFFSET off;
END $$;

CREATE OR REPLACE FUNCTION sp_actualizar_estado_solicitud(p_id_solicitud INTEGER, p_estado VARCHAR, p_id_usuario INTEGER)
RETURNS VOID LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE v_solicitud solicitud%ROWTYPE;
BEGIN
    IF p_estado NOT IN ('Pendiente','En Revisión','Cotizada','Aprobada','Rechazada','Anulada') THEN
        RAISE EXCEPTION 'Estado inválido' USING ERRCODE = 'LUM01';
    END IF;
    SELECT * INTO v_solicitud FROM solicitud WHERE id_solicitud = p_id_solicitud FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Solicitud no encontrada' USING ERRCODE = 'LUM07'; END IF;
    UPDATE solicitud SET estado = p_estado WHERE id_solicitud = p_id_solicitud;
    INSERT INTO historial_estado (entidad, id_entidad, estado_anterior, estado_nuevo, id_usuario)
    VALUES ('solicitud', p_id_solicitud, v_solicitud.estado, p_estado, p_id_usuario);
END $$;

-- Emite una cotización formal con el motor completo (volumen + cliente + IVA).
CREATE OR REPLACE FUNCTION sp_generar_cotizacion(p_id_solicitud INTEGER, p_id_usuario INTEGER, p_precio_unitario NUMERIC DEFAULT NULL, p_vigencia DATE DEFAULT NULL, p_notas VARCHAR DEFAULT NULL)
RETURNS INTEGER LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE
    v_solicitud solicitud%ROWTYPE; cid INTEGER; cotid INTEGER;
    qt INTEGER; sb NUMERIC(12,2);
    pv NUMERIC(5,2); dv NUMERIC(12,2); pc NUMERIC(5,2); dc NUMERIC(12,2);
    b NUMERIC(12,2); iv NUMERIC(6,4); im NUMERIC(12,2); tf NUMERIC(12,2);
BEGIN
    SELECT * INTO v_solicitud FROM solicitud WHERE id_solicitud = p_id_solicitud FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Solicitud no encontrada' USING ERRCODE = 'LUM07'; END IF;
    IF v_solicitud.estado IN ('Rechazada','Anulada') THEN RAISE EXCEPTION 'Solicitud no cotizable' USING ERRCODE = 'LUM03'; END IF;
    IF EXISTS (SELECT 1 FROM cotizacion WHERE id_solicitud = p_id_solicitud AND estado <> 'Anulada') THEN
        RAISE EXCEPTION 'La solicitud ya tiene cotización vigente' USING ERRCODE = 'LUM04';
    END IF;

    cid := v_solicitud.id_cliente;
    SELECT COALESCE(SUM(d.cantidad_estimada),0)::INTEGER INTO qt FROM detalle_solicitud d WHERE d.id_solicitud = p_id_solicitud;
    IF qt = 0 THEN RAISE EXCEPTION 'La solicitud no tiene ítems cotizables' USING ERRCODE = 'LUM01'; END IF;
    sb := ROUND(COALESCE(p_precio_unitario, 0) * qt, 2);
    IF sb <= 0 THEN RAISE EXCEPTION 'Precio unitario inválido' USING ERRCODE = 'LUM01'; END IF;

    SELECT t.pct_volumen,t.descuento_volumen,t.pct_cliente,t.descuento_cliente,t.base_imponible,t.pct_iva,t.impuesto,t.total_final
    INTO pv,dv,pc,dc,b,iv,im,tf FROM fn_calcular_totales(sb, qt, cid) t;

    INSERT INTO cotizacion (id_solicitud, id_usuario, subtotal, impuesto, total, estado, fecha, vigencia, notas, descuento_volumen, descuento_cliente)
    VALUES (p_id_solicitud, p_id_usuario, sb, im, tf, 'Pendiente Aceptación', (NOW() AT TIME ZONE 'UTC'), p_vigencia, p_notas, dv, dc)
    RETURNING id_cotizacion INTO cotid;

    INSERT INTO detalle_cotizacion (id_cotizacion, id_libro, cantidad, precio_unitario, subtotal_item)
    SELECT cotid, d.id_libro, d.cantidad_estimada, p_precio_unitario, ROUND(p_precio_unitario * d.cantidad_estimada, 2)
    FROM detalle_solicitud d WHERE d.id_solicitud = p_id_solicitud;

    UPDATE solicitud SET estado = 'Cotizada' WHERE id_solicitud = p_id_solicitud;
    INSERT INTO historial_estado (entidad, id_entidad, estado_anterior, estado_nuevo, id_usuario)
    VALUES ('solicitud', p_id_solicitud, v_solicitud.estado, 'Cotizada', p_id_usuario);
    INSERT INTO historial_estado (entidad, id_entidad, estado_anterior, estado_nuevo, id_usuario)
    VALUES ('cotizacion', cotid, NULL, 'Pendiente Aceptación', p_id_usuario);
    RETURN cotid;
END $$;

DROP FUNCTION IF EXISTS fn_listar_cotizaciones(INTEGER, INTEGER);

CREATE FUNCTION fn_listar_cotizaciones(p_limit INTEGER DEFAULT 100, p_offset INTEGER DEFAULT 0)
RETURNS TABLE (
    id_cotizacion INTEGER, id_solicitud INTEGER, id_usuario INTEGER, asesor TEXT,
    cliente TEXT, titulo TEXT, cantidad INTEGER, precio_unitario NUMERIC(12,2),
    subtotal NUMERIC(12,2), descuento_volumen NUMERIC(12,2), descuento_cliente NUMERIC(12,2),
    impuesto NUMERIC(12,2), total NUMERIC(12,2), vigencia DATE, notas TEXT, estado TEXT, fecha TIMESTAMP, total_count BIGINT
) LANGUAGE plpgsql STABLE SET search_path = public, pg_temp AS $$
DECLARE lim INTEGER := LEAST(GREATEST(COALESCE(p_limit,100),1),500); off INTEGER := GREATEST(COALESCE(p_offset,0),0);
BEGIN
    RETURN QUERY
        SELECT co.id_cotizacion::INTEGER, co.id_solicitud::INTEGER, co.id_usuario::INTEGER,
               concat_ws(' ', ua.nombre, NULLIF(ua.apellido, ''))::TEXT,
               concat_ws(' ', uc.nombre, NULLIF(uc.apellido, ''))::TEXT,
               COALESCE(s.titulo_personalizado, l.nombre)::TEXT,
               d.cantidad::INTEGER, d.precio_unitario::NUMERIC(12,2),
               co.subtotal::NUMERIC(12,2), co.descuento_volumen::NUMERIC(12,2),
               co.descuento_cliente::NUMERIC(12,2), co.impuesto::NUMERIC(12,2),
               co.total::NUMERIC(12,2), co.vigencia::DATE, co.notas::TEXT,
               co.estado::TEXT, co.fecha::TIMESTAMP, COUNT(*) OVER()::BIGINT
        FROM cotizacion co
        LEFT JOIN usuario ua ON ua.id_usuario = co.id_usuario
        JOIN solicitud s ON s.id_solicitud = co.id_solicitud
        JOIN cliente c ON c.id_cliente = s.id_cliente
        JOIN usuario uc ON uc.id_usuario = c.id_usuario
        LEFT JOIN LATERAL (SELECT * FROM detalle_cotizacion dc WHERE dc.id_cotizacion = co.id_cotizacion ORDER BY dc.id_detalle_cotizacion LIMIT 1) d ON TRUE
        LEFT JOIN libro l ON l.id_libro = d.id_libro
        ORDER BY co.fecha DESC LIMIT lim OFFSET off;
END $$;

CREATE OR REPLACE FUNCTION sp_actualizar_estado_cotizacion(p_id_cotizacion INTEGER, p_estado VARCHAR, p_id_usuario INTEGER)
RETURNS VOID LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE v_cotizacion cotizacion%ROWTYPE;
BEGIN
    IF p_estado NOT IN ('Pendiente Aceptación','Aceptada','Rechazada','Procesada','Anulada') THEN
        RAISE EXCEPTION 'Estado inválido' USING ERRCODE = 'LUM01';
    END IF;
    SELECT * INTO v_cotizacion FROM cotizacion WHERE id_cotizacion = p_id_cotizacion FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Cotización no encontrada' USING ERRCODE = 'LUM07'; END IF;
    UPDATE cotizacion SET estado = p_estado WHERE id_cotizacion = p_id_cotizacion;
    INSERT INTO historial_estado (entidad, id_entidad, estado_anterior, estado_nuevo, id_usuario)
    VALUES ('cotizacion', p_id_cotizacion, v_cotizacion.estado, p_estado, p_id_usuario);
END $$;

-- Convierte una cotización en orden (aplica descuentos y descuenta stock).
CREATE OR REPLACE FUNCTION sp_convertir_cotizacion_en_orden(p_id_cotizacion INTEGER, p_id_usuario INTEGER)
RETURNS INTEGER LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE
    v_cot cotizacion%ROWTYPE; sid INTEGER; oid INTEGER;
    libro_n VARCHAR(200); stock_i INTEGER; cant_f INTEGER;
BEGIN
    SELECT * INTO v_cot FROM cotizacion WHERE id_cotizacion = p_id_cotizacion FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Cotización no encontrada' USING ERRCODE = 'LUM07'; END IF;
    IF v_cot.estado NOT IN ('Pendiente Aceptación','Aceptada') THEN RAISE EXCEPTION 'Cotización no convertible' USING ERRCODE = 'LUM03'; END IF;
    IF EXISTS (SELECT 1 FROM orden WHERE id_cotizacion = p_id_cotizacion AND estado <> 'Anulada') THEN
        RAISE EXCEPTION 'Ya existe orden para esta cotización' USING ERRCODE = 'LUM04';
    END IF;

    PERFORM i.id_libro FROM inventario i JOIN detalle_cotizacion d ON d.id_libro = i.id_libro
    WHERE d.id_cotizacion = p_id_cotizacion ORDER BY i.id_libro FOR UPDATE OF i;
    IF EXISTS (SELECT 1 FROM detalle_cotizacion d LEFT JOIN inventario i ON i.id_libro = d.id_libro
               WHERE d.id_cotizacion = p_id_cotizacion AND i.id_libro IS NULL) THEN
        RAISE EXCEPTION 'Falta inventario' USING ERRCODE = 'LUM07';
    END IF;
    SELECT l.nombre, i.stock, SUM(d.cantidad)::INTEGER INTO libro_n, stock_i, cant_f
    FROM detalle_cotizacion d JOIN libro l ON l.id_libro = d.id_libro JOIN inventario i ON i.id_libro = d.id_libro
    WHERE d.id_cotizacion = p_id_cotizacion GROUP BY l.nombre, i.stock HAVING i.stock < SUM(d.cantidad) ORDER BY l.nombre LIMIT 1;
    IF FOUND THEN RAISE EXCEPTION 'Stock insuficiente para "%"', libro_n USING ERRCODE = 'LUM02'; END IF;

    INSERT INTO orden (id_cotizacion, id_usuario, subtotal_base, descuento_volumen, descuento_cliente, impuesto, total_final, estado, fecha)
    VALUES (p_id_cotizacion, p_id_usuario, v_cot.subtotal, v_cot.descuento_volumen, v_cot.descuento_cliente, v_cot.impuesto, v_cot.total, 'En Proceso', (NOW() AT TIME ZONE 'UTC'))
    RETURNING id_orden INTO oid;
    INSERT INTO detalle_orden (id_orden, id_libro, cantidad, precio_unitario, subtotal_item)
    SELECT oid, d.id_libro, d.cantidad, d.precio_unitario, d.subtotal_item FROM detalle_cotizacion d WHERE d.id_cotizacion = p_id_cotizacion;

    UPDATE inventario i SET stock = i.stock - d.cantidad FROM detalle_cotizacion d WHERE d.id_cotizacion = p_id_cotizacion AND i.id_libro = d.id_libro;
    INSERT INTO movimiento_inventario (id_libro, cantidad, stock_resultante, motivo, id_usuario, id_orden)
    SELECT i.id_libro, -d.cantidad, i.stock, 'Venta orden '||oid, p_id_usuario, oid
    FROM detalle_cotizacion d JOIN inventario i ON i.id_libro = d.id_libro WHERE d.id_cotizacion = p_id_cotizacion;

    SELECT id_solicitud INTO sid FROM cotizacion WHERE id_cotizacion = p_id_cotizacion;
    UPDATE cotizacion SET estado = 'Procesada' WHERE id_cotizacion = p_id_cotizacion;
    UPDATE solicitud SET estado = 'Aprobada' WHERE id_solicitud = sid;
    INSERT INTO historial_estado (entidad, id_entidad, estado_anterior, estado_nuevo, id_usuario)
    VALUES ('orden', oid, NULL, 'En Proceso', p_id_usuario);
    RETURN oid;
END $$;

-- ============================================================================
-- F. ADMINISTRACIÓN (RF-05)
-- ============================================================================

-- Upsert de un catálogo por nombre; devuelve el id.
CREATE OR REPLACE FUNCTION fn_upsert_catalogo(p_tabla TEXT, p_nombre VARCHAR)
RETURNS INTEGER LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE id INTEGER;
BEGIN
    IF p_tabla = 'categoria' THEN
        SELECT id_categoria INTO id FROM categoria WHERE lower(nombre) = lower(p_nombre);
        IF id IS NULL THEN INSERT INTO categoria (nombre, estado) VALUES (p_nombre, TRUE) RETURNING id_categoria INTO id; END IF;
    ELSIF p_tabla = 'autor' THEN
        SELECT id_autor INTO id FROM autor WHERE lower(nombre) = lower(p_nombre);
        IF id IS NULL THEN INSERT INTO autor (nombre) VALUES (p_nombre) RETURNING id_autor INTO id; END IF;
    ELSIF p_tabla = 'editorial' THEN
        SELECT id_editorial INTO id FROM editorial WHERE lower(nombre) = lower(p_nombre);
        IF id IS NULL THEN INSERT INTO editorial (nombre) VALUES (p_nombre) RETURNING id_editorial INTO id; END IF;
    ELSIF p_tabla = 'formato' THEN
        SELECT id_formato INTO id FROM formato WHERE lower(tipo) = lower(p_nombre);
        IF id IS NULL THEN INSERT INTO formato (tipo) VALUES (p_nombre) RETURNING id_formato INTO id; END IF;
    ELSE
        RAISE EXCEPTION 'Catálogo inválido' USING ERRCODE = 'LUM01';
    END IF;
    RETURN id;
END $$;

CREATE OR REPLACE FUNCTION sp_crear_libro(
    p_autor VARCHAR, p_editorial VARCHAR, p_categoria VARCHAR, p_formato VARCHAR,
    p_nombre VARCHAR, p_sinopsis VARCHAR, p_isbn VARCHAR, p_precio NUMERIC,
    p_anio INTEGER DEFAULT NULL, p_edicion VARCHAR DEFAULT NULL, p_paginas INTEGER DEFAULT NULL, p_idioma VARCHAR DEFAULT NULL,
    p_imagen_url VARCHAR DEFAULT NULL, p_stock INTEGER DEFAULT 0
)
RETURNS INTEGER LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE lid INTEGER; aid INTEGER; eid INTEGER; cid INTEGER; fid INTEGER;
BEGIN
    IF p_isbn IS NULL OR btrim(p_isbn) = '' THEN RAISE EXCEPTION 'ISBN obligatorio' USING ERRCODE = 'LUM01'; END IF;
    IF EXISTS (SELECT 1 FROM libro WHERE isbn = p_isbn) THEN RAISE EXCEPTION 'ISBN ya existe' USING ERRCODE = 'LUM08'; END IF;
    aid := fn_upsert_catalogo('autor', COALESCE(p_autor, 'Anónimo'));
    eid := fn_upsert_catalogo('editorial', COALESCE(p_editorial, 'LUMINA Editorial'));
    cid := fn_upsert_catalogo('categoria', COALESCE(p_categoria, 'General'));
    fid := fn_upsert_catalogo('formato', COALESCE(p_formato, 'tapa blanda'));

    INSERT INTO libro (id_categoria, id_editorial, id_formato, id_autor, nombre, sinopsis, isbn, precio_base, estado, anio_edicion, edicion, paginas, idioma)
    VALUES (cid, eid, fid, aid, p_nombre, p_sinopsis, p_isbn, COALESCE(p_precio,0), TRUE, p_anio, p_edicion, p_paginas, p_idioma)
    RETURNING id_libro INTO lid;

    INSERT INTO inventario (id_libro, stock) VALUES (lid, GREATEST(COALESCE(p_stock,0), 0));
    IF p_imagen_url IS NOT NULL THEN
        INSERT INTO imagen (id_libro, nombre_imagen, imagen_url) VALUES (lid, 'Portada - '||p_nombre, p_imagen_url);
    END IF;
    RETURN lid;
END $$;

CREATE OR REPLACE FUNCTION sp_actualizar_libro(
    p_id_libro INTEGER, p_autor VARCHAR, p_editorial VARCHAR, p_categoria VARCHAR, p_formato VARCHAR,
    p_nombre VARCHAR, p_sinopsis VARCHAR, p_isbn VARCHAR, p_precio NUMERIC,
    p_anio INTEGER DEFAULT NULL, p_edicion VARCHAR DEFAULT NULL, p_paginas INTEGER DEFAULT NULL, p_idioma VARCHAR DEFAULT NULL,
    p_imagen_url VARCHAR DEFAULT NULL, p_stock INTEGER DEFAULT NULL
)
RETURNS VOID LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE aid INTEGER; eid INTEGER; cid INTEGER; fid INTEGER;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM libro WHERE id_libro = p_id_libro) THEN RAISE EXCEPTION 'Libro no encontrado' USING ERRCODE = 'LUM07'; END IF;
    IF EXISTS (SELECT 1 FROM libro WHERE isbn = p_isbn AND id_libro <> p_id_libro) THEN RAISE EXCEPTION 'ISBN ya existe' USING ERRCODE = 'LUM08'; END IF;
    aid := fn_upsert_catalogo('autor', COALESCE(p_autor, 'Anónimo'));
    eid := fn_upsert_catalogo('editorial', COALESCE(p_editorial, 'LUMINA Editorial'));
    cid := fn_upsert_catalogo('categoria', COALESCE(p_categoria, 'General'));
    fid := fn_upsert_catalogo('formato', COALESCE(p_formato, 'tapa blanda'));

    UPDATE libro SET id_categoria = cid, id_editorial = eid, id_formato = fid, id_autor = aid,
        nombre = p_nombre, sinopsis = p_sinopsis, isbn = p_isbn, precio_base = COALESCE(p_precio,0),
        anio_edicion = p_anio, edicion = p_edicion, paginas = p_paginas, idioma = p_idioma
    WHERE id_libro = p_id_libro;

    IF p_stock IS NOT NULL THEN
        UPDATE inventario SET stock = GREATEST(p_stock,0) WHERE id_libro = p_id_libro;
    END IF;
    IF p_imagen_url IS NOT NULL THEN
        UPDATE imagen SET imagen_url = p_imagen_url WHERE id_libro = p_id_libro;
    END IF;
END $$;

CREATE OR REPLACE FUNCTION sp_eliminar_libro(p_id_libro INTEGER)
RETURNS VOID LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM libro WHERE id_libro = p_id_libro) THEN RAISE EXCEPTION 'Libro no encontrado' USING ERRCODE = 'LUM07'; END IF;
    UPDATE libro SET estado = FALSE WHERE id_libro = p_id_libro;
END $$;

CREATE OR REPLACE FUNCTION sp_ajustar_inventario(p_id_libro INTEGER, p_delta INTEGER, p_id_usuario INTEGER DEFAULT NULL, p_motivo VARCHAR DEFAULT NULL)
RETURNS INTEGER LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE st INTEGER;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM libro WHERE id_libro = p_id_libro) THEN RAISE EXCEPTION 'Libro no encontrado' USING ERRCODE = 'LUM07'; END IF;
    IF p_delta IS NULL OR p_delta = 0 THEN RAISE EXCEPTION 'Ajuste inválido' USING ERRCODE = 'LUM01'; END IF;
    IF p_delta < 0 AND NOT EXISTS (SELECT 1 FROM inventario WHERE id_libro = p_id_libro) THEN RAISE EXCEPTION 'Sin inventario' USING ERRCODE = 'LUM02'; END IF;
    INSERT INTO inventario (id_libro, stock) VALUES (p_id_libro, GREATEST(p_delta,0))
    ON CONFLICT (id_libro) DO UPDATE SET stock = inventario.stock + p_delta RETURNING stock INTO st;
    IF st < 0 THEN RAISE EXCEPTION 'Stock resultante negativo' USING ERRCODE = 'LUM02'; END IF;
    INSERT INTO movimiento_inventario (id_libro, cantidad, stock_resultante, motivo, id_usuario)
    VALUES (p_id_libro, p_delta, st, p_motivo, p_id_usuario);
    RETURN st;
END $$;

CREATE OR REPLACE FUNCTION sp_set_stock(p_id_libro INTEGER, p_stock INTEGER, p_id_usuario INTEGER DEFAULT NULL, p_motivo VARCHAR DEFAULT NULL)
RETURNS INTEGER LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE st INTEGER;
BEGIN
    IF p_stock < 0 THEN RAISE EXCEPTION 'Stock inválido' USING ERRCODE = 'LUM01'; END IF;
    INSERT INTO inventario (id_libro, stock) VALUES (p_id_libro, p_stock)
    ON CONFLICT (id_libro) DO UPDATE SET stock = p_stock RETURNING stock INTO st;
    INSERT INTO movimiento_inventario (id_libro, cantidad, stock_resultante, motivo, id_usuario)
    VALUES (p_id_libro, p_stock, st, COALESCE(p_motivo, 'Ajuste de stock'), p_id_usuario);
    RETURN st;
END $$;

CREATE OR REPLACE FUNCTION fn_listar_usuarios(p_limit INTEGER DEFAULT 100, p_offset INTEGER DEFAULT 0)
RETURNS TABLE (
    id_usuario INTEGER, id_rol INTEGER, rol VARCHAR(50), usuario VARCHAR(100), nombre VARCHAR(100),
    apellido VARCHAR(100), telefono VARCHAR(255), direccion VARCHAR(255), estado BOOLEAN,
    id_cliente INTEGER, total_count BIGINT
) LANGUAGE plpgsql STABLE SET search_path = public, pg_temp AS $$
DECLARE lim INTEGER := LEAST(GREATEST(COALESCE(p_limit,100),1),500); off INTEGER := GREATEST(COALESCE(p_offset,0),0);
BEGIN
    RETURN QUERY
        SELECT u.id_usuario, u.id_rol, r.nombre, u.usuario, u.nombre, u.apellido, u.telefono, u.direccion, u.estado,
               c.id_cliente, COUNT(*) OVER()::BIGINT
        FROM usuario u JOIN rol r ON r.id_rol = u.id_rol LEFT JOIN cliente c ON c.id_usuario = u.id_usuario
        ORDER BY u.id_usuario LIMIT lim OFFSET off;
END $$;

CREATE OR REPLACE FUNCTION sp_actualizar_estado_usuario(p_id_usuario INTEGER, p_estado BOOLEAN)
RETURNS VOID LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM usuario WHERE id_usuario = p_id_usuario) THEN RAISE EXCEPTION 'Usuario no encontrado' USING ERRCODE = 'LUM07'; END IF;
    UPDATE usuario SET estado = p_estado WHERE id_usuario = p_id_usuario;
END $$;

CREATE OR REPLACE FUNCTION sp_crear_rol(p_nombre VARCHAR)
RETURNS INTEGER LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE id INTEGER; nm VARCHAR := btrim(COALESCE(p_nombre,''));
BEGIN
    IF nm = '' THEN RAISE EXCEPTION 'Nombre obligatorio' USING ERRCODE = 'LUM01'; END IF;
    IF EXISTS (SELECT 1 FROM rol WHERE lower(nombre) = lower(nm)) THEN RAISE EXCEPTION 'Rol ya existe' USING ERRCODE = 'LUM08'; END IF;
    INSERT INTO rol (nombre) VALUES (nm) RETURNING id_rol INTO id;
    RETURN id;
END $$;

CREATE OR REPLACE FUNCTION sp_asignar_rol(p_id_usuario INTEGER, p_id_rol INTEGER, p_id_admin INTEGER DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE ra VARCHAR(50); rn VARCHAR(50); tot INTEGER;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM usuario WHERE id_usuario = p_id_usuario) THEN RAISE EXCEPTION 'Usuario no encontrado' USING ERRCODE = 'LUM07'; END IF;
    SELECT nombre INTO rn FROM rol WHERE id_rol = p_id_rol;
    IF NOT FOUND THEN RAISE EXCEPTION 'Rol no encontrado' USING ERRCODE = 'LUM07'; END IF;
    SELECT r.nombre INTO ra FROM usuario u JOIN rol r ON r.id_rol = u.id_rol WHERE u.id_usuario = p_id_usuario;
    IF ra = 'Administrador' AND rn <> 'Administrador' THEN
        SELECT COUNT(*) INTO tot FROM usuario u JOIN rol r ON r.id_rol = u.id_rol WHERE r.nombre = 'Administrador';
        IF tot <= 1 THEN RAISE EXCEPTION 'Último administrador' USING ERRCODE = 'LUM05'; END IF;
    END IF;
    UPDATE usuario SET id_rol = p_id_rol WHERE id_usuario = p_id_usuario;
    INSERT INTO historial_estado (entidad, id_entidad, estado_anterior, estado_nuevo, id_usuario)
    VALUES ('usuario', p_id_usuario, ra, rn, p_id_admin);
END $$;

CREATE OR REPLACE FUNCTION sp_eliminar_rol(p_id_rol INTEGER)
RETURNS VOID LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM rol WHERE id_rol = p_id_rol) THEN RAISE EXCEPTION 'Rol no encontrado' USING ERRCODE = 'LUM07'; END IF;
    IF EXISTS (SELECT 1 FROM usuario WHERE id_rol = p_id_rol) THEN RAISE EXCEPTION 'Rol en uso' USING ERRCODE = 'LUM06'; END IF;
    DELETE FROM rol WHERE id_rol = p_id_rol;
END $$;

CREATE OR REPLACE FUNCTION fn_metricas_admin()
RETURNS TABLE (
    total_titulos BIGINT, total_stock BIGINT, valor_inventario NUMERIC(14,2),
    alertas_stock BIGINT, total_ordenes BIGINT, total_solicitudes BIGINT, total_cotizaciones BIGINT
) LANGUAGE plpgsql STABLE SET search_path = public, pg_temp AS $$
DECLARE
    tt BIGINT; ts BIGINT; vi NUMERIC(14,2); al BIGINT; to_ BIGINT; tsol BIGINT; tcot BIGINT;
BEGIN
    SELECT COUNT(*), COALESCE(SUM(stock),0), COALESCE(SUM(l.precio_base * i.stock),0),
           COUNT(*) FILTER (WHERE stock <= 10)
    INTO tt, ts, vi, al FROM libro l JOIN inventario i ON i.id_libro = l.id_libro WHERE l.estado = TRUE;
    SELECT COUNT(*) INTO to_ FROM orden;
    SELECT COUNT(*) INTO tsol FROM solicitud;
    SELECT COUNT(*) INTO tcot FROM cotizacion;
    RETURN QUERY SELECT tt, ts, vi, al, to_, tsol, tcot;
END $$;

-- ============================================================================
--  Privilegios (post-creación)
-- ============================================================================
DO $$
DECLARE r RECORD;
BEGIN
    FOR r IN SELECT p.oid::regprocedure AS sig FROM pg_proc p
             JOIN pg_namespace n ON n.oid = p.pronamespace
             WHERE n.nspname = 'public' AND p.proname ~ '^(fn|sp)_' LOOP
        EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', r.sig);
        EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon, authenticated', r.sig);
        EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
    END LOOP;
END $$;

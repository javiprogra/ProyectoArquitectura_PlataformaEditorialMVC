-- ============================================================================
--  LuminaDB · Pruebas de autenticación (LuminaProceduresTests)
-- ============================================================================
--  Plataforma Editorial Multicanal — PostgreSQL / Supabase
--
--  PRERREQUISITOS:
--    1. Esquema base aplicado.
--    2. LuminaProceduresCreation.sql ejecutado (columna usuario.estado, roles,
--       tipos de cliente e índices).
--    3. LuminaProcedures.sql ejecutado (funciones fn_/sp_).
--    4. Usuarios semilla presentes: admin_master (rol Administrador),
--       cliente_marta (rol Cliente Minorista, tipo 1).
--
--  Cada prueba corre en su propia transacción y hace ROLLBACK, por lo que NO
--  deja datos. La comparación de contraseña usa pgcrypto.crypt() (compatible
--  con el bcryptjs que usa el servicio); en producción la hace AuthService.
--
--  Una prueba exitosa imprime "OK: ..." (RAISE NOTICE). Una falla lanza
--  EXCEPTION, lo que verás como error en el SQL Editor.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ----------------------------------------------------------------------------
-- TEST 1. Login lookup: administrador (rol, sin cliente, estado true)
-- ----------------------------------------------------------------------------
BEGIN;
DO $$
DECLARE r RECORD;
BEGIN
    SELECT * INTO r FROM fn_obtener_usuario_por_username('admin_master');
    IF r.id_usuario IS NULL THEN RAISE EXCEPTION 'FAIL: admin no encontrado'; END IF;
    IF r.rol <> 'Administrador' THEN RAISE EXCEPTION 'FAIL: rol incorrecto (%)', r.rol; END IF;
    IF r.estado IS NOT TRUE THEN RAISE EXCEPTION 'FAIL: estado no es true'; END IF;
    IF r.id_cliente IS NOT NULL THEN RAISE EXCEPTION 'FAIL: admin no debe tener cliente'; END IF;
    RAISE NOTICE 'OK: login lookup admin (Administrador, sin cliente, estado true)';
END $$;
ROLLBACK;

-- ----------------------------------------------------------------------------
-- TEST 2. Login lookup: cliente minorista (perfil + tipo + descuento)
-- ----------------------------------------------------------------------------
BEGIN;
DO $$
DECLARE r RECORD;
BEGIN
    SELECT * INTO r FROM fn_obtener_usuario_por_username('cliente_marta');
    IF r.id_usuario IS NULL THEN RAISE EXCEPTION 'FAIL: cliente no encontrado'; END IF;
    IF r.id_cliente IS NULL THEN RAISE EXCEPTION 'FAIL: cliente sin perfil'; END IF;
    IF r.id_tipo_cliente <> 1 THEN RAISE EXCEPTION 'FAIL: tipo incorrecto'; END IF;
    IF COALESCE(r.descuento_cliente, 0) <> 0 THEN RAISE EXCEPTION 'FAIL: descuento incorrecto'; END IF;
    RAISE NOTICE 'OK: login lookup cliente minorista (tipo 1, descuento 0)';
END $$;
ROLLBACK;

-- ----------------------------------------------------------------------------
-- TEST 3. Login lookup: usuario inexistente (0 filas)
-- ----------------------------------------------------------------------------
BEGIN;
DO $$
DECLARE v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count FROM fn_obtener_usuario_por_username('no_existe_usuario');
    IF v_count <> 0 THEN RAISE EXCEPTION 'FAIL: usuario inexistente devolvió filas'; END IF;
    RAISE NOTICE 'OK: usuario inexistente devuelve 0 filas';
END $$;
ROLLBACK;

-- ----------------------------------------------------------------------------
-- TEST 4. Registro: cliente minorista (crea usuario + cliente con tipo 1)
-- ----------------------------------------------------------------------------
BEGIN;
DO $$
DECLARE v_uid INTEGER; v_cid INTEGER; v_tipo INTEGER;
BEGIN
    SELECT id_usuario, id_cliente INTO v_uid, v_cid
    FROM sp_crear_usuario_cliente('test_minorista', 'hash', 'Test', 'Minorista', NULL, NULL, NULL, 2, 1);
    IF v_uid IS NULL THEN RAISE EXCEPTION 'FAIL: no se creó usuario'; END IF;
    IF v_cid IS NULL THEN RAISE EXCEPTION 'FAIL: no se creó cliente'; END IF;
    SELECT id_tipo_cliente INTO v_tipo FROM cliente WHERE id_cliente = v_cid;
    IF v_tipo <> 1 THEN RAISE EXCEPTION 'FAIL: tipo de cliente incorrecto'; END IF;
    RAISE NOTICE 'OK: registro cliente minorista (usuario %, cliente %, tipo %)', v_uid, v_cid, v_tipo;
END $$;
ROLLBACK;

-- ----------------------------------------------------------------------------
-- TEST 5. Registro: cliente institucional/mayorista (tipo 2)
-- ----------------------------------------------------------------------------
BEGIN;
DO $$
DECLARE v_uid INTEGER; v_cid INTEGER; v_tipo INTEGER;
BEGIN
    SELECT id_usuario, id_cliente INTO v_uid, v_cid
    FROM sp_crear_usuario_cliente('test_mayorista', 'hash', 'Test', 'Mayorista', NULL, NULL, '123456', 3, 2);
    IF v_cid IS NULL THEN RAISE EXCEPTION 'FAIL: no se creó cliente'; END IF;
    SELECT id_tipo_cliente INTO v_tipo FROM cliente WHERE id_cliente = v_cid;
    IF v_tipo <> 2 THEN RAISE EXCEPTION 'FAIL: tipo de cliente incorrecto'; END IF;
    RAISE NOTICE 'OK: registro cliente institucional/mayorista (tipo 2)';
END $$;
ROLLBACK;

-- ----------------------------------------------------------------------------
-- TEST 6. Registro: administrador SIN fila en cliente
-- ----------------------------------------------------------------------------
BEGIN;
DO $$
DECLARE v_uid INTEGER; v_cid INTEGER; v_count INTEGER;
BEGIN
    SELECT id_usuario, id_cliente INTO v_uid, v_cid
    FROM sp_crear_usuario_cliente('test_admin', 'hash', 'Test', 'Admin', NULL, NULL, NULL, 5, NULL);
    IF v_cid IS NOT NULL THEN RAISE EXCEPTION 'FAIL: admin no debe tener cliente'; END IF;
    SELECT COUNT(*) INTO v_count FROM cliente WHERE id_usuario = v_uid;
    IF v_count <> 0 THEN RAISE EXCEPTION 'FAIL: existe fila cliente para admin'; END IF;
    RAISE NOTICE 'OK: registro administrador sin fila en cliente';
END $$;
ROLLBACK;

-- ----------------------------------------------------------------------------
-- TEST 7. Registro: asesor de ventas SIN fila en cliente
-- ----------------------------------------------------------------------------
BEGIN;
DO $$
DECLARE v_uid INTEGER; v_cid INTEGER; v_count INTEGER;
BEGIN
    SELECT id_usuario, id_cliente INTO v_uid, v_cid
    FROM sp_crear_usuario_cliente('test_asesor', 'hash', 'Test', 'Asesor', NULL, NULL, NULL, 4, NULL);
    IF v_cid IS NOT NULL THEN RAISE EXCEPTION 'FAIL: asesor no debe tener cliente'; END IF;
    SELECT COUNT(*) INTO v_count FROM cliente WHERE id_usuario = v_uid;
    IF v_count <> 0 THEN RAISE EXCEPTION 'FAIL: existe fila cliente para asesor'; END IF;
    RAISE NOTICE 'OK: registro asesor sin fila en cliente';
END $$;
ROLLBACK;

-- ----------------------------------------------------------------------------
-- TEST 8. Registro: usuario duplicado (LUM08)
-- ----------------------------------------------------------------------------
BEGIN;
DO $$
BEGIN
    BEGIN
        PERFORM * FROM sp_crear_usuario_cliente('cliente_marta', 'hash', 'X', 'Y', NULL, NULL, NULL, 2, 1);
        RAISE EXCEPTION 'FAIL: no rechazó usuario duplicado';
    EXCEPTION WHEN SQLSTATE 'LUM08' THEN
        RAISE NOTICE 'OK: usuario duplicado rechazado (LUM08)';
    END;
END $$;
ROLLBACK;

-- ----------------------------------------------------------------------------
-- TEST 9. Registro: rol de cliente sin tipo de cliente (LUM01)
-- ----------------------------------------------------------------------------
BEGIN;
DO $$
BEGIN
    BEGIN
        PERFORM * FROM sp_crear_usuario_cliente('test_sin_tipo', 'hash', 'X', 'Y', NULL, NULL, NULL, 2, NULL);
        RAISE EXCEPTION 'FAIL: no rechazó cliente sin tipo';
    EXCEPTION WHEN SQLSTATE 'LUM01' THEN
        RAISE NOTICE 'OK: cliente sin tipo de cliente rechazado (LUM01)';
    END;
END $$;
ROLLBACK;

-- ----------------------------------------------------------------------------
-- TEST 10. Contraseña: verificación (correcta e incorrecta) con pgcrypto
-- ----------------------------------------------------------------------------
BEGIN;
DO $$
DECLARE v_uid INTEGER; v_cid INTEGER; v_hash VARCHAR;
BEGIN
    SELECT id_usuario, id_cliente INTO v_uid, v_cid
    FROM sp_crear_usuario_cliente('test_pwd', crypt('demo12345', gen_salt('bf', 10)), 'Test', 'Pwd', NULL, NULL, NULL, 2, 1);

    SELECT password INTO v_hash FROM usuario WHERE id_usuario = v_uid;

    IF crypt('demo12345', v_hash) <> v_hash THEN
        RAISE EXCEPTION 'FAIL: contraseña correcta no verificó';
    END IF;
    IF crypt('incorrecta', v_hash) = v_hash THEN
        RAISE EXCEPTION 'FAIL: contraseña incorrecta fue aceptada';
    END IF;

    RAISE NOTICE 'OK: verificación de contraseña (correcta e incorrecta)';
END $$;
ROLLBACK;

-- ----------------------------------------------------------------------------
-- TEST 11. Cuenta inactiva: estado=false se refleja en el login lookup
-- ----------------------------------------------------------------------------
BEGIN;
DO $$
DECLARE v_uid INTEGER; v_cid INTEGER; v_estado BOOLEAN;
BEGIN
    SELECT id_usuario, id_cliente INTO v_uid, v_cid
    FROM sp_crear_usuario_cliente('test_inactivo', 'hash', 'Test', 'Inactivo', NULL, NULL, NULL, 2, 1);

    UPDATE usuario SET estado = FALSE WHERE id_usuario = v_uid;

    SELECT estado INTO v_estado FROM fn_obtener_usuario_por_username('test_inactivo');
    IF v_estado IS NOT FALSE THEN RAISE EXCEPTION 'FAIL: estado no refleja inactividad'; END IF;

    RAISE NOTICE 'OK: cuenta inactiva reflejada en login lookup';
END $$;
ROLLBACK;

-- ============================================================================
--  Fin de las pruebas. Si no hubo EXCEPTION, todas imprimieron "OK: ...".
-- ============================================================================

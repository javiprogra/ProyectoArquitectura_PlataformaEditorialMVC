-- ============================================================================
--  LuminaDB · Bootstrap de configuración y semillas (LuminaProceduresCreation)
-- ============================================================================
--  Plataforma Editorial Multicanal — PostgreSQL / Supabase
--
--  PRERREQUISITO: esquema base "Base de Datos Proyecto Arquitectura I Script.sql"
--  (17 tablas) ya aplicado. Este script es IDEMPOTENTE (re-ejecutable).
--
--  Contenido:
--    1. Extensiones.
--    2. Alteraciones no destructivas (columnas adicionales exigidas por RF-01/04/06).
--    3. Tablas de configuración del negocio.
--    4. Tablas de auditoría.
--    5. Índices únicos y de rendimiento.
--    6. Restricciones CHECK de integridad y dominios de estado.
--    7. Semillas (roles, tipos de cliente, usuarios de prueba, catálogo).
--    8. Privilegios por defecto.
--
--  EJECUTAR en el SQL Editor de Supabase como rol postgres.
-- ============================================================================

-- 1. Extensiones ------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

-- 2. Alteraciones no destructivas -------------------------------------------
-- RF-01.3 (ficha técnica): datos bibliográficos adicionales de libro.
ALTER TABLE libro ADD COLUMN IF NOT EXISTS anio_edicion INTEGER;
ALTER TABLE libro ADD COLUMN IF NOT EXISTS edicion      VARCHAR(50);
ALTER TABLE libro ADD COLUMN IF NOT EXISTS paginas      INTEGER;
ALTER TABLE libro ADD COLUMN IF NOT EXISTS idioma       VARCHAR(50);

-- RF-02 (login/registro): vigencia de la cuenta.
ALTER TABLE usuario ADD COLUMN IF NOT EXISTS estado BOOLEAN NOT NULL DEFAULT TRUE;

-- RF-04 (solicitudes personalizadas): obra custom y especificaciones.
ALTER TABLE solicitud ADD COLUMN IF NOT EXISTS titulo_personalizado VARCHAR(200);
ALTER TABLE solicitud ADD COLUMN IF NOT EXISTS notas VARCHAR(1000);

-- RF-04/06 (cotización formal): asesor emisor, vigencia, notas y desglose de descuentos.
ALTER TABLE cotizacion ADD COLUMN IF NOT EXISTS id_usuario        INTEGER REFERENCES usuario(id_usuario);
ALTER TABLE cotizacion ADD COLUMN IF NOT EXISTS vigencia          DATE;
ALTER TABLE cotizacion ADD COLUMN IF NOT EXISTS notas             VARCHAR(1000);
ALTER TABLE cotizacion ADD COLUMN IF NOT EXISTS descuento_volumen NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE cotizacion ADD COLUMN IF NOT EXISTS descuento_cliente NUMERIC(12,2) NOT NULL DEFAULT 0;

-- 3. Tablas de configuración -------------------------------------------------
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

-- 4. Tablas de auditoría -----------------------------------------------------
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

CREATE INDEX IF NOT EXISTS ix_movimiento_inventario_libro ON movimiento_inventario (id_libro, fecha);
CREATE INDEX IF NOT EXISTS ix_movimiento_inventario_orden ON movimiento_inventario (id_orden);
CREATE INDEX IF NOT EXISTS ix_historial_estado_entidad ON historial_estado (entidad, id_entidad, fecha);

-- 5. Índices únicos y de rendimiento ----------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS ux_inventario_libro      ON inventario (id_libro);
CREATE UNIQUE INDEX IF NOT EXISTS ux_orden_cotizacion      ON orden (id_cotizacion);
CREATE UNIQUE INDEX IF NOT EXISTS ux_detalle_solicitud     ON detalle_solicitud (id_solicitud, id_libro);
CREATE UNIQUE INDEX IF NOT EXISTS ux_detalle_cotizacion    ON detalle_cotizacion (id_cotizacion, id_libro);
CREATE UNIQUE INDEX IF NOT EXISTS ux_detalle_orden         ON detalle_orden (id_orden, id_libro);
CREATE UNIQUE INDEX IF NOT EXISTS ux_rol_nombre            ON rol (lower(nombre));
CREATE UNIQUE INDEX IF NOT EXISTS ux_tipo_cliente_tipo     ON tipo_cliente (lower(tipo));
CREATE UNIQUE INDEX IF NOT EXISTS ux_categoria_nombre      ON categoria (lower(nombre));
CREATE UNIQUE INDEX IF NOT EXISTS ux_autor_nombre          ON autor (lower(nombre));
CREATE UNIQUE INDEX IF NOT EXISTS ux_editorial_nombre      ON editorial (lower(nombre));
CREATE UNIQUE INDEX IF NOT EXISTS ux_formato_tipo          ON formato (lower(tipo));
CREATE UNIQUE INDEX IF NOT EXISTS ux_usuario_lower         ON usuario (lower(usuario));

CREATE INDEX IF NOT EXISTS ix_usuario_rol              ON usuario (id_rol);
CREATE INDEX IF NOT EXISTS ix_cliente_tipo             ON cliente (id_tipo_cliente);
CREATE INDEX IF NOT EXISTS ix_cliente_usuario          ON cliente (id_usuario);
CREATE INDEX IF NOT EXISTS ix_libro_categoria          ON libro (id_categoria);
CREATE INDEX IF NOT EXISTS ix_libro_editorial          ON libro (id_editorial);
CREATE INDEX IF NOT EXISTS ix_libro_formato            ON libro (id_formato);
CREATE INDEX IF NOT EXISTS ix_libro_autor              ON libro (id_autor);
CREATE INDEX IF NOT EXISTS ix_imagen_libro             ON imagen (id_libro);
CREATE INDEX IF NOT EXISTS ix_solicitud_cliente        ON solicitud (id_cliente);
CREATE INDEX IF NOT EXISTS ix_detalle_solicitud_libro  ON detalle_solicitud (id_libro);
CREATE INDEX IF NOT EXISTS ix_cotizacion_solicitud     ON cotizacion (id_solicitud);
CREATE INDEX IF NOT EXISTS ix_cotizacion_usuario       ON cotizacion (id_usuario);
CREATE INDEX IF NOT EXISTS ix_detalle_cotizacion_libro ON detalle_cotizacion (id_libro);
CREATE INDEX IF NOT EXISTS ix_orden_usuario            ON orden (id_usuario);
CREATE INDEX IF NOT EXISTS ix_detalle_orden_libro      ON detalle_orden (id_libro);

CREATE INDEX IF NOT EXISTS ix_libro_nombre_trgm  ON libro USING gin (nombre gin_trgm_ops);
CREATE INDEX IF NOT EXISTS ix_orden_fecha        ON orden (fecha);
CREATE INDEX IF NOT EXISTS ix_cotizacion_fecha   ON cotizacion (fecha);
CREATE INDEX IF NOT EXISTS ix_solicitud_fecha    ON solicitud (fecha_solicitud);

-- 6. Restricciones CHECK ------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_inventario_stock') THEN
        ALTER TABLE inventario ADD CONSTRAINT ck_inventario_stock CHECK (stock >= 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_libro_precio') THEN
        ALTER TABLE libro ADD CONSTRAINT ck_libro_precio CHECK (precio_base >= 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_libro_biblio') THEN
        ALTER TABLE libro ADD CONSTRAINT ck_libro_biblio
            CHECK (anio_edicion IS NULL OR (anio_edicion >= 0 AND paginas >= 0));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_tipo_cliente_descuento') THEN
        ALTER TABLE tipo_cliente ADD CONSTRAINT ck_tipo_cliente_descuento CHECK (descuento BETWEEN 0 AND 100);
    END IF;
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
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_solicitud_fecha') THEN
        ALTER TABLE solicitud ADD CONSTRAINT ck_solicitud_fecha
            CHECK (fecha_requerida_entrega >= fecha_solicitud::date);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_cotizacion_montos') THEN
        ALTER TABLE cotizacion ADD CONSTRAINT ck_cotizacion_montos
            CHECK (subtotal >= 0 AND impuesto >= 0 AND total >= 0
                   AND descuento_volumen >= 0 AND descuento_cliente >= 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_orden_totales') THEN
        ALTER TABLE orden ADD CONSTRAINT ck_orden_totales
            CHECK (subtotal_base >= 0 AND descuento_volumen >= 0
                   AND descuento_cliente >= 0 AND impuesto >= 0 AND total_final >= 0
                   AND total_final = subtotal_base - descuento_volumen - descuento_cliente + impuesto);
    END IF;

    -- Dominios de estado (en español; el backend mapea a códigos EN)
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_solicitud_estado') THEN
        ALTER TABLE solicitud ADD CONSTRAINT ck_solicitud_estado
            CHECK (estado IN ('Pendiente', 'En Revisión', 'Cotizada', 'Aprobada', 'Rechazada', 'Anulada'));
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

-- 7. Semillas -----------------------------------------------------------------
-- 7.1 Parámetros de negocio
INSERT INTO parametro_negocio (clave, valor, descripcion)
VALUES ('iva', 0.12, 'IVA aplicado a cotizaciones y órdenes (12%)')
ON CONFLICT (clave) DO NOTHING;

-- 7.2 Tramos de descuento por volumen (regla oficial UMES)
INSERT INTO regla_descuento_volumen (cantidad_min, cantidad_max, porcentaje)
VALUES
    (1,  5,  0.00),
    (6,  20, 5.00),
    (21, 50, 10.00),
    (51, NULL, 15.00)
ON CONFLICT (cantidad_min) DO NOTHING;

-- 7.3 Roles del sistema
INSERT INTO rol (nombre)
SELECT v.nombre
FROM (VALUES
    ('Visitante'),
    ('Cliente Minorista'),
    ('Cliente Institucional/Mayorista'),
    ('Asesor de Ventas'),
    ('Administrador')
) AS v(nombre)
WHERE NOT EXISTS (SELECT 1 FROM rol r WHERE lower(r.nombre) = lower(v.nombre));

-- 7.4 Tipos de cliente
INSERT INTO tipo_cliente (tipo, descuento)
SELECT v.tipo, v.descuento
FROM (VALUES
    ('Cliente Minorista', 0.00),
    ('Cliente Institucional / Mayorista', 8.00)
) AS v(tipo, descuento)
WHERE NOT EXISTS (SELECT 1 FROM tipo_cliente tc WHERE lower(tc.tipo) = lower(v.tipo));

-- 7.5 Usuarios de prueba (usuario = email). Contraseñas documentadas en db/README.md
-- RF-02.1: Visitante es un estado anónimo, nunca una cuenta autenticable.
DELETE FROM usuario
WHERE lower(usuario) IN ('visitor@editorial.com', 'visitante@editorial.com');

INSERT INTO usuario (id_rol, usuario, password, nombre, apellido, telefono, direccion, estado)
SELECT (SELECT id_rol FROM rol WHERE lower(nombre) = 'administrador'),
       'admin@editorial.com',
       '$2a$10$nsPdwfUH9GS4XVQ/FFCPnucxq3F/Ma9bah64J8k6jj9Pwf9I3Pw..',
       'Admin', 'General', NULL, NULL, TRUE
WHERE NOT EXISTS (SELECT 1 FROM usuario WHERE lower(usuario) = 'admin@editorial.com');

INSERT INTO usuario (id_rol, usuario, password, nombre, apellido, telefono, direccion, estado)
SELECT (SELECT id_rol FROM rol WHERE lower(nombre) = 'asesor de ventas'),
       'asesor@editorial.com',
       '$2a$10$XmbOemCot4e42IEVMyWOM.DnpdxNioGeSWCPbHw5E9.VdB21qSonq',
       'Sofía', 'Asesor', NULL, NULL, TRUE
WHERE NOT EXISTS (SELECT 1 FROM usuario WHERE lower(usuario) = 'asesor@editorial.com');

INSERT INTO usuario (id_rol, usuario, password, nombre, apellido, telefono, direccion, estado)
SELECT (SELECT id_rol FROM rol WHERE lower(nombre) = 'cliente minorista'),
       'juan@gmail.com',
       '$2a$10$iiFkCibHsjaz6OgSxOA5heBdhVXg.8az4y/4awUwTwDJxBTYae4nK',
       'Juan', 'Pérez', NULL, NULL, TRUE
WHERE NOT EXISTS (SELECT 1 FROM usuario WHERE lower(usuario) = 'juan@gmail.com');

INSERT INTO usuario (id_rol, usuario, password, nombre, apellido, telefono, direccion, estado)
SELECT (SELECT id_rol FROM rol WHERE lower(nombre) = 'cliente institucional/mayorista'),
       'compras@umes.edu.gt',
       '$2a$10$uwwjexgISajNDm6quuiFVOlOrAdcBjsoEOAoo1GdgEotbuuxNQYJ.',
       'Universidad Mesoamericana', '', NULL, NULL, TRUE
WHERE NOT EXISTS (SELECT 1 FROM usuario WHERE lower(usuario) = 'compras@umes.edu.gt');

-- 7.6 Perfiles de cliente para los usuarios cliente
INSERT INTO cliente (id_tipo_cliente, id_usuario, nit)
SELECT (SELECT id_tipo_cliente FROM tipo_cliente WHERE lower(tipo) = 'cliente minorista'),
       (SELECT id_usuario FROM usuario WHERE lower(usuario) = 'juan@gmail.com'),
       NULL
WHERE NOT EXISTS (SELECT 1 FROM cliente c WHERE c.id_usuario = (SELECT id_usuario FROM usuario WHERE lower(usuario) = 'juan@gmail.com'));

INSERT INTO cliente (id_tipo_cliente, id_usuario, nit)
SELECT (SELECT id_tipo_cliente FROM tipo_cliente WHERE lower(tipo) = 'cliente institucional / mayorista'),
       (SELECT id_usuario FROM usuario WHERE lower(usuario) = 'compras@umes.edu.gt'),
       '000000-0'
WHERE NOT EXISTS (SELECT 1 FROM cliente c WHERE c.id_usuario = (SELECT id_usuario FROM usuario WHERE lower(usuario) = 'compras@umes.edu.gt'));

-- 7.7 Catálogos (géneros, autores, editoriales, formatos)
INSERT INTO categoria (nombre, estado)
SELECT v.nombre, TRUE
FROM (VALUES ('Tecnología'), ('Historia'), ('Ciencia'), ('Literatura'), ('Negocios'), ('Arte')) AS v(nombre)
WHERE NOT EXISTS (SELECT 1 FROM categoria c WHERE lower(c.nombre) = lower(v.nombre));

INSERT INTO autor (nombre, nacionalidad)
SELECT v.nombre, NULL
FROM (VALUES
    ('Carlos M. Albarrán'), ('Ana Lucía Fuentes'), ('Mario Roberto Morales'),
    ('Héctor J. Pineda'), ('Andrea Cáceres'), ('Humberto Ak''abal'),
    ('Estuardo Mendoza'), ('Claudia Ramírez'), ('Roberto Gómez'), ('Margaby S.')
) AS v(nombre)
WHERE NOT EXISTS (SELECT 1 FROM autor a WHERE lower(a.nombre) = lower(v.nombre));

INSERT INTO editorial (nombre)
SELECT v.nombre
FROM (VALUES ('LUMINA Editorial'), ('LUMINA Académica')) AS v(nombre)
WHERE NOT EXISTS (SELECT 1 FROM editorial e WHERE lower(e.nombre) = lower(v.nombre));

INSERT INTO formato (tipo)
SELECT v.tipo
FROM (VALUES ('tapa blanda'), ('tapa dura'), ('e-book')) AS v(tipo)
WHERE NOT EXISTS (SELECT 1 FROM formato f WHERE lower(f.tipo) = lower(v.tipo));

-- 7.8 Libros del catálogo (10, alineados con la Vista)
INSERT INTO libro (id_categoria, id_editorial, id_formato, id_autor, nombre, sinopsis, isbn, precio_base, estado, anio_edicion, edicion, paginas, idioma)
SELECT c.id_categoria, e.id_editorial, f.id_formato, a.id_autor, v.nombre, v.sinopsis, v.isbn, v.precio, TRUE, v.anio, v.edicion, v.paginas, v.idioma
FROM (VALUES
    ('Arquitectura de Software Moderna', 'Guía completa sobre patrones arquitectónicos y microservicios.', '978-99923-0-123-1', 150.00, 2024, '3a edición', 420, 'Español', 'Tecnología', 'LUMINA Editorial', 'tapa dura', 'Carlos M. Albarrán'),
    ('Compiladores: Principios y Práctica', 'Análisis léxico, sintáctico y construcción de árboles de sintaxis.', '978-99923-0-124-8', 210.00, 2023, '2a edición', 512, 'Español', 'Tecnología', 'LUMINA Académica', 'tapa blanda', 'Ana Lucía Fuentes'),
    ('Historia de Quetzaltenango', 'Recuento histórico, cultural y arquitectónico de la ciudad de los Altos.', '978-99923-0-125-5', 95.00, 2021, '1a edición', 368, 'Español', 'Historia', 'LUMINA Editorial', 'tapa dura', 'Mario Roberto Morales'),
    ('Matemáticas Discretas para Ingeniería', 'Lógica proposicional, teoría de conjuntos y grafos aplicados.', '978-99923-0-126-2', 180.00, 2025, '4a edición', 448, 'Español', 'Ciencia', 'LUMINA Académica', 'tapa blanda', 'Héctor J. Pineda'),
    ('Bases de Datos Avanzadas y T-SQL', 'Optimización de consultas relacionales y administración de motores.', '978-99923-0-127-9', 225.00, 2024, '2a edición', 560, 'Español', 'Tecnología', 'LUMINA Académica', 'e-book', 'Andrea Cáceres'),
    ('Poesía de la Tierra', 'Antología poética bilingüe inspirada en la cosmovisión maya.', '978-99923-0-128-6', 75.00, 2019, 'Edición bilingüe', 184, 'Español / K''iche''', 'Literatura', 'LUMINA Editorial', 'tapa blanda', 'Humberto Ak''abal'),
    ('Redes de Computadoras y Enrutamiento', 'Diseño de topologías LAN/WAN, protocolos IP y seguridad en pfSense.', '978-99923-0-129-3', 240.00, 2022, '3a edición', 496, 'Español', 'Tecnología', 'LUMINA Académica', 'tapa dura', 'Estuardo Mendoza'),
    ('Gestión de Proyectos con Scrum', 'Frameworks ágiles para el desarrollo de software en equipos multidisciplinarios.', '978-99923-0-130-9', 120.00, 2025, '1a edición', 312, 'Español', 'Negocios', 'LUMINA Editorial', 'e-book', 'Claudia Ramírez'),
    ('Estructuras de Datos en C# y Java', 'Implementación de pilas, colas, árboles binarios y tablas hash.', '978-99923-0-131-6', 190.00, 2023, '2a edición', 528, 'Español', 'Tecnología', 'LUMINA Académica', 'tapa blanda', 'Roberto Gómez'),
    ('Introducción al Diseño Gráfico Editorial', 'Maquetación, teoría del color, tipografía y flujos de preimpresión.', '978-99923-0-132-3', 165.00, 2024, '1a edición', 296, 'Español', 'Arte', 'LUMINA Editorial', 'tapa dura', 'Margaby S.')
) AS v(nombre, sinopsis, isbn, precio, anio, edicion, paginas, idioma, categoria_nombre, editorial_nombre, formato_tipo, autor_nombre)
JOIN categoria c ON lower(c.nombre) = lower(v.categoria_nombre)
JOIN editorial e ON lower(e.nombre) = lower(v.editorial_nombre)
JOIN formato f   ON lower(f.tipo) = lower(v.formato_tipo)
JOIN autor a     ON lower(a.nombre) = lower(v.autor_nombre)
WHERE NOT EXISTS (SELECT 1 FROM libro l WHERE l.isbn = v.isbn);

-- 7.9 Inventario inicial
INSERT INTO inventario (id_libro, stock)
SELECT l.id_libro, v.stock
FROM (VALUES
    ('978-99923-0-123-1', 45), ('978-99923-0-124-8', 12), ('978-99923-0-125-5', 8),
    ('978-99923-0-126-2', 30), ('978-99923-0-127-9', 55), ('978-99923-0-128-6', 20),
    ('978-99923-0-129-3', 15), ('978-99923-0-130-9', 40), ('978-99923-0-131-6', 25),
    ('978-99923-0-132-3', 18)
) AS v(isbn, stock)
JOIN libro l ON l.isbn = v.isbn
WHERE NOT EXISTS (SELECT 1 FROM inventario i WHERE i.id_libro = l.id_libro);

-- 7.10 Imágenes de portada
INSERT INTO imagen (id_libro, nombre_imagen, imagen_url)
SELECT l.id_libro, 'Portada - ' || l.nombre, v.url
FROM (VALUES
    ('978-99923-0-123-1', 'https://images.unsplash.com/photo-1532012197267-da84d127e765?auto=format&fit=crop&w=400&q=80'),
    ('978-99923-0-124-8', 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80'),
    ('978-99923-0-125-5', 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=400&q=80'),
    ('978-99923-0-126-2', 'https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=400&q=80'),
    ('978-99923-0-127-9', 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=400&q=80'),
    ('978-99923-0-128-6', 'https://images.unsplash.com/photo-1474932430478-367dbb6832c1?auto=format&fit=crop&w=400&q=80'),
    ('978-99923-0-129-3', 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=400&q=80'),
    ('978-99923-0-130-9', 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=400&q=80'),
    ('978-99923-0-131-6', 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=400&q=80'),
    ('978-99923-0-132-3', 'https://images.unsplash.com/photo-1626785774573-4b799315345d?auto=format&fit=crop&w=400&q=80')
) AS v(isbn, url)
JOIN libro l ON l.isbn = v.isbn
WHERE NOT EXISTS (SELECT 1 FROM imagen im WHERE im.id_libro = l.id_libro);

-- 8. Privilegios por defecto -------------------------------------------------
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO service_role;

-- ============================================================================
--  Fin. A continuación ejecutar "LuminaProcedures.sql".
-- ============================================================================

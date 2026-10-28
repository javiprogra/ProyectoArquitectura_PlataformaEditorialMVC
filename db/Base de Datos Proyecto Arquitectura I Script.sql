-- 1. Tablas independientes (Sin dependencias externas)
CREATE TABLE rol (
	id_rol SERIAL PRIMARY KEY,
	nombre VARCHAR(50) NOT NULL
);

CREATE TABLE tipo_cliente (
	id_tipo_cliente SERIAL PRIMARY KEY,
	tipo VARCHAR(50) NOT NULL,
	descuento DECIMAL(10,2) NOT NULL
);

CREATE TABLE categoria (
	id_categoria SERIAL PRIMARY KEY,
	nombre VARCHAR(100) NOT NULL,
	estado BOOLEAN NOT NULL
);

CREATE TABLE autor (
	id_autor SERIAL PRIMARY KEY,
	nombre VARCHAR(100) NOT NULL,
	nacionalidad VARCHAR(100)
);

CREATE TABLE editorial (
	id_editorial SERIAL PRIMARY KEY,
	nombre VARCHAR(150) NOT NULL,
	telefono VARCHAR(20),
	correo VARCHAR(150),
	direccion VARCHAR(255)
);

CREATE TABLE formato (
	id_formato SERIAL PRIMARY KEY,
	tipo VARCHAR(50) NOT NULL
);

-- 2. Tablas con dependencias de primer nivel
CREATE TABLE usuario (
	id_usuario SERIAL PRIMARY KEY,
	id_rol INTEGER NOT NULL,
	usuario VARCHAR(100) NOT NULL UNIQUE,
	password VARCHAR(255) NOT NULL,
	nombre VARCHAR(100) NOT NULL,
	apellido VARCHAR(100) NOT NULL,
	telefono VARCHAR(255),
	direccion VARCHAR(255),
	CONSTRAINT fk_usuario_rol FOREIGN KEY (id_rol) REFERENCES rol(id_rol)
);

CREATE TABLE cliente (
	id_cliente SERIAL PRIMARY KEY,
	id_tipo_cliente INTEGER NOT NULL,
	id_usuario INTEGER NOT NULL UNIQUE,
	nit VARCHAR(20),
	CONSTRAINT fk_cliente_tipo FOREIGN KEY (id_tipo_cliente) REFERENCES tipo_cliente(id_tipo_cliente),
	CONSTRAINT fk_cliente_usuario FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario)
);

CREATE TABLE libro (
	id_libro SERIAL PRIMARY KEY,
	id_categoria INTEGER NOT NULL,
	id_editorial INTEGER NOT NULL,
	id_formato INTEGER NOT NULL,
	id_autor INTEGER,
	nombre VARCHAR(200) NOT NULL,
	sinopsis VARCHAR(3000),
	isbn VARCHAR(50) NOT NULL UNIQUE,
	precio_base DECIMAL(10,2) NOT NULL,
	estado BOOLEAN NOT NULL,
	CONSTRAINT fk_libro_categoria FOREIGN KEY (id_categoria) REFERENCES categoria(id_categoria),
	CONSTRAINT fk_libro_editorial FOREIGN KEY (id_editorial) REFERENCES editorial(id_editorial),
	CONSTRAINT fk_libro_formato FOREIGN KEY (id_formato) REFERENCES formato(id_formato),
	CONSTRAINT fk_libro_autor FOREIGN KEY (id_autor) REFERENCES autor(id_autor)
);

-- 3. Tablas transaccionales y de inventario
CREATE TABLE inventario (
	id_inventario SERIAL PRIMARY KEY,
	id_libro INTEGER NOT NULL,
	stock INTEGER NOT NULL,
	CONSTRAINT fk_inventario_libro FOREIGN KEY (id_libro) REFERENCES libro(id_libro)
);

CREATE TABLE imagen (
	id_imagen SERIAL PRIMARY KEY,
	id_libro INTEGER NOT NULL,
	nombre_imagen VARCHAR(150) NOT NULL,
	imagen_url VARCHAR(500) NOT NULL,
	CONSTRAINT fk_imagen_libro FOREIGN KEY (id_libro) REFERENCES libro(id_libro)
);

CREATE TABLE solicitud (
	id_solicitud SERIAL PRIMARY KEY,
	id_cliente INTEGER NOT NULL,
	fecha_requerida_entrega DATE NOT NULL,
	fecha_solicitud TIMESTAMP NOT NULL,
	estado VARCHAR(50) NOT NULL,
	CONSTRAINT fk_solicitud_cliente FOREIGN KEY (id_cliente) REFERENCES cliente(id_cliente)
);

CREATE TABLE detalle_solicitud (
	id_detalle_solicitud SERIAL PRIMARY KEY,
	id_solicitud INTEGER NOT NULL,
	id_libro INTEGER NOT NULL,
	cantidad_estimada INTEGER NOT NULL,
	acabado_portada VARCHAR(50),
	tipo_papel VARCHAR(50),
	CONSTRAINT fk_det_solicitud FOREIGN KEY (id_solicitud) REFERENCES solicitud(id_solicitud),
	CONSTRAINT fk_det_solicitud_libro FOREIGN KEY (id_libro) REFERENCES libro(id_libro)
);

CREATE TABLE cotizacion (
	id_cotizacion SERIAL PRIMARY KEY,
	id_solicitud INTEGER NOT NULL,
	subtotal DECIMAL(10,2) NOT NULL,
	impuesto DECIMAL(10,2) NOT NULL,
	total DECIMAL(10,2) NOT NULL,
	estado VARCHAR(50) NOT NULL,
	fecha TIMESTAMP NOT NULL,
	CONSTRAINT fk_cotizacion_solicitud FOREIGN KEY (id_solicitud) REFERENCES solicitud(id_solicitud)
);

CREATE TABLE detalle_cotizacion (
	id_detalle_cotizacion SERIAL PRIMARY KEY,
	id_cotizacion INTEGER NOT NULL,
	id_libro INTEGER NOT NULL,
	cantidad INTEGER NOT NULL,
	precio_unitario DECIMAL(10,2) NOT NULL,
	subtotal_item DECIMAL(10,2) NOT NULL,
	CONSTRAINT fk_det_cotizacion FOREIGN KEY (id_cotizacion) REFERENCES cotizacion(id_cotizacion),
	CONSTRAINT fk_det_cotizacion_libro FOREIGN KEY (id_libro) REFERENCES libro(id_libro)
);

CREATE TABLE orden (
	id_orden SERIAL PRIMARY KEY,
	id_cotizacion INTEGER NOT NULL,
	id_usuario INTEGER NOT NULL,
	subtotal_base DECIMAL(10,2) NOT NULL,
	descuento_volumen DECIMAL(10,2) NOT NULL,
	descuento_cliente DECIMAL(10,2) NOT NULL,
	impuesto DECIMAL(10,2) NOT NULL,
	total_final DECIMAL(10,2) NOT NULL,
	estado VARCHAR(50) NOT NULL,
	fecha TIMESTAMP NOT NULL,
	CONSTRAINT fk_orden_cotizacion FOREIGN KEY (id_cotizacion) REFERENCES cotizacion(id_cotizacion),
	CONSTRAINT fk_orden_usuario FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario)
);

CREATE TABLE detalle_orden (
	id_detalle_orden SERIAL PRIMARY KEY,
	id_orden INTEGER NOT NULL,
	id_libro INTEGER NOT NULL,
	cantidad INTEGER NOT NULL,
	precio_unitario DECIMAL(10,2) NOT NULL,
	subtotal_item DECIMAL(10,2) NOT NULL,
	CONSTRAINT fk_det_orden FOREIGN KEY (id_orden) REFERENCES orden(id_orden),
	CONSTRAINT fk_det_orden_libro FOREIGN KEY (id_libro) REFERENCES libro(id_libro)
);

CREATE TABLE [Rol] (
	[id_rol] INTEGER NOT NULL IDENTITY,
	[nombre] VARCHAR(50) NOT NULL,
	PRIMARY KEY([id_rol])
);
GO

CREATE TABLE [TipoCliente] (
	[id_tipoCliente] INTEGER NOT NULL IDENTITY,
	[tipo] VARCHAR(50) NOT NULL,
	PRIMARY KEY([id_tipoCliente])
);
GO

CREATE TABLE [Categoria] (
	[id_categoria] INTEGER NOT NULL IDENTITY,
	[nombre] VARCHAR(100) NOT NULL,
	[estado] BIT NOT NULL,
	PRIMARY KEY([id_categoria])
);
GO

CREATE TABLE [Autor] (
	[id_autor] INTEGER NOT NULL IDENTITY,
	[nombre] VARCHAR(100) NOT NULL,
	[nacionalidad] VARCHAR(100),
	PRIMARY KEY([id_autor])
);
GO

CREATE TABLE [Editorial] (
	[id_editorial] INTEGER NOT NULL IDENTITY,
	[nombre] VARCHAR(150) NOT NULL,
	[telefono] VARCHAR(20),
	[correo] VARCHAR(150),
	[direccion] VARCHAR(255),
	PRIMARY KEY([id_editorial])
);
GO

CREATE TABLE [Formato] (
	[id_formato] INTEGER NOT NULL IDENTITY,
	[tipo] VARCHAR(50) NOT NULL,
	PRIMARY KEY([id_formato])
);
GO

CREATE TABLE [Usuario] (
	[id_usuario] INTEGER NOT NULL IDENTITY,
	[id_rol] INTEGER NOT NULL,
	[id_tipoCliente] INTEGER,
	[usuario] VARCHAR(100) NOT NULL UNIQUE,
	[password] VARCHAR(255) NOT NULL,
	[nombre] VARCHAR(100) NOT NULL,
	[apellido] VARCHAR(100) NOT NULL,
	[telefono] VARCHAR(255),
	[direccion] VARCHAR(255),
	PRIMARY KEY([id_usuario])
);
GO

CREATE TABLE [Libro] (
	[id_libro] INTEGER NOT NULL IDENTITY,
	[id_categoria] INTEGER NOT NULL,
	[id_autor] INTEGER NOT NULL,
	[id_editorial] INTEGER NOT NULL,
	[id_formato] INTEGER NOT NULL,
	[nombre] VARCHAR(200) NOT NULL,
	[isbn] VARCHAR(50) NOT NULL UNIQUE,
	[sinopsis] VARCHAR(3000),
	[fecha_salida] DATE NOT NULL,
	[estado] BIT NOT NULL,
	[id_imagen] INTEGER NOT NULL,
	[precio_base] DECIMAL(10,2) NOT NULL,
	PRIMARY KEY([id_libro])
);
GO

CREATE TABLE [Inventario] (
	[id_inventario] INTEGER NOT NULL IDENTITY,
	[id_libro] INTEGER NOT NULL,
	[stock] INTEGER NOT NULL,
	PRIMARY KEY([id_inventario])
);
GO

CREATE TABLE [Carrito] (
	[id_carrito] INTEGER NOT NULL IDENTITY,
	[id_usuario] INTEGER NOT NULL,
	PRIMARY KEY([id_carrito])
);
GO

CREATE TABLE [DetalleCarrito] (
	[id_detalleCarrito] INTEGER NOT NULL IDENTITY,
	[id_carrito] INTEGER NOT NULL,
	[id_libro] INTEGER NOT NULL,
	[cantidad] INTEGER NOT NULL,
	PRIMARY KEY([id_detalleCarrito])
);
GO

CREATE TABLE [Orden] (
	[id_orden] INTEGER NOT NULL IDENTITY,
	[id_usuario] INTEGER NOT NULL,
	[subtotal_base] DECIMAL(10,2) NOT NULL,
	[descuento_volumen] DECIMAL(10,2) NOT NULL,
	[descuento_cliente] DECIMAL(10,2) NOT NULL,
	[impuesto] DECIMAL(10,2) NOT NULL,
	[total_final] DECIMAL(10,2) NOT NULL,
	[estado] VARCHAR(50) NOT NULL,
	[fecha] DATETIME NOT NULL,
	PRIMARY KEY([id_orden])
);
GO

CREATE TABLE [DetalleOrden] (
	[id_detalleOrden] INTEGER NOT NULL IDENTITY,
	[id_orden] INTEGER NOT NULL,
	[id_libro] INTEGER NOT NULL,
	[cantidad] INTEGER NOT NULL,
	[precio_unitario] DECIMAL(10,2) NOT NULL,
	[subtotal_item] DECIMAL(10,2) NOT NULL,
	PRIMARY KEY([id_detalleOrden])
);
GO

CREATE TABLE [Solicitud] (
	[id_solicitud] INTEGER NOT NULL IDENTITY,
	[id_cliente] INTEGER NOT NULL,
	[id_libro] INTEGER NOT NULL,
	[cantidad_estimada] INTEGER NOT NULL,
	[acabado_portada] VARCHAR(100),
	[tipo_papel] VARCHAR(100) NOT NULL,
	[fecha_requerida_entrega] DATE NOT NULL,
	[fecha_solicitud] DATETIME NOT NULL,
	[estado] VARCHAR(50) NOT NULL,
	[id_inventario] INTEGER NOT NULL,
	PRIMARY KEY([id_solicitud])
);
GO

CREATE TABLE [Cotizacion] (
	[id_cotizacion] INTEGER NOT NULL IDENTITY,
	[id_solicitud] INTEGER NOT NULL,
	[id_usuario] INTEGER NOT NULL,
	[subtotal] DECIMAL(10,2) NOT NULL,
	[impuesto] DECIMAL(10,2) NOT NULL,
	[total] DECIMAL(10,2) NOT NULL,
	[estado] VARCHAR(50) NOT NULL,
	[fecha] DATETIME NOT NULL,
	[id_cliente] INTEGER NOT NULL,
	PRIMARY KEY([id_cotizacion])
);
GO

CREATE TABLE [Imagen] (
	[id_imagen] INTEGER NOT NULL IDENTITY,
	[id_libro] INTEGER NOT NULL,
	[nombre_imagen] VARCHAR(150) NOT NULL,
	[imagen_url] VARCHAR(500) NOT NULL,
	PRIMARY KEY([id_imagen])
);
GO

CREATE TABLE [Cliente] (
	[id_cliente] INTEGER NOT NULL IDENTITY,
	[nombre] VARCHAR(150) NOT NULL,
	[nit] VARCHAR(20),
	[numero_telefono] VARCHAR(8) NOT NULL,
	[direccion] VARCHAR(150),
	[id_tipoCliente] INTEGER NOT NULL,
	PRIMARY KEY([id_cliente])
);
GO


ALTER TABLE [Usuario]
ADD FOREIGN KEY([id_rol])
REFERENCES [Rol]([id_rol])
ON UPDATE NO ACTION ON DELETE NO ACTION;
GO
ALTER TABLE [Libro]
ADD FOREIGN KEY([id_categoria])
REFERENCES [Categoria]([id_categoria])
ON UPDATE NO ACTION ON DELETE NO ACTION;
GO
ALTER TABLE [Libro]
ADD FOREIGN KEY([id_autor])
REFERENCES [Autor]([id_autor])
ON UPDATE NO ACTION ON DELETE NO ACTION;
GO
ALTER TABLE [Libro]
ADD FOREIGN KEY([id_editorial])
REFERENCES [Editorial]([id_editorial])
ON UPDATE NO ACTION ON DELETE NO ACTION;
GO
ALTER TABLE [Libro]
ADD FOREIGN KEY([id_formato])
REFERENCES [Formato]([id_formato])
ON UPDATE NO ACTION ON DELETE NO ACTION;
GO
ALTER TABLE [Inventario]
ADD FOREIGN KEY([id_libro])
REFERENCES [Libro]([id_libro])
ON UPDATE NO ACTION ON DELETE NO ACTION;
GO
ALTER TABLE [Carrito]
ADD FOREIGN KEY([id_usuario])
REFERENCES [Usuario]([id_usuario])
ON UPDATE NO ACTION ON DELETE NO ACTION;
GO
ALTER TABLE [DetalleCarrito]
ADD FOREIGN KEY([id_carrito])
REFERENCES [Carrito]([id_carrito])
ON UPDATE NO ACTION ON DELETE NO ACTION;
GO
ALTER TABLE [DetalleCarrito]
ADD FOREIGN KEY([id_libro])
REFERENCES [Libro]([id_libro])
ON UPDATE NO ACTION ON DELETE NO ACTION;
GO
ALTER TABLE [DetalleOrden]
ADD FOREIGN KEY([id_orden])
REFERENCES [Orden]([id_orden])
ON UPDATE NO ACTION ON DELETE NO ACTION;
GO
ALTER TABLE [DetalleOrden]
ADD FOREIGN KEY([id_libro])
REFERENCES [Libro]([id_libro])
ON UPDATE NO ACTION ON DELETE NO ACTION;
GO
ALTER TABLE [Solicitud]
ADD FOREIGN KEY([id_libro])
REFERENCES [Libro]([id_libro])
ON UPDATE NO ACTION ON DELETE NO ACTION;
GO
ALTER TABLE [Cotizacion]
ADD FOREIGN KEY([id_usuario])
REFERENCES [Usuario]([id_usuario])
ON UPDATE NO ACTION ON DELETE NO ACTION;
GO
ALTER TABLE [Orden]
ADD FOREIGN KEY([id_usuario])
REFERENCES [Usuario]([id_usuario])
ON UPDATE NO ACTION ON DELETE NO ACTION;
GO
ALTER TABLE [Cotizacion]
ADD FOREIGN KEY([id_solicitud])
REFERENCES [Solicitud]([id_solicitud])
ON UPDATE NO ACTION ON DELETE NO ACTION;
GO
ALTER TABLE [Cliente]
ADD FOREIGN KEY([id_tipoCliente])
REFERENCES [TipoCliente]([id_tipoCliente])
ON UPDATE NO ACTION ON DELETE NO ACTION;
GO
ALTER TABLE [Libro]
ADD FOREIGN KEY([id_imagen])
REFERENCES [Imagen]([id_imagen])
ON UPDATE NO ACTION ON DELETE NO ACTION;
GO
ALTER TABLE [Solicitud]
ADD FOREIGN KEY([id_cliente])
REFERENCES [Cliente]([id_cliente])
ON UPDATE NO ACTION ON DELETE NO ACTION;
GO
ALTER TABLE [Solicitud]
ADD FOREIGN KEY([id_inventario])
REFERENCES [Inventario]([id_inventario])
ON UPDATE NO ACTION ON DELETE NO ACTION;
GO
ALTER TABLE [Cotizacion]
ADD FOREIGN KEY([id_cliente])
REFERENCES [Cliente]([id_cliente])
ON UPDATE NO ACTION ON DELETE NO ACTION;
GO
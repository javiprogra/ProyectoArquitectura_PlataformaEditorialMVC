CREATE TABLE [Rol] (
	[id_rol] INTEGER NOT NULL IDENTITY,
	[nombre] VARCHAR(50) NOT NULL,
	PRIMARY KEY([id_rol])
);
GO

CREATE TABLE [Usuario] (
	[id_usuario] INTEGER NOT NULL IDENTITY,
	[id_rol] INTEGER NOT NULL,
	[usuario] VARCHAR(100) NOT NULL UNIQUE,
	[password] VARCHAR(255) NOT NULL,
	[nombre] VARCHAR(100) NOT NULL,
	[apellido] VARCHAR(100) NOT NULL,
	[telefono] VARCHAR(255),
	[direccion] VARCHAR(255),
	PRIMARY KEY([id_usuario])
);
GO

CREATE TABLE [Cliente] (
	[id_cliente] INTEGER NOT NULL IDENTITY,
	[id_tipoCliente] INTEGER,
	[id_usuario] INTEGER NOT NULL,
	[nit] VARCHAR(20),
	[id_tipoCliente] INTEGER NOT NULL,
	PRIMARY KEY([id_cliente])
);
GO

CREATE TABLE [TipoCliente] (
	[id_tipoCliente] INTEGER NOT NULL IDENTITY,
	[tipo] VARCHAR(50) NOT NULL,
	[descuento] DECIMAL(10,2) NOT NULL,
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

CREATE TABLE [Libro] (
	[id_libro] INTEGER NOT NULL IDENTITY,
	[id_categoria] INTEGER NOT NULL,
	[id_editorial] INTEGER NOT NULL,
	[id_formato] INTEGER NOT NULL,
	[id_autor] INTEGER,
	[nombre] VARCHAR(200) NOT NULL,
	[sinopsis] VARCHAR(3000),
	[isbn] VARCHAR(50) NOT NULL UNIQUE,
	[precio_base] DECIMAL(10,2) NOT NULL,
	[estado] BIT NOT NULL,
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

CREATE TABLE [Orden] (
	[id_orden] INTEGER NOT NULL IDENTITY,
	[id_cotizacion] INTEGER NOT NULL,
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
	[fecha_requerida_entrega] DATE NOT NULL,
	[fecha_solicitud] DATETIME NOT NULL,
	[estado] VARCHAR(50) NOT NULL,
	PRIMARY KEY([id_solicitud])
);
GO

CREATE TABLE [Cotizacion] (
	[id_cotizacion] INTEGER NOT NULL IDENTITY,
	[id_solicitud] INTEGER NOT NULL,
	[subtotal] DECIMAL(10,2) NOT NULL,
	[impuesto] DECIMAL(10,2) NOT NULL,
	[total] DECIMAL(10,2) NOT NULL,
	[estado] VARCHAR(50) NOT NULL,
	[fecha] DATETIME NOT NULL,
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

CREATE TABLE [DetalleCotizacion] (
	[id_detalle_cotizacion] INTEGER NOT NULL IDENTITY,
	[id_cotizacion] INTEGER NOT NULL,
	[id_libro] INTEGER NOT NULL,
	[cantidad] INTEGER NOT NULL,
	[precio_unitario] DECIMAL(10,2) NOT NULL,
	[subtotal_item] DECIMAL(10,2) NOT NULL,
	PRIMARY KEY([id_detalle_cotizacion])
);
GO

CREATE TABLE [DetalleSolicitud] (
	[id_detalle_solicitud] INTEGER NOT NULL IDENTITY,
	[id_solicitud] INTEGER NOT NULL,
	[id_libro] INTEGER NOT NULL,
	[cantidad_estimada] INTEGER NOT NULL,
	[acabado_portada] VARCHAR(50),
	[tipo_papel] VARCHAR(50),
	PRIMARY KEY([id_detalle_solicitud])
);
GO


ALTER TABLE [Usuario]
ADD FOREIGN KEY([id_rol])
REFERENCES [Rol]([id_rol])
ON UPDATE NO ACTION ON DELETE NO ACTION;
GO
ALTER TABLE [Usuario]
ADD FOREIGN KEY([id_usuario])
REFERENCES [Cliente]([id_usuario])
ON UPDATE NO ACTION ON DELETE NO ACTION;
GO
ALTER TABLE [Cliente]
ADD FOREIGN KEY([id_cliente])
REFERENCES [Solicitud]([id_cliente])
ON UPDATE NO ACTION ON DELETE NO ACTION;
GO
ALTER TABLE [Solicitud]
ADD FOREIGN KEY([id_solicitud])
REFERENCES [Cotizacion]([id_solicitud])
ON UPDATE NO ACTION ON DELETE NO ACTION;
GO
ALTER TABLE [Usuario]
ADD FOREIGN KEY([id_usuario])
REFERENCES [Orden]([id_usuario])
ON UPDATE NO ACTION ON DELETE NO ACTION;
GO
ALTER TABLE [Cotizacion]
ADD FOREIGN KEY([id_cotizacion])
REFERENCES [Orden]([id_cotizacion])
ON UPDATE NO ACTION ON DELETE NO ACTION;
GO
ALTER TABLE [Cotizacion]
ADD FOREIGN KEY([id_cotizacion])
REFERENCES [DetalleCotizacion]([id_cotizacion])
ON UPDATE NO ACTION ON DELETE NO ACTION;
GO
ALTER TABLE [Solicitud]
ADD FOREIGN KEY([id_solicitud])
REFERENCES [DetalleSolicitud]([id_solicitud])
ON UPDATE NO ACTION ON DELETE NO ACTION;
GO
ALTER TABLE [Orden]
ADD FOREIGN KEY([id_orden])
REFERENCES [DetalleOrden]([id_orden])
ON UPDATE NO ACTION ON DELETE NO ACTION;
GO
ALTER TABLE [Categoria]
ADD FOREIGN KEY([id_categoria])
REFERENCES [Libro]([id_categoria])
ON UPDATE NO ACTION ON DELETE NO ACTION;
GO
ALTER TABLE [Editorial]
ADD FOREIGN KEY([id_editorial])
REFERENCES [Libro]([id_editorial])
ON UPDATE NO ACTION ON DELETE NO ACTION;
GO
ALTER TABLE [Formato]
ADD FOREIGN KEY([id_formato])
REFERENCES [Libro]([id_formato])
ON UPDATE NO ACTION ON DELETE NO ACTION;
GO
ALTER TABLE [Libro]
ADD FOREIGN KEY([id_libro])
REFERENCES [DetalleSolicitud]([id_libro])
ON UPDATE NO ACTION ON DELETE NO ACTION;
GO
ALTER TABLE [Libro]
ADD FOREIGN KEY([id_libro])
REFERENCES [DetalleOrden]([id_libro])
ON UPDATE NO ACTION ON DELETE NO ACTION;
GO
ALTER TABLE [Libro]
ADD FOREIGN KEY([id_libro])
REFERENCES [Inventario]([id_libro])
ON UPDATE NO ACTION ON DELETE NO ACTION;
GO
ALTER TABLE [Libro]
ADD FOREIGN KEY([id_libro])
REFERENCES [Imagen]([id_libro])
ON UPDATE NO ACTION ON DELETE NO ACTION;
GO
ALTER TABLE [Libro]
ADD FOREIGN KEY([id_autor])
REFERENCES [Autor]([id_autor])
ON UPDATE NO ACTION ON DELETE NO ACTION;
GO
ALTER TABLE [Libro]
ADD FOREIGN KEY([id_libro])
REFERENCES [DetalleCotizacion]([id_libro])
ON UPDATE NO ACTION ON DELETE NO ACTION;
GO
ALTER TABLE [TipoCliente]
ADD FOREIGN KEY([id_tipoCliente])
REFERENCES [Cliente]([id_tipoCliente])
ON UPDATE NO ACTION ON DELETE NO ACTION;
GO
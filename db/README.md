# LuminaDB - Documentacion del Esquema de Base de Datos

Documentacion tecnica del modelo relacional para LuminaDB. El esquema esta disenado bajo los principios de normalizacion (hasta la Tercera Forma Normal - 3FN) para soportar la plataforma de comercio electronico y la gestion bibliografica de la libreria.

## Instrucciones para Crear la Base de Datos en SSMS

1. Abrir SQL Server Management Studio (SSMS) y conectarse a la instancia del servidor.
2. Hacer clic derecho sobre la carpeta Databases y seleccionar New Database.
3. Asignar el nombre exacto: `LuminaDB`.
4. Hacer clic en OK para crear la base de datos.
5. Abrir una nueva ventana de consultas (New Query), pegar el script SQL del sistema y ejecutarlo (F5) para generar las tablas, llaves primarias y foraneas.

## Diccionario de Datos y Relaciones

### 1. Modulo de Usuarios y Seguridad

#### Rol
Define los niveles de acceso y permisos dentro de la plataforma.
* Atributos:
  * `id_rol`: `INT` (PK, Identity, Not Null)
  * `nombre`: `VARCHAR(50)` (Not Null)
* Relaciones:
  * 1 a Muchos (1:N) con `Usuario`.

#### TipoCliente
Clasifica el perfil comercial del usuario (por ejemplo, minorista o institucional).
* Atributos:
  * `id_tipoCliente`: `INT` (PK, Identity, Not Null)
  * `tipo`: `VARCHAR(50)` (Not Null)
* Relaciones:
  * 1 a Muchos (1:N) con `Usuario`.

#### Usuario
Almacena la informacion de los usuarios registrados en el sistema.
* Atributos:
  * `id_usuario`: `INT` (PK, Identity, Not Null)
  * `id_rol`: `INT` (Not Null, FK)
  * `id_tipoCliente`: `INT` (Null, FK)
  * `usuario`: `VARCHAR(100)` (Not Null, Unique)
  * `password`: `VARCHAR(255)` (Not Null)
  * `nombre`: `VARCHAR(100)` (Not Null)
  * `apellido`: `VARCHAR(100)` (Not Null)
  * `nit`: `VARCHAR(20)` (Null)
  * `telefono`: `VARCHAR(255)` (Null)
  * `direccion`: `VARCHAR(255)` (Null)
* Relaciones:
  * Pertenece a `Rol` y `TipoCliente`.
  * 1 a 1 con `Carrito`.
  * 1 a Muchos (1:N) con `Orden`, `Solicitud` y `Cotizacion`.

### 2. Modulo de Catalogo de Libros

#### Categoria
Clasifica los generos literarios o tematicas de los libros.
* Atributos:
  * `id_categoria`: `INT` (PK, Identity, Not Null)
  * `nombre`: `VARCHAR(100)` (Not Null)
  * `estado`: `BIT` (Not Null)
* Relaciones:
  * 1 a Muchos (1:N) con `Libro`.

#### Autor
Almacena los datos de los escritores.
* Atributos:
  * `id_autor`: `INT` (PK, Identity, Not Null)
  * `nombre`: `VARCHAR(100)` (Not Null)
  * `nacionalidad`: `VARCHAR(100)` (Null)
* Relaciones:
  * 1 a Muchos (1:N) con `Libro`.

#### Editorial
Empresas editoriales que publican las obras.
* Atributos:
  * `id_editorial`: `INT` (PK, Identity, Not Null)
  * `nombre`: `VARCHAR(150)` (Not Null)
  * `telefono`: `VARCHAR(20)` (Null)
  * `correo`: `VARCHAR(150)` (Null)
  * `direccion`: `VARCHAR(255)` (Null)
* Relaciones:
  * 1 a Muchos (1:N) con `Libro`.

#### Formato
Tipo de presentacion fisica o digital de la obra.
* Atributos:
  * `id_formato`: `INT` (PK, Identity, Not Null)
  * `tipo`: `VARCHAR(50)` (Not Null)
* Relaciones:
  * 1 a Muchos (1:N) con `Libro`.

#### Libro
Nucleo del catalogo de la tienda en linea.
* Atributos:
  * `id_libro`: `INT` (PK, Identity, Not Null)
  * `id_categoria`, `id_autor`, `id_editorial`, `id_formato`: `INT` (FKs obligatorias)
  * `nombre`: `VARCHAR(200)` (Not Null)
  * `isbn`: `VARCHAR(50)` (Not Null, Unique)
  * `sinopsis`: `VARCHAR(3000)` (Null)
  * `fecha_salida`: `DATE` (Not Null)
  * `precio_base`: `DECIMAL(10,2)` (Not Null)
  * `estado`: `BIT` (Not Null)
* Relaciones:
  * Recibe FKs de `Categoria`, `Autor`, `Editorial` y `Formato`.
  * 1 a Muchos (1:N) con `Imagen`, `Inventario`, `DetalleCarrito`, `DetalleOrden` y `Solicitud`.

#### Imagen
Almacena las URLs de las portadas asociadas a cada libro.
* Atributos:
  * `id_imagen`: `INT` (PK, Identity, Not Null)
  * `id_libro`: `INT` (Not Null, FK)
  * `nombre_imagen`: `VARCHAR(150)` (Not Null)
  * `imagen_url`: `VARCHAR(500)` (Not Null)
* Relaciones:
  * Pertenece a un `Libro` (1:N).

#### Inventario
Control de existencias fisicas disponibles para la venta.
* Atributos:
  * `id_inventario`: `INT` (PK, Identity, Not Null)
  * `id_libro`: `INT` (Not Null, FK)
  * `stock`: `INT` (Not Null)
* Relaciones:
  * Pertenece a un `Libro`.

### 3. Modulo Transaccional

#### Carrito
Contenedor temporal de compras web activo por usuario.
* Atributos:
  * `id_carrito`: `INT` (PK, Identity, Not Null)
  * `id_usuario`: `INT` (Not Null, FK)
  * `fecha_actualizacion`: `DATETIME` (Not Null)
* Relaciones:
  * 1 a 1 con `Usuario`.
  * 1 a Muchos (1:N) con `DetalleCarrito`.

#### DetalleCarrito
Items individuales dentro del carrito de compras.
* Atributos:
  * `id_detalleCarrito`: `INT` (PK, Identity, Not Null)
  * `id_carrito`: `INT` (Not Null, FK)
  * `id_libro`: `INT` (Not Null, FK)
  * `cantidad`: `INT` (Not Null)
* Relaciones:
  * Vincula el `Carrito` con el `Libro`.

#### Orden
Pedido consolidado generado tras procesar la compra.
* Atributos:
  * `id_orden`: `INT` (PK, Identity, Not Null)
  * `id_usuario`: `INT` (Not Null, FK)
  * `subtotal_base`, `descuento_volumen`, `descuento_cliente`, `impuesto`, `total_final`: `DECIMAL(10,2)` (Not Null)
  * `estado`: `VARCHAR(50)` (Not Null)
  * `fecha`: `DATETIME` (Not Null)
* Relaciones:
  * Pertenece a un `Usuario`.
  * 1 a Muchos (1:N) con `DetalleOrden`.

#### DetalleOrden
Desglose de los libros comprados en una orden especifica.
* Atributos:
  * `id_detalleOrden`: `INT` (PK, Identity, Not Null)
  * `id_orden`: `INT` (Not Null, FK)
  * `id_libro`: `INT` (Not Null, FK)
  * `cantidad`: `INT` (Not Null)
  * `precio_unitario`, `subtotal_item`: `DECIMAL(10,2)` (Not Null)
* Relaciones:
  * Vincula la `Orden` con el `Libro`.

### 4. Modulo Institucional

#### Solicitud
Peticiones especiales de adquisicion masiva realizadas por clientes institucionales.
* Atributos:
  * `id_solicitud`: `INT` (PK, Identity, Not Null)
  * `id_usuario`, `id_libro`: `INT` (FKs)
  * `cantidad_estimada`: `INT` (Not Null)
  * `acabado_portada`: `VARCHAR(100)` (Null)
  * `tipo_papel`: `VARCHAR(100)` (Not Null)
  * `fecha_requerida_entrega`: `DATE` (Not Null)
  * `fecha_solicitud`: `DATETIME` (Not Null)
  * `estado`: `VARCHAR(50)` (Not Null)
* Relaciones:
  * Vincula al `Usuario` y al `Libro`.
  * 1 a 1 con `Cotizacion`.

#### Cotizacion
Propuesta comercial formal emitida por un asesor en respuesta a una solicitud institucional.
* Atributos:
  * `id_cotizacion`: `INT` (PK, Identity, Not Null)
  * `id_solicitud`: `INT` (Not Null, FK)
  * `id_usuario`: `INT` (Not Null, FK)
  * `subtotal`, `impuesto`, `total`: `DECIMAL(10,2)` (Not Null)
  * `estado`: `VARCHAR(50)` (Not Null)
  * `fecha`: `DATETIME` (Not Null)
* Relaciones:
  * Responde a una `Solicitud` y es emitida por un `Usuario` (asesor).
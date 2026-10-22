# Documentacion de Base de Datos - LuminaDB

## Descripcion General

Este documento detalla la estructura relacional de la base de datos para la plataforma editorial LuminaDB. El diseño se encuentra normalizado bajo la Tercera Forma Normal (3FN), optimizado para su ejecución en Microsoft SQL Server Management Studio (SSMS) e implementa catálogos base, gestión de usuarios, clientes, inventario, transacciones comerciales y un módulo institucional estructurado con solicitudes, cotizaciones y sus respectivos detalles.

## Estructura de Tablas y Atributos

### 1. Rol

Almacena los diferentes roles de usuario disponibles en el sistema (ej. Administrador, Personal Operativo).

* `id_rol`: Identificador único (Primary Key, Increment, Not Null).
* `nombre`: Nombre descriptivo del rol (Varchar(50), Not Null).
* **Relaciones:** 1 a N con la tabla Usuario.

### 2. Usuario

Gestiona los accesos y credenciales del personal interno y usuarios de la plataforma.

* `id_usuario`: Identificador único (Primary Key, Increment, Not Null).
* `id_rol`: Llave foránea que referencia al rol del usuario (Integer, Not Null).
* `usuario`: Nombre de usuario único para inicio de sesión (Varchar(100), Not Null, Unique).
* `password`: Hash de la contraseña de acceso (Varchar(255), Not Null).
* `nombre`: Nombre del usuario (Varchar(100), Not Null).
* `apellido`: Apellido del usuario (Varchar(100), Not Null).
* `telefono`: Teléfono de contacto (Varchar(255), Null).
* `direccion`: Dirección de residencia (Varchar(255), Null).
* **Relaciones:** N a 1 con Rol; 1 a 1 con Cliente; 1 a N con Orden.

### 3. Cliente

Almacena la información del perfil del cliente en la tienda, vinculándolo a su usuario y a su categoría comercial.

* `id_cliente`: Identificador único (Primary Key, Increment, Not Null).
* `id_usuario`: Llave foránea que referencia al usuario correspondiente (Integer, Not Null).
* `id_tipoCliente`: Llave foránea que referencia al tipo de cliente (Integer, Not Null).
* `nit`: Número de identificación tributaria (Varchar(20), Null).
* **Relaciones:** 1 a 1 con Usuario; N a 1 con TipoCliente; 1 a N con Solicitud.

### 4. TipoCliente

Define las clasificaciones comerciales de los clientes y el porcentaje de descuento asociado.

* `id_tipoCliente`: Identificador único (Primary Key, Increment, Not Null).
* `tipo`: Descripción de la categoría del cliente (Varchar(50), Not Null).
* `descuento`: Porcentaje o factor de descuento aplicable (Decimal(10,2), Not Null).
* **Relaciones:** 1 a N con la tabla Cliente.

### 5. Categoria

Clasifica los libros según su género literario o temática principal.

* `id_categoria`: Identificador único (Primary Key, Increment, Not Null).
* `nombre`: Nombre de la categoría (Varchar(100), Not Null).
* `estado`: Indicador de disponibilidad o vigencia (Bit, Not Null).
* **Relaciones:** 1 a N con la tabla Libro.

### 6. Autor

Contiene la información biográfica y nacionalidad de los autores de las obras.

* `id_autor`: Identificador único (Primary Key, Increment, Not Null).
* `nombre`: Nombre completo del autor (Varchar(100), Not Null).
* `nacionalidad`: País de origen del autor (Varchar(100), Null).
* **Relaciones:** 1 a N con la tabla Libro.

### 7. Editorial

Registra los datos de contacto y ubicación de las casas editoriales asociadas.

* `id_editorial`: Identificador único (Primary Key, Increment, Not Null).
* `nombre`: Razón social o nombre de la editorial (Varchar(150), Not Null).
* `telefono`: Teléfono de contacto (Varchar(20), Null).
* `correo`: Correo electrónico institucional (Varchar(150), Null).
* `direccion`: Dirección física de la editorial (Varchar(255), Null).
* **Relaciones:** 1 a N con la tabla Libro.

### 8. Formato

Define las presentaciones físicas o digitales en las que se distribuyen los libros.

* `id_formato`: Identificador único (Primary Key, Increment, Not Null).
* `tipo`: Tipo de formato (ej. Tapa dura, rústica, digital) (Varchar(50), Not Null).
* **Relaciones:** 1 a N con la tabla Libro.

### 9. Libro

Catálogo principal de obras literarias disponibles en la plataforma.

* `id_libro`: Identificador único (Primary Key, Increment, Not Null).
* `id_categoria`: Llave foránea de categoría (Integer, Not Null).
* `id_editorial`: Llave foránea de editorial (Integer, Not Null).
* `id_formato`: Llave foránea de formato (Integer, Not Null).
* `id_autor`: Llave foránea de autor (Integer, Null).
* `nombre`: Título del libro (Varchar(200), Not Null).
* `sinopsis`: Resumen o sinopsis de la obra (Varchar(3000), Null).
* `isbn`: Código estándar internacional de libro (Varchar(50), Not Null, Unique).
* `precio_base`: Precio unitario base de venta (Decimal(10,2), Not Null).
* `estado`: Estado de disponibilidad (Bit, Not Null).
* **Relaciones:** N a 1 con Categoria, Editorial, Formato y Autor; 1 a N con Inventario, Imagen, DetalleSolicitud, DetalleCotizacion y DetalleOrden.

### 10. Inventario

Control de existencias físicas en almacén por cada título.

* `id_inventario`: Identificador único (Primary Key, Increment, Not Null).
* `id_libro`: Llave foránea del libro asociado (Integer, Not Null).
* `stock`: Cantidad disponible en existencia (Integer, Not Null).
* **Relaciones:** N a 1 con Libro.

### 11. Orden

Registro consolidado de los pedidos procesados generados a partir de una cotización previa.

* `id_orden`: Identificador único (Primary Key, Increment, Not Null).
* `id_cotizacion`: Llave foránea de la cotización origen (Integer, Not Null).
* `id_usuario`: Llave foránea del usuario que procesa la orden (Integer, Not Null).
* `subtotal_base`: Suma de los ítems sin descuentos ni impuestos (Decimal(10,2), Not Null).
* `descuento_volumen`: Monto descontado por cantidad de compra (Decimal(10,2), Not Null).
* `descuento_cliente`: Monto descontado por categoría de cliente (Decimal(10,2), Not Null).
* `impuesto`: Monto total de impuestos aplicados (Decimal(10,2), Not Null).
* `total_final`: Monto neto a pagar por la orden (Decimal(10,2), Not Null).
* `estado`: Estado actual de la orden (Varchar(50), Not Null).
* `fecha`: Fecha y hora de emisión (Datetime, Not Null).
* **Relaciones:** N a 1 con Cotizacion y Usuario; 1 a N con DetalleOrden.

### 12. DetalleOrden

Desglose detallado de los libros incluidos en cada orden de compra.

* `id_detalleOrden`: Identificador único (Primary Key, Increment, Not Null).
* `id_orden`: Llave foránea de la orden principal (Integer, Not Null).
* `id_libro`: Llave foránea del libro adquirido (Integer, Not Null).
* `cantidad`: Cantidad de unidades compradas (Integer, Not Null).
* `precio_unitario`: Precio aplicado por unidad (Decimal(10,2), Not Null).
* `subtotal_item`: Subtotal calculado para la línea del ítem (Decimal(10,2), Not Null).
* **Relaciones:** N a 1 con Orden y Libro.

### 13. Solicitud

Encabezado de las peticiones especiales o impresiones requeridas por los clientes.

* `id_solicitud`: Identificador único (Primary Key, Increment, Not Null).
* `id_cliente`: Llave foránea del cliente solicitante (Integer, Not Null).
* `fecha_requerida_entrega`: Fecha límite acordada para la entrega (Date, Not Null).
* `fecha_solicitud`: Fecha y hora de creación de la solicitud (Datetime, Not Null).
* `estado`: Estado actual de la solicitud (Varchar(50), Not Null).
* **Relaciones:** N a 1 con Cliente; 1 a N con DetalleSolicitud y Cotizacion.

### 14. DetalleSolicitud

Desglose de los libros e indicaciones de impresión solicitados por el cliente.

* `id_detalle_solicitud`: Identificador único (Primary Key, Increment, Not Null).
* `id_solicitud`: Llave foránea de la solicitud contenedora (Integer, Not Null).
* `id_libro`: Llave foránea del libro solicitado (Integer, Not Null).
* `cantidad_estimada`: Volumen estimado de ejemplares (Integer, Not Null).
* `acabado_portada`: Especificación del acabado visual para la portada (Varchar(50), Null).
* `tipo_papel`: Especificación del tipo de papel requerido (Varchar(50), Null).
* **Relaciones:** N a 1 con Solicitud y Libro.

### 15. Cotizacion

Presupuesto formal emitido en respuesta a una solicitud realizada por el cliente.

* `id_cotizacion`: Identificador único (Primary Key, Increment, Not Null).
* `id_solicitud`: Llave foránea que referencia la solicitud origen (Integer, Not Null).
* `subtotal`: Monto parcial antes de impuestos (Decimal(10,2), Not Null).
* `impuesto`: Monto de impuestos calculados (Decimal(10,2), Not Null).
* `total`: Monto total cotizado (Decimal(10,2), Not Null).
* `estado`: Estado de la cotización (Varchar(50), Not Null).
* `fecha`: Fecha y hora de emisión (Datetime, Not Null).
* **Relaciones:** N a 1 con Solicitud; 1 a N con DetalleCotizacion y Orden.

### 16. DetalleCotizacion

Desglose con ítems, costos unitarios y subtotales ofertados en una cotización.

* `id_detalle_cotizacion`: Identificador único (Primary Key, Increment, Not Null).
* `id_cotizacion`: Llave foránea de la cotización origen (Integer, Not Null).
* `id_libro`: Llave foránea del libro cotizado (Integer, Not Null).
* `cantidad`: Cantidad de unidades a cotizar (Integer, Not Null).
* `precio_unitario`: Precio unitario ofrecido (Decimal(10,2), Not Null).
* `subtotal_item`: Subtotal por ítem (Decimal(10,2), Not Null).
* **Relaciones:** N a 1 con Cotizacion y Libro.

### 17. Imagen

Recursos visuales y fotografías de portadas asociadas a los libros.

* `id_imagen`: Identificador único (Primary Key, Increment, Not Null).
* `id_libro`: Llave foránea asociada al libro correspondiente (Integer, Not Null).
* `nombre_imagen`: Nombre descriptivo del archivo de imagen (Varchar(150), Not Null).
* `imagen_url`: Ruta o URL de acceso al recurso de imagen (Varchar(500), Not Null).
* **Relaciones:** N a 1 con la tabla Libro.

---

## Instrucciones para Creacion en SQL Server Management Studio (SSMS)

1. Abrir SQL Server Management Studio (SSMS) y establecer conexión con el servidor local o instancia asignada.
2. Hacer clic en el botón **New Query** (Nueva Consulta) en la barra de herramientas superior.
3. Copiar el script de creación generado a partir de este DBML en el editor de consultas.
4. Asegurarse de incluir al inicio del script las instrucciones para inicializar la base de datos:

   ```sql
   CREATE DATABASE [LuminaDB];
   GO
   USE [LuminaDB];
   GO
   ```

5. Hacer clic en el botón **Execute** (Ejecutar) o presionar la tecla **F5** para compilar y generar todas las tablas con sus respectivas llaves primarias y foráneas respetando la integridad referencial.
# Documentación de Base de Datos — LuminaDB (PostgreSQL / Supabase)

Plataforma editorial multicanal. La base de datos está alojada en **Supabase**
(PostgreSQL 17) y se consume desde el backend (TypeORM + `pg`) y mediante
**procedimientos/funciones almacenadas**.

---

## 1. Archivos de base de datos

| Archivo | Propósito | Cuándo ejecutar |
|---|---|---|
| `Base de Datos Proyecto Arquitectura I Script.sql` | Esquema base (17 tablas) | Una sola vez |
| `LuminaProceduresCreation.sql` | Configuración: tablas de negocio, auditoría, índices, CHECK y semillas | Una sola vez, después del esquema |
| `LuminaProcedures.sql` | Funciones `fn_`/`sp_` (motor de descuentos, catálogos, transacciones) | Después de Creation; re-ejecutable para cambios de cuerpo |

### Orden de ejecución (en el SQL Editor de Supabase)

1. Ejecutar el script del esquema base.
2. Ejecutar `LuminaProceduresCreation.sql`.
3. Ejecutar `LuminaProcedures.sql`.

Ambos scripts `Lumina...` son **idempotentes**. Si cambias la *firma* de una
función (tipos de parámetros o de retorno), ejecuta antes:

```sql
DROP FUNCTION IF EXISTS nombre_funcion(...);
```

---

## 2. Estructura de tablas (nomenclatura real)

> La fuente de verdad es el script SQL. Se usa `snake_case` y nombres en singular.

### Catálogos

| Tabla | Columnas clave | Notas |
|---|---|---|
| `rol` | `id_rol` PK, `nombre` | 1:N con `usuario` |
| `tipo_cliente` | `id_tipo_cliente` PK, `tipo`, `descuento` | `descuento` = puntos porcentuales (8.00 = 8%) |
| `categoria` | `id_categoria` PK, `nombre`, `estado` | |
| `autor` | `id_autor` PK, `nombre`, `nacionalidad` | |
| `editorial` | `id_editorial` PK, `nombre`, `telefono`, `correo`, `direccion` | |
| `formato` | `id_formato` PK, `tipo` | |

### Usuarios y clientes

| Tabla | Columnas clave | Notas |
|---|---|---|
| `usuario` | `id_usuario` PK, `id_rol` FK, `usuario` UNIQUE, `password`, `nombre`, `apellido`, `telefono`, `direccion` | `password` = hash bcrypt |
| `cliente` | `id_cliente` PK, `id_tipo_cliente` FK, `id_usuario` FK UNIQUE, `nit` | 1:1 con `usuario` |

### Catálogo e inventario

| Tabla | Columnas clave | Notas |
|---|---|---|
| `libro` | `id_libro` PK, `id_categoria`, `id_editorial`, `id_formato`, `id_autor`, `nombre`, `sinopsis`, `isbn` UNIQUE, `precio_base`, `estado` | |
| `inventario` | `id_inventario` PK, `id_libro` FK, `stock` | Índice único `(id_libro)` |
| `imagen` | `id_imagen` PK, `id_libro` FK, `nombre_imagen`, `imagen_url` | |

### Proceso comercial

| Tabla | Columnas clave | Notas |
|---|---|---|
| `solicitud` | `id_solicitud` PK, `id_cliente` FK, `fecha_requerida_entrega`, `fecha_solicitud`, `estado` | |
| `detalle_solicitud` | `id_detalle_solicitud` PK, `id_solicitud`, `id_libro`, `cantidad_estimada`, `acabado_portada`, `tipo_papel` | |
| `cotizacion` | `id_cotizacion` PK, `id_solicitud` FK, `subtotal`, `impuesto`, `total`, `estado`, `fecha` | |
| `detalle_cotizacion` | `id_detalle_cotizacion` PK, `id_cotizacion`, `id_libro`, `cantidad`, `precio_unitario`, `subtotal_item` | |
| `orden` | `id_orden` PK, `id_cotizacion` FK UNIQUE, `id_usuario` FK, `subtotal_base`, `descuento_volumen`, `descuento_cliente`, `impuesto`, `total_final`, `estado`, `fecha` | 1:1 con `cotizacion` |
| `detalle_orden` | `id_detalle_orden` PK, `id_orden`, `id_libro`, `cantidad`, `precio_unitario`, `subtotal_item` | |

### Configuración y auditoría (creadas por `LuminaProceduresCreation.sql`)

| Tabla | Propósito |
|---|---|
| `parametro_negocio` | Valores de negocio configurables (p. ej. `iva = 0.12`) |
| `regla_descuento_volumen` | Tramos del descuento por volumen |
| `movimiento_inventario` | Trazabilidad de entradas/salidas de stock |
| `historial_estado` | Trazabilidad de cambios de estado y de rol |

---

## 3. Tramos de descuento por volumen (regla oficial UMES)

| Unidades | Descuento |
|---:|---:|
| 1 – 5 | 0.00% |
| 6 – 20 | 5.00% |
| 21 – 50 | 10.00% |
| 51+ | 15.00% |

El descuento de cliente (`tipo_cliente.descuento`) se aplica **después** del
descuento por volumen. El IVA es **12%**. Fórmula:

```text
Dv = ROUND(S * pv / 100, 2)
Dc = ROUND((S - Dv) * pc / 100, 2)
B  = S - Dv - Dc
I  = ROUND(B * iva, 2)
T  = B + I
```

Los descuentos se aplican **solo al convertir la cotización en orden**.

---

## 4. Catálogo de rutinas

### Motor de descuentos

| Función | Firma | Retorno |
|---|---|---|
| `fn_iva_vigente` | `()` | `NUMERIC(6,4)` |
| `fn_porcentaje_descuento_volumen` | `(p_cantidad INTEGER)` | `NUMERIC(5,2)` |
| `fn_porcentaje_descuento_cliente` | `(p_id_cliente INTEGER)` | `NUMERIC(5,2)` |
| `fn_calcular_totales` | `(p_subtotal NUMERIC, p_cantidad INTEGER, p_id_cliente INTEGER)` | tabla |
| `fn_calcular_totales_cotizacion` | `(p_id_cotizacion INTEGER)` | tabla |
| `fn_calcular_totales_items` | `(p_id_cliente INTEGER, p_items JSONB)` | tabla |

### Consultas

| Función | Firma | Retorno |
|---|---|---|
| `fn_buscar_libros` | `(texto, id_categoria, id_autor, id_editorial, id_formato, precio_min, precio_max, solo_disponibles, limit, offset)` | tabla + `total_count` |
| `fn_obtener_usuario_por_username` | `(p_usuario VARCHAR)` | tabla |
| `fn_reporte_ventas` | `(p_desde DATE, p_hasta DATE)` | tabla |

### Transacciones

| Función | Firma | Retorno |
|---|---|---|
| `sp_crear_usuario_cliente` | `(usuario, password_hash, nombre, apellido, telefono, direccion, nit, id_tipo_cliente, id_rol)` | `(id_usuario, id_cliente)` |
| `sp_crear_solicitud` | `(p_id_cliente, p_fecha_requerida_entrega, p_items JSONB)` | `id_solicitud` |
| `sp_generar_cotizacion` | `(p_id_solicitud, p_id_usuario)` | `id_cotizacion` |
| `sp_convertir_cotizacion_en_orden` | `(p_id_cotizacion, p_id_usuario)` | tabla (totales) |
| `sp_anular_orden` | `(p_id_orden, p_id_usuario, p_motivo)` | `VOID` |
| `sp_ajustar_inventario` | `(p_id_libro, p_delta, p_id_usuario, p_motivo)` | `stock` resultante |

### Roles (RF-02)

| Función | Firma | Retorno |
|---|---|---|
| `sp_crear_rol` | `(p_nombre VARCHAR)` | `id_rol` |
| `sp_asignar_rol` | `(p_id_usuario, p_id_rol, p_id_admin)` | `VOID` |
| `sp_eliminar_rol` | `(p_id_rol)` | `VOID` |

---

## 5. Códigos de error (SQLSTATE)

| Código | Significado |
|---|---|
| `LUM01` | Parámetro inválido |
| `LUM02` | Stock insuficiente |
| `LUM03` | Estado inválido / sin permisos |
| `LUM04` | Ya existe una orden/cotización vigente |
| `LUM05` | Último administrador |
| `LUM06` | Entidad en uso |
| `LUM07` | Registro no encontrado |
| `LUM08` | Duplicado |

---

## 6. Consumo desde TypeORM

```ts
// Lectura
const libros = await dataSource.query(
  `SELECT * FROM fn_buscar_libros($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
  [texto, idCategoria, idAutor, idEditorial, idFormato,
   precioMin, precioMax, soloDisponibles, limit, offset]
);

// Transacción (atómica dentro de la función)
const [orden] = await dataSource.query(
  `SELECT * FROM sp_convertir_cotizacion_en_orden($1, $2)`,
  [idCotizacion, idUsuario]
);

// Previsualización de descuentos
const [totales] = await dataSource.query(
  `SELECT * FROM fn_calcular_totales_items($1, $2::jsonb)`,
  [idCliente, JSON.stringify(items)]
);
```

Notas:

- `pg` devuelve `NUMERIC/DECIMAL` como **string**; mantén los montos como string
  en los DTO o convierte con cuidado.
- Para `JSONB`, pasa `JSON.stringify(items)` y castea con `$2::jsonb`.
- Las funciones `sp_` son atómicas: si lanzan excepción, revierten todo el statement.
  No ejecutes `COMMIT` dentro de ellas.

---

## 7. Notas y advertencias

- Los **datos semilla de las órdenes 1 y 2** son históricos y **no coinciden** con
  los tramos oficiales UMES (fueron generados con una regla distinta). No los uses
  como casos de prueba; usa la fórmula oficial de la sección 3.
- El esquema de tablas cambia **solo mediante migraciones** o los scripts de esta
  carpeta, nunca a mano.
- Las funciones quedan sin `EXECUTE` para `PUBLIC`/`anon`/`authenticated` (solo
  `service_role` y el rol de conexión del backend).
- Las columnas `fecha` se insertan en UTC con `(NOW() AT TIME ZONE 'UTC')`.

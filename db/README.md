# Documentación de Base de Datos — LuminaDB (PostgreSQL / Supabase)

Plataforma editorial multicanal. Base de datos en **Supabase** (PostgreSQL 17),
consumida desde el backend (TypeORM + `pg`) y mediante **funciones almacenadas**.

---

## 1. Archivos y orden de ejecución (SQL Editor de Supabase)

| Archivo | Propósito | Cuándo |
|---|---|---|
| `Base de Datos Proyecto Arquitectura I Script.sql` | Esquema base (17 tablas) — **inmutable** | Una sola vez |
| `LuminaProceduresCreation.sql` | Columnas adicionales, tablas de config/auditoría, índices, CHECK y semillas | Después del esquema (idempotente) |
| `LuminaProcedures.sql` | Funciones `fn_*`/`sp_*` | Después de Creation (re-ejecutable) |

Los tres scripts de `Lumina...` son **idempotentes**. Para cambiar la *firma* de una
función ejecuta antes `DROP FUNCTION IF EXISTS nombre(...);`.

---

## 2. Alteraciones no destructivas (sobre el esquema base)

| Tabla | Columnas agregadas | Razón |
|---|---|---|
| `libro` | `anio_edicion`, `edicion`, `paginas`, `idioma` | Ficha técnica (RF-01.3) |
| `usuario` | `estado BOOLEAN` | Login/registro (RF-02) |
| `solicitud` | `titulo_personalizado`, `notas` | Pedidos personalizados (RF-04.2) |
| `cotizacion` | `id_usuario`, `vigencia`, `notas`, `descuento_volumen`, `descuento_cliente` | Cotización formal (RF-04) |

Tablas auxiliares creadas: `parametro_negocio`, `regla_descuento_volumen`,
`movimiento_inventario`, `historial_estado`.

---

## 3. Credenciales de prueba (semillas)

`usuario.usuario` = **email**. Contraseñas en texto plano solo para el entregable
(en BD se guarda el hash bcrypt).

| Email | Contraseña | Rol |
|---|---|---|
| `admin@editorial.com` | `admin123` | Administrador |
| `asesor@editorial.com` | `asesor123` | Asesor de Ventas |
| `juan@gmail.com` | `juan123` | Cliente Minorista |
| `compras@umes.edu.gt` | `compras123` | Cliente Institucional / Mayorista |

El rol **Visitante** se conserva en el catálogo de roles, pero no tiene cuenta ni
credenciales: representa exclusivamente a una persona sin sesión autenticada.

Además se siembran 10 libros (con categoría, autor, editorial, formato, inventario
e imagen), 6 géneros, 2 editoriales, 3 formatos y 2 tipos de cliente.

---

## 4. Tramos de descuento por volumen (regla oficial UMES)

| Unidades | Descuento |
|---:|---:|
| 1 – 5 | 0% |
| 6 – 20 | 5% |
| 21 – 50 | 10% |
| 51+ | 15% |

Descuento adicional por tipo de cliente (acumulativo tras el volumen): Minorista 0%,
Institucional/Mayorista 8%. IVA 12% sobre `(Subtotal − Volumen − Cliente)`.
El cálculo está **encapsulado en la BD** (`fn_calcular_totales`).

---

## 5. Catálogo de funciones (`LuminaProcedures.sql`)

### Motor de descuentos (RF-03)
`fn_iva_vigente` · `fn_porcentaje_descuento_volumen` · `fn_porcentaje_descuento_cliente` ·
`fn_calcular_totales` · `fn_calcular_totales_items`

### Catálogo (RF-01)
`fn_buscar_libros(texto, categoria, formato, precio_min, precio_max, ...)` (devuelve `Book` desnormalizado + `total_count`) · `fn_obtener_libro(id)`

### Autenticación (RF-02)
`fn_obtener_usuario_por_username(email)` · `sp_crear_usuario_cliente(...)`

### Órdenes (RF-03)
`fn_cliente_de_usuario` · `sp_crear_orden_directa(usuario, items)` (genera solicitud+cotización+orden atómicamente) · `fn_obtener_orden` · `fn_listar_ordenes` · `sp_actualizar_estado_orden` · `sp_anular_orden`

### Solicitudes y cotizaciones (RF-04)
`sp_crear_solicitud` · `fn_listar_solicitudes` · `sp_actualizar_estado_solicitud` ·
`sp_generar_cotizacion(solicitud, usuario, precio_unitario, vigencia, notas)` ·
`fn_listar_cotizaciones` · `sp_actualizar_estado_cotizacion` · `sp_convertir_cotizacion_en_orden`

### Administración (RF-05)
`fn_upsert_catalogo` · `sp_crear_libro` · `sp_actualizar_libro` · `sp_eliminar_libro` ·
`sp_set_stock` (stock absoluto) · `sp_ajustar_inventario` (delta) ·
`fn_listar_usuarios` · `sp_actualizar_estado_usuario` · `sp_crear_rol` · `sp_asignar_rol` ·
`sp_eliminar_rol` · `fn_metricas_admin`

---

## 6. Códigos de error (SQLSTATE → HTTP)

| SQLSTATE | HTTP | Significado |
|---|---|---|
| `LUM01` | 400 | Parámetro inválido |
| `LUM02` | 409 | Stock insuficiente |
| `LUM03` | 403 | Estado inválido / sin permiso |
| `LUM04` | 409 | Ya existe orden/cotización |
| `LUM05` | 409 | Último administrador |
| `LUM06` | 409 | Entidad en uso |
| `LUM07` | 404 | No encontrado |
| `LUM08` | 409 | Duplicado |

---

## 7. Consumo desde TypeORM

```ts
const libros = await dataSource.query('SELECT * FROM fn_buscar_libros($1,$2,$3,$4,$5,FALSE,100,0)', [...]);
const id = await dataSource.query('SELECT * FROM sp_crear_orden_directa($1, $2::jsonb)', [userId, JSON.stringify(items)]);
```

- `pg` devuelve `NUMERIC` como **string**: convierte con `Number()` en el servicio.
- Para `JSONB`, pasa `JSON.stringify(...)` y castea `$2::jsonb`.
- Las funciones `sp_*` son atómicas (si lanzan excepción, revierten todo el statement).
- Los estados se guardan en español; el backend mapea a códigos EN (`constants/status.ts`).

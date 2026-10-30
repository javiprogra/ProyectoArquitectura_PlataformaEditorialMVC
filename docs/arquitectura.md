# Arquitectura del sistema

## Patrón MVC

La plataforma sigue el patrón **Modelo-Vista-Controlador** distribuido en un
monorepositorio con dos paquetes (`backend` y `frontend`).

```
Cliente ──▶  VISTA (React + Tailwind)        → frontend/src/**
                │  HTTP (JSON)
                ▼
          CONTROLADOR (Express)              → backend/src/{controllers,routes,middlewares,validators}
                │  services / repositories
                ▼
          MODELO (TypeORM + Postgres)        → backend/src/models/**
                │
                ▼
          PostgreSQL (Supabase)
```

## Responsabilidades por capa

| Capa | Responsable | Responsabilidad |
|---|---|---|
| Modelo | Líder Técnico | Conexión a PostgreSQL, entidades, repositorios, reglas de negocio y motor de descuentos. |
| Controlador | Ingeniero de Software | Rutas Express, middlewares, JWT, RBAC, validación de payloads y orquestación. |
| Vista | Desarrollador Frontend | Componentes React, páginas, hooks, servicios API y estilos con Tailwind. |

## Reglas de límites (boundaries)

- El Controlador consume los `services` del Modelo, pero **no modifica** `models/`.
- La Vista consume la API definida en `dto/` y `routes/`, pero **no modifica** el backend.
- Los cambios de contrato (`dto/`, `routes/`, `types/`) se aprueban antes de consumirse.
- El esquema de base de datos cambia **solo mediante migraciones** de TypeORM o los scripts de `db/`.

## Decisiones de arquitectura

- **Acceso a datos:** TypeORM (decoradores + migraciones) y funciones almacenadas (`db/LuminaProcedures.sql`).
- **Monorepositorio:** npm workspaces.
- **Base de datos:** PostgreSQL alojado en Supabase (SQL Editor solo para inspección).

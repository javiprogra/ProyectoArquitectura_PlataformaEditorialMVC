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
          MODELO (TypeORM + mssql)           → backend/src/models/**
                │
                ▼
          SQL Server (SSMS / Tailscale)
```

## Responsabilidades por capa

| Capa | Responsable | Responsabilidad |
|---|---|---|
| Modelo | Líder Técnico | Conexión a SQL Server, entidades, repositorios, reglas de negocio y motor de descuentos. |
| Controlador | Ingeniero de Software | Rutas Express, middlewares, JWT, RBAC, validación de payloads y orquestación. |
| Vista | Desarrollador Frontend | Componentes React, páginas, hooks, servicios API y estilos con Tailwind. |

## Reglas de límites (boundaries)

- El Controlador consume los `services` del Modelo, pero **no modifica** `models/`.
- La Vista consume la API definida en `dto/` y `routes/`, pero **no modifica** el backend.
- Los cambios de contrato (`dto/`, `routes/`, `types/`) se aprueban antes de consumirse.
- El esquema de base de datos cambia **solo mediante migraciones** de TypeORM.

## Decisiones de arquitectura

- **Acceso a datos:** TypeORM (decoradores + migraciones).
- **Monorepositorio:** npm workspaces.
- **Base de datos:** SQL Server compartido por red Tailscale (SSMS solo para inspección).

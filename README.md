# Plataforma Editorial Multicanal — Arquitectura MVC

Repositorio dedicado al desarrollo de una **plataforma web editorial multicanal**
basada en el patrón **Modelo-Vista-Controlador (MVC)**.

> Monorepositorio con `/backend` (Node.js + Express + TypeScript) y
> `/frontend` (React + TypeScript + Tailwind).

---

## 1. Stack técnico

| Capa MVC | Tecnologías |
|---|---|
| **Vista** | React, TypeScript, Tailwind CSS, Vite |
| **Controlador y Modelo** | Node.js, Express, TypeScript |
| **Base de datos** | PostgreSQL (Supabase) vía **TypeORM** (`pg`) |
| **Acceso compartido a BD** | Instancia de **Supabase** en la nube (todos vemos la misma BD) |

---

## 2. Arquitectura MVC y quién trabaja en cada capa

| Capa | Carpeta | Rol responsable |
|---|---|---|
| **Modelo** | `backend/src/models/**` | **Javier** |
| **Controlador** | `backend/src/{controllers,routes,middlewares,validators}/**` | **Pablo** |
| **Vista** | `frontend/src/**` | **Maria** |

```
             ┌────────────────────────────┐
  Cliente ──▶│  VISTA (React + Tailwind)  │  → Desarrollador Frontend
             └──────────────┬─────────────┘
                            │ HTTP (JSON)
             ┌──────────────▼─────────────┐
             │  CONTROLADOR (Express)     │  → Ingeniero de Software
             │  rutas · middlewares · JWT │
             └──────────────┬─────────────┘
                            │ services/repos
             ┌──────────────▼─────────────┐
             │  MODELO (TypeORM + Postgres) │  → Líder Técnico
             │  entidades · reglas · SQL  │
             └──────────────┬─────────────┘
                            │
             ┌──────────────▼─────────────┐
             │  PostgreSQL (Supabase)       │
             └────────────────────────────┘
```

---

## 3. Estructura del monorepositorio

```
├── backend/                  # Node.js + Express + TypeScript (Modelo + Controlador)
│   └── src/
│       ├── config/           # DataSource TypeORM + variables de entorno
│       ├── models/           # ★ MODELO — Líder Técnico
│       │   ├── entities/     #   entidades TypeORM (tablas)
│       │   ├── repositories/ #   acceso a datos por entidad
│       │   ├── services/     #   reglas de negocio / motor de descuentos
│       │   └── migrations/   #   migraciones del esquema (fuente única)
│       ├── controllers/      # ★ CONTROLADOR — Ing. de Software
│       ├── routes/           #   rutas Express por recurso
│       ├── middlewares/      #   JWT, RBAC, manejo de errores
│       ├── validators/       #   validación de payloads (zod)
│       ├── dto/              #   contratos de entrada/salida de la API
│       ├── utils/            #   helpers compartidos
│       └── types/            #   tipos TS transversales
└── frontend/                 # React + TS + Tailwind + Vite (Vista)
    └── src/
        ├── layouts/          # navbar, sidebar, footer
        ├── pages/            # páginas por ruta
        ├── components/       # componentes reutilizables
        ├── hooks/            # hooks custom
        ├── services/         # cliente API (axios) → consume el backend
        ├── router/           # react-router
        ├── context/          # estado global (auth, carrito)
        ├── types/            # tipos espejo de los DTO del backend
        └── styles/           # Tailwind + CSS global
```

---

## 4. Guía por integrante (dónde trabajas y qué haces)

### Javier → **Modelo**

**Espacio de trabajo:** `backend/src/models/**` y `backend/src/config/database.ts`

| Carpeta | Qué se hace |
|---|---|
| `models/entities/` | Defines las entidades TypeORM (decoradores, columnas, relaciones). |
| `models/repositories/` | Escribes el acceso a datos (find, create, queries) por entidad. |
| `models/services/` | Implementas la lógica de negocio y el **motor de descuentos/reglas**. |
| `models/migrations/` | Generas y versionas las migraciones del esquema. |
| `config/database.ts` | Mantienes el `DataSource` (conexión a PostgreSQL/Supabase). |

**Reglas:**
- El esquema se cambia **solo con migraciones** (`typeorm migration:run`) o con los scripts de `db/`, nunca a mano en el SQL Editor.
- El Controlador consume tus `services`, pero nadie más modifica `models/`.

---

### Pablo → **Controlador**

**Tu espacio de trabajo:** `backend/src/{controllers,routes,middlewares,validators}/**`

| Carpeta | Qué se hace |
|---|---|
| `controllers/` | Orquestas cada request: validas, llamas al `service` del Modelo, respondes. |
| `routes/` | Defines los endpoints Express y los conectas a los controladores. |
| `middlewares/` | Implementas autenticación **JWT**, **RBAC**, manejo de errores, rate-limit. |
| `validators/` | Creas los esquemas de validación de payloads (zod). |
| `dto/` | Defines/actualizas los **contratos** de entrada y salida de la API. |

**Reglas:**
- No modificas `models/`: consumes sus `services` ya expuestos.
- Cualquier cambio en `dto/` o `routes/` es un contrato: se avisa al Frontend y al Líder.

---

### 🎨 Maria → **Vista**

**Tu espacio de trabajo:** `frontend/src/**`

| Carpeta | Qué se hace |
|---|---|
| `pages/` | Creas las páginas por ruta (Home, Catálogo, Login, etc.). |
| `components/` | Construyes componentes reutilizables con Tailwind. |
| `layouts/` | Mantienes el layout base (navbar/sidebar/footer). |
| `hooks/` | Escribes hooks custom (useAuth, useFetch, etc.). |
| `services/` | Configuras el cliente API (axios) que consume el backend. |
| `router/` y `context/` | Defines rutas y estado global. |
| `types/` | Reflejas los DTO del backend como tipos TS. |

**Reglas:**
- Consumes la API usando los contratos de `backend/src/dto/`, no inventes campos.
- Ante un cambio de contrato, coordina con el Controlador antes de refactorizar.

---

## 5. Requisitos previos

- [Node.js](https://nodejs.org/) **v20+** y npm.
- [Git](https://git-scm.com/).
- Proyecto de **Supabase** (PostgreSQL) con la URL de conexión y credenciales (las entrega el Líder).
- **SQL Editor de Supabase** para inspeccionar datos y ejecutar los scripts de `db/` (no para alterar el esquema a mano).

---

## 6. Configuración inicial (primer clonado)

```bash
# 1. Clonar
git clone <url-del-repo>
cd ProyectoArquitectura_PlataformaEditorialMVC

# 2. Instalar dependencias de todo el workspace
npm install

# 3. Variables de entorno
cp backend/.env.example backend/.env     # edita DATABASE_URL, JWT_SECRET, etc.
cp frontend/.env.example frontend/.env   # edita VITE_API_URL

# 4. Levantar en desarrollo (ambos a la vez)
npm run dev
```

---

## 7. Scripts principales

| Comando | Qué hace |
|---|---|
| `npm run dev` | Levanta backend + frontend en paralelo (workspace raíz). |
| `npm run build` | Compila backend y frontend. |
| `npm run typecheck` | Verifica tipos en ambos paquetes. |
| `npm run migration:run` | (en `backend/`) aplica las migraciones de TypeORM a PostgreSQL. |
| `npm run migration:generate` | (en `backend/`) genera una migración a partir de cambios en entidades. |

---

## 8. Flujo de trabajo en Git

1. **Nunca commitear directo a `main`.** Todo entra por **Pull Request**.
2. Rama por capa: `feature/modelo/<desc>`, `feature/controlador/<desc>`, `feature/vista/<desc>`.
3. `CODEOWNERS` asigna revisión automática según la carpeta que toques (reemplazar los usuarios de ejemplo).
4. `.env` **no se versiona**: solo `.env.example` va al repo.
5. Cambios de contrato (`dto/`, `routes/`, `types/`) se aprueban primero, antes de consumirlos.
6. El esquema de BD cambia **solo vía migraciones** (regla del Modelo).

---

## 9. Convenciones rápidas

- **Commits:** `tipo(capa): descripción` — ej. `feat(modelo): entidad Discount`, `fix(vista): responsive navbar`.
- **TypeScript estricto** en ambos paquetes.
- Detalles completos en [`docs/convenciones.md`](docs/convenciones.md).

# Convenciones del equipo

## Commits

Formato: `tipo(capa): descripción`

- Tipos: `feat`, `fix`, `refactor`, `docs`, `chore`, `test`.
- Capas: `modelo`, `controlador`, `vista`, `infra`.

Ejemplos:
- `feat(modelo): entidad Discount y repositorio`
- `fix(vista): responsive en navbar`
- `chore(infra): actualizar dependencias`

## Ramas

- `feature/<capa>/<descripcion>` — ej. `feature/modelo/entidad-usuario`.
- Nunca commitear directo a `main`. Todo entra por Pull Request.

## Código

- TypeScript **estricto** en ambos paquetes.
- Identificadores y código en **inglés**; comentarios opcionales en español.
- Indentación: 2 espacios (ver `.editorconfig`).

## Variables de entorno

- Solo se versiona `.env.example`.
- Cada integrante copia a `.env` y coloca sus valores locales.

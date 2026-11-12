import { AppDataSource } from '../../config/database';

export interface BookDbRow {
  id_libro: number;
  nombre: string;
  sinopsis: string;
  isbn: string;
  precio_base: string;
  estado: boolean;
  categoria: string;
  autor: string | null;
  editorial: string;
  formato: string;
  stock: number;
  imagen_url: string | null;
  anio_edicion: number | null;
  edicion: string | null;
  paginas: number | null;
  idioma: string | null;
  total_count?: string;
}

export interface BookInput {
  author: string;
  publisher: string;
  genre: string;
  format: string;
  title: string;
  synopsis: string;
  isbn: string;
  price: number;
  year?: number | null;
  edition?: string | null;
  pages?: number | null;
  language?: string | null;
  coverImage?: string | null;
  stock?: number;
}

export interface BookFilters {
  search?: string;
  genre?: string;
  format?: string;
  precioMin?: number;
  precioMax?: number;
}

export class BookRepository {
  async search(filters: BookFilters): Promise<BookDbRow[]> {
    // Defensa adicional para clientes que envíen valores vacíos o el centinela "todos".
    const norm = (value?: string): string | null => {
      const normalized = value?.trim();
      return !normalized || normalized.toLowerCase() === 'todos' ? null : normalized;
    };
    return AppDataSource.query('SELECT * FROM fn_buscar_libros($1,$2,$3,$4,$5,FALSE,100,0)', [
      norm(filters.search),
      norm(filters.genre),
      norm(filters.format),
      filters.precioMin ?? null,
      filters.precioMax ?? null,
    ]);
  }

  async findById(id: number): Promise<BookDbRow | null> {
    const rows: BookDbRow[] = await AppDataSource.query('SELECT * FROM fn_obtener_libro($1)', [id]);
    return rows[0] ?? null;
  }

  async create(input: BookInput): Promise<number> {
    const rows = await AppDataSource.query(
      'SELECT * FROM sp_crear_libro($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)',
      [
        input.author, input.publisher, input.genre, input.format, input.title,
        input.synopsis ?? null, input.isbn, input.price,
        input.year ?? null, input.edition ?? null, input.pages ?? null, input.language ?? null,
        input.coverImage ?? null, input.stock ?? 0,
      ],
    );
    return Number(rows[0].sp_crear_libro);
  }

  async update(id: number, input: Partial<BookInput>): Promise<void> {
    await AppDataSource.query(
      'SELECT sp_actualizar_libro($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)',
      [
        id,
        input.author ?? null, input.publisher ?? null, input.genre ?? null, input.format ?? null,
        input.title ?? null, input.synopsis ?? null, input.isbn ?? null, input.price ?? null,
        input.year ?? null, input.edition ?? null, input.pages ?? null, input.language ?? null,
        input.coverImage ?? null, input.stock ?? null,
      ],
    );
  }

  async softDelete(id: number): Promise<void> {
    await AppDataSource.query('SELECT sp_eliminar_libro($1)', [id]);
  }

  async setStock(id: number, stock: number, idUsuario: number | null, motivo: string | null): Promise<number> {
    const rows = await AppDataSource.query('SELECT * FROM sp_set_stock($1,$2,$3,$4)', [
      id, stock, idUsuario, motivo,
    ]);
    return Number(rows[0].sp_set_stock);
  }
}

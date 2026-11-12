import { BookRepository, type BookDbRow, type BookFilters, type BookInput } from '../repositories/book.repository';
import type { BookDto } from '../../dto/book.dto';

export class BookService {
  constructor(private readonly repo = new BookRepository()) {}

  async list(filters: BookFilters): Promise<BookDto[]> {
    const rows = await this.repo.search(filters);
    return rows.map((r) => this.toDto(r));
  }

  async getById(id: number): Promise<BookDto | null> {
    const row = await this.repo.findById(id);
    return row ? this.toDto(row) : null;
  }

  async create(input: BookInput): Promise<BookDto | null> {
    const id = await this.repo.create(input);
    return this.getById(id);
  }

  async update(id: number, input: Partial<BookInput>): Promise<BookDto | null> {
    await this.repo.update(id, input);
    return this.getById(id);
  }

  async remove(id: number): Promise<void> {
    await this.repo.softDelete(id);
  }

  async setStock(id: number, stock: number, idUsuario: number | null, motivo: string | null): Promise<BookDto | null> {
    await this.repo.setStock(id, stock, idUsuario, motivo);
    return this.getById(id);
  }

  private toDto(r: BookDbRow): BookDto {
    return {
      id: r.id_libro,
      title: r.nombre,
      author: r.autor ?? 'Anónimo',
      isbn: r.isbn,
      price: Number(r.precio_base),
      stock: r.stock,
      genre: r.categoria,
      format: r.formato,
      synopsis: r.sinopsis ?? '',
      coverImage: r.imagen_url ?? '',
      year: r.anio_edicion,
      edition: r.edicion,
      pages: r.paginas,
      language: r.idioma,
      publisher: r.editorial,
    };
  }
}

export interface BookDto {
  id: number;
  title: string;
  author: string;
  isbn: string;
  price: number;
  stock: number;
  genre: string;
  format: string;
  synopsis: string;
  coverImage: string | null;
  year: number | null;
  edition: string | null;
  pages: number | null;
  language: string | null;
  publisher: string;
}

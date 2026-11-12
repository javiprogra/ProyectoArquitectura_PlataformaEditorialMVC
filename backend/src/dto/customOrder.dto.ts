export interface CustomOrderDto {
  id: number;
  userId: number;
  clientName: string;
  clientEmail: string;
  bookId: number | null;
  bookTitle: string;
  quantity: number;
  coverFinish: string;
  paperType: string;
  requiredDate: string;
  notes: string;
  status: string;
  createdAt: string;
}

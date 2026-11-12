export interface QuoteDto {
  id: number;
  requestId: number;
  advisorId: number | null;
  advisorName: string;
  clientName: string;
  bookTitle: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  volumeDiscountPercentage: number;
  volumeDiscountAmount: number;
  clientDiscountPercentage: number;
  clientDiscountAmount: number;
  tax: number;
  total: number;
  validUntil: string | null;
  notes: string;
  status: string;
  createdAt: string;
}

export interface OrderCalculationDto {
  subtotalBase: number;
  totalUnits: number;
  volumeDiscountPercentage: number;
  volumeDiscountAmount: number;
  clientDiscountPercentage: number;
  clientDiscountAmount: number;
  taxes: number;
  totalFinal: number;
  appliedRulesDetail: string;
}

export interface OrderLineDto {
  bookId: number;
  title: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface OrderDto {
  id: number;
  userId: number;
  userName: string;
  items: OrderLineDto[];
  subtotalBase: number;
  volumeDiscountPercentage: number;
  volumeDiscountAmount: number;
  clientDiscountPercentage: number;
  clientDiscountAmount: number;
  taxes: number;
  totalFinal: number;
  status: string;
  createdAt: string;
}

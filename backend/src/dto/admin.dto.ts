export interface AdminMetricsDto {
  totalTitles: number;
  totalStock: number;
  inventoryValue: number;
  lowStockAlerts: number;
  totalOrders: number;
  totalRequests: number;
  totalQuotes: number;
}

export interface UserDto {
  id: number;
  name: string;
  email: string;
  role: string;
  estado: boolean;
  idCliente: number | null;
}

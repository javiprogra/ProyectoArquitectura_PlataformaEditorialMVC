// Mapeo de estados: código EN (API/frontend) ↔ nombre ES (base de datos).

export const ORDER_STATUS_ES_TO_EN: Record<string, string> = {
  'En Proceso': 'registrada',
  Despachado: 'enviada',
  Entregado: 'entregada',
  Anulada: 'anulada',
};

export const ORDER_STATUS_EN_TO_ES: Record<string, string> = {
  registrada: 'En Proceso',
  pagada: 'En Proceso',
  en_preparacion: 'En Proceso',
  enviada: 'Despachado',
  entregada: 'Entregado',
  anulada: 'Anulada',
};

export const SOLICITUD_STATUS_ES_TO_EN: Record<string, string> = {
  Pendiente: 'pendiente',
  'En Revisión': 'en_revision',
  Cotizada: 'cotizada',
  Aprobada: 'aprobada',
  Rechazada: 'rechazada',
  Anulada: 'rechazada',
};

export const SOLICITUD_STATUS_EN_TO_ES: Record<string, string> = {
  pendiente: 'Pendiente',
  en_revision: 'En Revisión',
  cotizada: 'Cotizada',
  aprobada: 'Aprobada',
  rechazada: 'Rechazada',
};

export const COTIZACION_STATUS_ES_TO_EN: Record<string, string> = {
  'Pendiente Aceptación': 'emitida',
  Aceptada: 'aprobada',
  Rechazada: 'rechazada',
  Procesada: 'aprobada',
  Anulada: 'rechazada',
};

export const COTIZACION_STATUS_EN_TO_ES: Record<string, string> = {
  emitida: 'Pendiente Aceptación',
  aprobada: 'Aceptada',
  rechazada: 'Rechazada',
};

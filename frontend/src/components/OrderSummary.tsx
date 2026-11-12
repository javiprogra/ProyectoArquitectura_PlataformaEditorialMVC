import type { OrderCalculation } from '../services/mockService';
import { formatQ } from '../utils/format';

interface OrderSummaryProps {
  summary: OrderCalculation | null;
  calculating?: boolean;
}

interface SummaryRowProps {
  label: string;
  detail?: string;
  value: string;
  valueClassName?: string;
}

function SummaryRow({ label, detail, value, valueClassName = 'text-editorial-dark' }: SummaryRowProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="font-medium text-editorial-dark">{label}</p>
        {detail && <p className="text-xs text-gray-500">{detail}</p>}
      </div>
      <span className={`font-semibold whitespace-nowrap ${valueClassName}`}>{value}</span>
    </div>
  );
}

export function OrderSummary({ summary, calculating = false }: OrderSummaryProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-editorial-primary">Resumen de la orden</h2>
        <span className="text-[10px] uppercase tracking-wider text-editorial-secondary font-semibold">
          Motor de descuentos
        </span>
      </div>

      {calculating || !summary ? (
        <div className="py-10 text-center text-sm text-gray-500">
          Calculando descuentos e impuestos...
        </div>
      ) : (
        <div className="space-y-4 text-sm">
          <SummaryRow
            label="Subtotal base"
            detail={`${summary.totalUnits} unidad(es) seleccionada(s)`}
            value={formatQ(summary.subtotalBase)}
          />
          <SummaryRow
            label={`Descuento por volumen (${summary.volumeDiscountPercentage}%)`}
            detail="1-5: 0% · 6-20: 5% · 21-50: 10% · más de 50: 15%"
            value={`- ${formatQ(summary.volumeDiscountAmount)}`}
            valueClassName="text-emerald-700"
          />
          <SummaryRow
            label={`Descuento de cliente (${summary.clientDiscountPercentage}%)`}
            detail={
              summary.clientDiscountPercentage > 0
                ? 'Institucional acumulativo'
                : 'Cliente minorista / visitante'
            }
            value={`- ${formatQ(summary.clientDiscountAmount)}`}
            valueClassName="text-emerald-700"
          />

          <div className="border-t border-dashed border-gray-200" />

          <SummaryRow
            label="Impuestos (IVA 12%)"
            detail="Calculado sobre el subtotal con descuentos"
            value={formatQ(summary.taxes)}
          />

          <div className="border-t border-gray-200 pt-4 flex items-center justify-between">
            <span className="text-base font-bold text-editorial-primary">Total final</span>
            <span className="text-2xl font-extrabold text-editorial-secondary">
              {formatQ(summary.totalFinal)}
            </span>
          </div>

          <p className="rounded-lg bg-editorial-beige/60 p-3 text-xs leading-relaxed text-editorial-primary">
            {summary.appliedRulesDetail}
          </p>
        </div>
      )}
    </div>
  );
}

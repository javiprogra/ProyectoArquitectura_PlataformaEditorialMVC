import { formatQ } from '../utils/format';

export interface CardDetails {
  cardNumber: string;
  cardHolder: string;
  expiry: string;
  cvv: string;
}

export type CardBrand = 'visa' | 'mastercard' | 'unknown';

interface CardPaymentGatewayProps {
  details: CardDetails;
  onChange: (details: CardDetails) => void;
  amount: number;
}

export const detectCardBrand = (value: string): CardBrand => {
  const digits = value.replace(/\D/g, '');
  if (/^4/.test(digits)) return 'visa';
  if (/^(5[1-5]|2(2[2-9]|[3-6]\d|7[01]|720))/.test(digits)) return 'mastercard';
  return 'unknown';
};

const passesLuhn = (digits: string): boolean => {
  let sum = 0;
  let shouldDouble = false;

  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let digit = Number(digits[index]);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
};

export const formatCardNumber = (value: string): string =>
  value
    .replace(/\D/g, '')
    .slice(0, 16)
    .replace(/(\d{4})(?=\d)/g, '$1 ');

export const formatExpiry = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
};

export const formatCvv = (value: string): string => value.replace(/\D/g, '').slice(0, 4);

export const isCardNumberValid = (value: string): boolean => {
  const digits = value.replace(/\D/g, '');
  const brand = detectCardBrand(digits);
  return digits.length === 16 && brand !== 'unknown' && passesLuhn(digits);
};

export const isExpiryValid = (value: string): boolean => {
  const match = value.match(/^(\d{2})\/(\d{2})$/);
  if (!match) return false;

  const month = Number(match[1]);
  const year = 2000 + Number(match[2]);
  if (month < 1 || month > 12) return false;

  const now = new Date();
  const expiryDate = new Date(year, month, 0, 23, 59, 59);
  return expiryDate >= now;
};

export const isCvvValid = (value: string): boolean => /^\d{3,4}$/.test(value);

export const isCardHolderValid = (value: string): boolean =>
  /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s.'-]{3,}$/.test(value.trim());

export const isCardDetailsValid = (details: CardDetails): boolean =>
  isCardNumberValid(details.cardNumber) &&
  isCardHolderValid(details.cardHolder) &&
  isExpiryValid(details.expiry) &&
  isCvvValid(details.cvv);

const brandLabel: Record<CardBrand, string> = {
  visa: 'VISA',
  mastercard: 'MASTERCARD',
  unknown: 'TARJETA',
};

export function CardPaymentGateway({ details, onChange, amount }: CardPaymentGatewayProps) {
  const brand = detectCardBrand(details.cardNumber);
  const numberError =
    details.cardNumber.length > 0 && !isCardNumberValid(details.cardNumber);
  const holderError =
    details.cardHolder.length > 0 && !isCardHolderValid(details.cardHolder);
  const expiryError = details.expiry.length > 0 && !isExpiryValid(details.expiry);
  const cvvError = details.cvv.length > 0 && !isCvvValid(details.cvv);

  const update = (field: keyof CardDetails, value: string) => {
    onChange({ ...details, [field]: value });
  };

  return (
    <div className="rounded-xl border border-editorial-primary/20 bg-editorial-beige/30 p-4 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-editorial-primary">Pasarela de pago seguro</p>
          <p className="text-xs text-gray-600">
            Validación en tiempo real · Visa y Mastercard · Cargo de {formatQ(amount)}
          </p>
        </div>
        <span className="self-start rounded-full bg-editorial-primary text-white px-3 py-1 text-[10px] font-bold tracking-wider">
          {brandLabel[brand]}
        </span>
      </div>

      <div className="rounded-xl bg-gradient-to-br from-editorial-primary to-editorial-secondary text-white p-5 shadow-inner">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-gray-200">
          <span>LUMINA Pay</span>
          <span>{brandLabel[brand]}</span>
        </div>
        <p className="mt-6 font-mono text-lg tracking-[0.18em]">
          {details.cardNumber || '•••• •••• •••• ••••'}
        </p>
        <div className="mt-4 flex items-end justify-between gap-4 text-xs uppercase tracking-wider">
          <span className="truncate">{details.cardHolder || 'Nombre del titular'}</span>
          <span className="whitespace-nowrap">{details.expiry || 'MM/AA'}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Número de tarjeta *
          </label>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="cc-number"
            value={details.cardNumber}
            onChange={(event) => update('cardNumber', formatCardNumber(event.target.value))}
            placeholder="4111 1111 1111 1111"
            className={`w-full p-2.5 border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 ${
              numberError
                ? 'border-red-300 focus:ring-red-400'
                : 'border-gray-300 focus:ring-editorial-primary'
            }`}
          />
          {numberError ? (
            <p className="text-[11px] text-red-600 mt-1">
              Ingresa 16 dígitos válidos de Visa o Mastercard.
            </p>
          ) : (
            <p className="text-[11px] text-gray-500 mt-1">
              Detección automática de marca por prefijo (Visa 4 / Mastercard 51-55, 2221-2720).
            </p>
          )}
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Nombre del titular *
          </label>
          <input
            type="text"
            autoComplete="cc-name"
            value={details.cardHolder}
            onChange={(event) => update('cardHolder', event.target.value)}
            placeholder="Como aparece en la tarjeta"
            className={`w-full p-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 ${
              holderError
                ? 'border-red-300 focus:ring-red-400'
                : 'border-gray-300 focus:ring-editorial-primary'
            }`}
          />
          {holderError && (
            <p className="text-[11px] text-red-600 mt-1">Ingresa el nombre completo del titular.</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Fecha de vencimiento *
          </label>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="cc-exp"
            value={details.expiry}
            onChange={(event) => update('expiry', formatExpiry(event.target.value))}
            placeholder="MM/AA"
            className={`w-full p-2.5 border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 ${
              expiryError
                ? 'border-red-300 focus:ring-red-400'
                : 'border-gray-300 focus:ring-editorial-primary'
            }`}
          />
          {expiryError && (
            <p className="text-[11px] text-red-600 mt-1">Usa el formato MM/AA y una fecha vigente.</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">CVV *</label>
          <input
            type="password"
            inputMode="numeric"
            autoComplete="cc-csc"
            value={details.cvv}
            onChange={(event) => update('cvv', formatCvv(event.target.value))}
            placeholder="123"
            className={`w-full p-2.5 border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 ${
              cvvError
                ? 'border-red-300 focus:ring-red-400'
                : 'border-gray-300 focus:ring-editorial-primary'
            }`}
          />
          {cvvError ? (
            <p className="text-[11px] text-red-600 mt-1">El CVV debe tener 3 o 4 dígitos.</p>
          ) : (
            <p className="text-[11px] text-gray-500 mt-1">3 dígitos al reverso de la tarjeta.</p>
          )}
        </div>
      </div>
    </div>
  );
}

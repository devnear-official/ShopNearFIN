/**
 * Currency and Bangladeshi number formatting utilities
 * Bangladeshi format: grouped in 3 digits for hundreds, then 2 digits (lakh, crore)
 * Example: 1234567.89 -> ৳ 12,34,567.89
 */

/**
 * Convert BDT (Taka) to integer paisa (1 Taka = 100 Paisa)
 */
export function toPaisa(amountInTaka: number): number {
  return Math.round(Number(amountInTaka) * 100);
}

/**
 * Convert integer paisa to BDT (Taka) float
 */
export function toTaka(amountInPaisa: number): number {
  return Number(amountInPaisa) / 100;
}

/**
 * Format a number using Bangladeshi numbering system (lakh/crore)
 * E.g., 1234567.5 -> 12,34,567.50
 */
export function formatBanglaNumber(value: number, showDecimals: boolean = true): string {
  const isNegative = value < 0;
  const absValue = Math.abs(value);
  
  const fixed = absValue.toFixed(2);
  const [integerPart, decimalPart] = fixed.split(".");

  let result = "";
  const len = integerPart.length;

  if (len <= 3) {
    result = integerPart;
  } else {
    // Last 3 digits
    const lastThree = integerPart.substring(len - 3);
    const otherDigits = integerPart.substring(0, len - 3);
    
    // Group remainder in pairs of 2 from right to left
    const paired = otherDigits.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
    result = `${paired},${lastThree}`;
  }

  const formatted = showDecimals && decimalPart ? `${result}.${decimalPart}` : result;
  return isNegative ? `-${formatted}` : formatted;
}

/**
 * Format BDT currency with ৳ symbol
 * Accepts either taka directly or paisa
 */
export function formatBDT(
  amount: number,
  options: { isPaisa?: boolean; showDecimals?: boolean; symbol?: string } = {}
): string {
  const { isPaisa = false, showDecimals = true, symbol = "৳ " } = options;
  const taka = isPaisa ? toTaka(amount) : amount;
  return `${symbol}${formatBanglaNumber(taka, showDecimals)}`;
}

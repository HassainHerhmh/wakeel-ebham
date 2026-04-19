export function formatYemeniCurrency(value: number, fractionDigits = 2) {
  return `${value.toFixed(fractionDigits)} ريال يمني`;
}
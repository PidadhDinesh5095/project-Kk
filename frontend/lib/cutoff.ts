export function isBeforeCutoff(date = new Date()): boolean {
  return date.getHours() < 22;
}

export function nextDeliveryDate(date = new Date()): string {
  const next = new Date(date);
  if (!isBeforeCutoff(date)) next.setDate(next.getDate() + 1);
  next.setDate(next.getDate() + 1);
  return next.toISOString().slice(0, 10);
}

export function firstAvailablePauseDate(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  const indiaDate = new Date(Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day) + (Number(values.hour) >= 22 ? 2 : 1),
  ));
  return indiaDate.toISOString().slice(0, 10);
}

export function isTomorrowPauseAvailable(date = new Date()): boolean {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  const tomorrow = new Date(Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day) + 1,
  )).toISOString().slice(0, 10);
  return firstAvailablePauseDate(date) === tomorrow;
}

export function canPauseDeliveryDate(value: string, date = new Date()): boolean {
  return value >= firstAvailablePauseDate(date);
}

export function formatDate(value: string): string {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  const date = new Date(year, month - 1, day, 12);
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function isBeforeCutoff(date = new Date()): boolean {
  return date.getHours() < 22;
}

export function nextDeliveryDate(date = new Date()): string {
  const next = new Date(date);
  if (!isBeforeCutoff(date)) next.setDate(next.getDate() + 1);
  next.setDate(next.getDate() + 1);
  return next.toISOString().slice(0, 10);
}

export function formatDate(value: string): string {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  const date = new Date(year, month - 1, day, 12);
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

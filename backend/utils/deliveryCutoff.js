function firstAvailablePauseDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return new Date(Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day) + (Number(values.hour) >= 22 ? 2 : 1),
  )).toISOString().slice(0, 10);
}

function canPauseDeliveryDate(value, now = new Date()) {
  return value >= firstAvailablePauseDate(now);
}

export default { firstAvailablePauseDate, canPauseDeliveryDate };
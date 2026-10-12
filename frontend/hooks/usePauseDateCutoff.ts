import { useEffect, useState } from 'react';
import { firstAvailablePauseDate, isTomorrowPauseAvailable } from '@/lib/cutoff';

export function usePauseDateCutoff() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

  const firstAvailableDate = firstAvailablePauseDate(now);
  const tomorrowIsAvailable = isTomorrowPauseAvailable(now);
  return { firstAvailableDate, tomorrowIsAvailable };
}
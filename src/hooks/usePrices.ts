import { useState, useEffect } from 'react';
import { getPrices, type ServicePrice } from '../lib/api';

export function usePrices(countryId: number) {
  const [prices, setPrices] = useState<Record<string, ServicePrice>>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);
    getPrices(countryId)
      .then(setPrices)
      .catch(err => console.error('Failed to fetch prices:', err))
      .finally(() => setIsLoading(false));
  }, [countryId]);

  return { prices, isLoading };
}

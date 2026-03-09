import { useState, useEffect } from 'react';
import { getPricesByService, type ServicePrice } from '../lib/api';

export function usePricesByService(serviceId: string) {
  const [prices, setPrices] = useState<Record<string, ServicePrice>>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);
    getPricesByService(serviceId)
      .then(setPrices)
      .catch(err => console.error('Failed to fetch prices by service:', err))
      .finally(() => setIsLoading(false));
  }, [serviceId]);

  return { prices, isLoading };
}

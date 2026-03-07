import { useState, useEffect, useCallback } from 'react';
import { getBalance } from '../lib/api';

export function useBalance() {
  const [balance, setBalance] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const bal = await getBalance();
      setBalance(bal);
    } catch (err) {
      console.error('Failed to refresh balance:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    getBalance().then(setBalance).catch(err => console.error('Failed to fetch balance:', err));
    const interval = setInterval(() => {
      getBalance().then(setBalance).catch(err => console.error('Failed to refresh balance:', err));
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  return { balance, isRefreshing, refresh };
}

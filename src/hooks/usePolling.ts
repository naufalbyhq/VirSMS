import { useEffect, useRef } from 'react';
import { getStatus } from '../lib/api';
import type { HistoryItem } from '../components/HistoryTable';

interface ActiveNumber {
  activationId: string;
  number: string;
  service: string;
  country: string;
  status: string;
  smsCode: string | null;
}

interface UsePollingProps {
  activeNumbers: ActiveNumber[];
  onReceived: (activationId: string, code: string, newItem: HistoryItem) => void;
  onCancelled: (activationId: string) => void;
  onError: (message: string) => void;
}

export function usePolling({ activeNumbers, onReceived, onCancelled, onError }: UsePollingProps) {
  const prevSmsCodes = useRef<Record<string, string | null>>({});

  useEffect(() => {
    const waitingNumbers = activeNumbers.filter(n => n.status === 'waiting');
    if (waitingNumbers.length === 0) return;

    const pollTimer = setInterval(async () => {
      for (const activeNumber of waitingNumbers) {
        try {
          const status = await getStatus(activeNumber.activationId);
          if (status.type === 'OK') {
            const newItem: HistoryItem = {
              id: activeNumber.activationId + String(Date.now()),
              service: activeNumber.service,
              country: activeNumber.country,
              number: activeNumber.number,
              date: new Date().toLocaleString(),
              status: 'Completed',
              code: status.code,
            };
            
            if (prevSmsCodes.current[activeNumber.activationId] !== status.code) {
              prevSmsCodes.current[activeNumber.activationId] = status.code;
              onReceived(activeNumber.activationId, status.code, newItem);
            }
          } else if (status.type === 'CANCEL') {
            onCancelled(activeNumber.activationId);
            onError('Number was cancelled.');
          }
        } catch (err) {
          console.error('Polling error:', err);
        }
      }
    }, 5000);
    return () => clearInterval(pollTimer);
  }, [activeNumbers, onReceived, onCancelled, onError]);
}

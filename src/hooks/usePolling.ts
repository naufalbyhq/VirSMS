import { useEffect, useRef, useCallback } from 'react';
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
  // Keep the latest props in a ref so the interval closure never goes stale
  const stateRef = useRef({ activeNumbers, onReceived, onCancelled, onError });
  useEffect(() => {
    stateRef.current = { activeNumbers, onReceived, onCancelled, onError };
  });

  // Track which activations are already in-flight to prevent overlapping requests
  const inFlight = useRef<Set<string>>(new Set());

  const poll = useCallback(async () => {
    const { activeNumbers: nums, onReceived: recv, onCancelled: cancel, onError: err } = stateRef.current;
    const waiting = nums.filter(n => n.status === 'waiting');
    if (waiting.length === 0) return;

    await Promise.all(
      waiting.map(async (n) => {
        if (inFlight.current.has(n.activationId)) return; // skip overlapping poll
        inFlight.current.add(n.activationId);
        try {
          // retries=1: single attempt per tick. Built-in retries with backoff multiply 429s.
          const status = await getStatus(n.activationId, 1);
          if (status.type === 'OK') {
            const newItem: HistoryItem = {
              id: n.activationId + String(Date.now()),
              service: n.service,
              country: n.country,
              number: n.number,
              date: new Date().toLocaleString(),
              status: 'Completed',
              code: status.code,
            };
            recv(n.activationId, status.code, newItem);
          } else if (status.type === 'CANCEL') {
            cancel(n.activationId);
            err('Number was cancelled by the provider.');
          }
        } catch (e) {
          // Swallow transient errors — next tick retries naturally
          console.error('[poll] getStatus failed:', e);
        } finally {
          inFlight.current.delete(n.activationId);
        }
      })
    );
  }, []); // stable — reads live state via ref

  // Compute a stable string key from the set of waiting IDs.
  // The interval only re-creates when the actual waiting sessions change,
  // not on every render caused by unrelated state updates.
  const waitingKey = activeNumbers
    .filter(n => n.status === 'waiting')
    .map(n => n.activationId)
    .join(',');

  useEffect(() => {
    if (!waitingKey) return;
    const timer = setInterval(poll, 5000);
    return () => clearInterval(timer);
  }, [waitingKey, poll]);
}
